import { useCallback, useEffect, useRef, useState } from 'react'
import { SUPABASE_ANON_KEY, SUPABASE_URL, TTS_ENABLED } from './env'
import { speechLang } from './levels'
import { supabase } from './supabase'

export type NarratorState = 'idle' | 'loading' | 'playing' | 'paused'

export interface PlayItem {
  key: string
  text: string
  /** Pre-recorded narration; takes priority over generated speech. */
  audioUrl?: string | null
  /** Language code of the text (e.g. 'en'). */
  lang?: string
}

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
export const speechSupported = !!synth

const ttsCache = new Map<string, string>()

async function fetchTts(item: PlayItem): Promise<string | null> {
  if (!TTS_ENABLED || !supabase) return null
  const cached = ttsCache.get(item.key)
  if (cached) return cached
  try {
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${data.session?.access_token ?? SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ text: item.text, lang: item.lang ?? 'en' }),
    })
    if (!res.ok) throw new Error(`TTS ${res.status}`)
    const url = URL.createObjectURL(await res.blob())
    ttsCache.set(item.key, url)
    return url
  } catch (e) {
    console.warn('[tts] falling back to browser voice', e)
    return null
  }
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!synth) return undefined
  const code = speechLang(lang).toLowerCase()
  const base = code.split('-')[0]
  const voices = synth.getVoices()
  const matches = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(base))
  return (
    matches.find((v) => /natural|neural|google|premium|enhanced/i.test(v.name) && v.lang.toLowerCase().startsWith(code)) ??
    matches.find((v) => v.lang.toLowerCase().startsWith(code)) ??
    matches.find((v) => /natural|neural|google/i.test(v.name)) ??
    matches[0]
  )
}

/** Splits text into sentence-sized chunks — Chrome stops long utterances after ~15 s. */
function chunk(text: string, max = 220): string[] {
  const out: string[] = []
  let cur = ''
  for (const s of text.split(/(?<=[.!?।])\s+/)) {
    if ((cur + ' ' + s).trim().length > max && cur) {
      out.push(cur.trim())
      cur = s
    } else cur = `${cur} ${s}`
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

export function useNarrator() {
  const [state, setState] = useState<NarratorState>('idle')
  const [rate, setRateState] = useState(1)
  const [currentKey, setCurrentKey] = useState<string | null>(null)

  const rateRef = useRef(1)
  const token = useRef(0)
  const audio = useRef<HTMLAudioElement | null>(null)
  const speech = useRef<{ chunks: string[]; index: number; lang: string } | null>(null)
  const paused = useRef(false)
  const onEnd = useRef<(() => void) | null>(null)
  // Some engines (e.g. no installed voices) never fire onend — advance anyway.
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearWatchdog = () => {
    if (watchdog.current) clearTimeout(watchdog.current)
    watchdog.current = null
  }

  useEffect(() => {
    // Some browsers load voices asynchronously.
    synth?.getVoices()
    const handler = () => synth?.getVoices()
    synth?.addEventListener?.('voiceschanged', handler)
    return () => synth?.removeEventListener?.('voiceschanged', handler)
  }, [])

  const finish = useCallback((my: number) => {
    if (my !== token.current) return
    setState('idle')
    setCurrentKey(null)
    const cb = onEnd.current
    onEnd.current = null
    cb?.()
  }, [])

  const speakNext = useCallback(
    (my: number) => {
      const s = speech.current
      if (!synth || !s || my !== token.current || paused.current) return
      if (s.index >= s.chunks.length) return finish(my)
      const u = new SpeechSynthesisUtterance(s.chunks[s.index])
      u.lang = speechLang(s.lang)
      const voice = pickVoice(s.lang)
      if (voice) u.voice = voice
      u.rate = rateRef.current
      const index = s.index
      const advance = () => {
        clearWatchdog()
        if (my !== token.current || paused.current || s.index !== index) return
        s.index++
        speakNext(my)
      }
      u.onend = advance
      u.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return
        advance()
      }
      clearWatchdog()
      watchdog.current = setTimeout(advance, (4000 + s.chunks[index].length * 110) / rateRef.current)
      synth.speak(u)
    },
    [finish],
  )

  const stop = useCallback(() => {
    clearWatchdog()
    token.current++
    paused.current = false
    onEnd.current = null
    if (audio.current) {
      audio.current.onended = null
      audio.current.pause()
      audio.current = null
    }
    speech.current = null
    synth?.cancel()
    setState('idle')
    setCurrentKey(null)
  }, [])

  const speakText = useCallback(
    (text: string, lang: string, my: number) => {
      if (!synth) {
        // No speech engine at all: give readers time, then move on.
        setTimeout(() => finish(my), Math.min(20000, 1500 + text.length * 45))
        return
      }
      speech.current = { chunks: chunk(text), index: 0, lang }
      setState('playing')
      speakNext(my)
    },
    [finish, speakNext],
  )

  /** Plays a narration item; `done` fires when it finishes naturally. */
  const play = useCallback(
    async (item: PlayItem, done?: () => void) => {
      stop()
      const my = token.current
      onEnd.current = done ?? null
      setCurrentKey(item.key)
      setState('loading')

      const src = item.audioUrl || (await fetchTts(item))
      if (my !== token.current) return

      if (src) {
        const el = new Audio(src)
        el.playbackRate = rateRef.current
        el.onended = () => finish(my)
        audio.current = el
        try {
          await el.play()
          if (my === token.current) setState('playing')
          return
        } catch (e) {
          console.warn('[narrator] audio playback failed, using browser voice', e)
          audio.current = null
        }
      }
      speakText(item.text, item.lang ?? 'en', my)
    },
    [finish, speakText, stop],
  )

  const pause = useCallback(() => {
    if (audio.current) audio.current.pause()
    else if (speech.current) {
      paused.current = true
      clearWatchdog()
      synth?.cancel() // cancel + replay current chunk is more reliable than synth.pause()
    } else return
    setState('paused')
  }, [])

  const resume = useCallback(() => {
    const my = token.current
    if (audio.current) {
      void audio.current.play()
      setState('playing')
    } else if (speech.current) {
      paused.current = false
      setState('playing')
      speakNext(my)
    }
  }, [speakNext])

  const setRate = useCallback((r: number) => {
    rateRef.current = r
    setRateState(r)
    if (audio.current) audio.current.playbackRate = r
  }, [])

  /**
   * Short teacher line through the browser voice; never interrupts a playing
   * segment. Resolves when the line has been spoken (or skipped).
   */
  const speakLine = useCallback((text: string, lang: string): Promise<void> => {
    if (!synth || (audio.current && !audio.current.paused) || (speech.current && !paused.current)) return Promise.resolve()
    synth.cancel()
    return new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}]/gu, ''))
      u.lang = speechLang(lang)
      const voice = pickVoice(lang)
      if (voice) u.voice = voice
      u.rate = rateRef.current
      // Safety net: some engines never fire onend.
      const timer = setTimeout(resolve, 2500 + text.length * 90)
      const done = () => {
        clearTimeout(timer)
        resolve()
      }
      u.onend = done
      u.onerror = done
      synth.speak(u)
    })
  }, [])

  const silenceLines = useCallback(() => {
    if (!speech.current || paused.current) synth?.cancel()
  }, [])

  useEffect(() => () => stop(), [stop])

  return { state, rate, setRate, currentKey, play, pause, resume, stop, speakLine, silenceLines }
}

export type Narrator = ReturnType<typeof useNarrator>
