import { useCallback, useEffect, useRef, useState } from 'react'
import { speechLang } from './levels'

// Minimal typing for the (still prefixed) Web Speech API.
interface RecognitionResult {
  isFinal: boolean
  0: { transcript: string }
}
interface RecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

const Ctor: (new () => RecognitionLike) | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>).SpeechRecognition as new () => RecognitionLike) ??
      ((window as unknown as Record<string, unknown>).webkitSpeechRecognition as new () => RecognitionLike)
    : undefined

export const speechInputSupported = !!Ctor

/** Safety stop so a forgotten mic doesn't listen forever. */
const MAX_LISTEN_MS = 120_000

/**
 * Tap-to-talk voice input. The mic stays on through pauses until the student
 * taps stop; only then is the whole transcript handed to `onFinish`.
 * While listening, `text` holds the live transcript and `analyser` exposes the
 * microphone level for the voice-bars animation.
 */
export function useSpeechInput(lang: string, onFinish: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const finishCb = useRef(onFinish)
  finishCb.current = onFinish
  const wanted = useRef(false) // the student wants the mic on
  const finalText = useRef('')
  const interimText = useRef('')
  const rec = useRef<RecognitionLike | null>(null)
  const media = useRef<{ stream: MediaStream; ctx: AudioContext } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const releaseMedia = () => {
    media.current?.stream.getTracks().forEach((t) => t.stop())
    void media.current?.ctx.close().catch(() => {})
    media.current = null
    setAnalyser(null)
  }

  const finish = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    rec.current = null
    releaseMedia()
    setListening(false)
    const out = `${finalText.current} ${interimText.current}`.replace(/\s+/g, ' ').trim()
    finalText.current = ''
    interimText.current = ''
    setText('')
    if (out) finishCb.current(out)
  }, [])

  const startRecognition = useCallback(() => {
    if (!Ctor) return
    const r = new Ctor()
    r.lang = speechLang(lang)
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalText.current += `${res[0].transcript} `
        else interim += res[0].transcript
      }
      interimText.current = interim
      setText(`${finalText.current}${interim}`.trim())
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wanted.current = false
        setError('Microphone permission is blocked. Allow it in the browser to talk to your teacher.')
      }
      // 'no-speech' / 'network' etc. are handled by the restart in onend.
    }
    r.onend = () => {
      // Browsers end recognition after a pause — keep going until the student taps stop.
      if (wanted.current) {
        // Keep anything heard so far, then listen again.
        if (interimText.current) {
          finalText.current += `${interimText.current} `
          interimText.current = ''
        }
        try {
          startRecognition()
          return
        } catch {
          /* fall through to finish */
        }
      }
      finish()
    }
    rec.current = r
    r.start()
  }, [finish, lang])

  const start = useCallback(async () => {
    if (!Ctor || wanted.current) return
    setError('')
    finalText.current = ''
    interimText.current = ''
    setText('')
    wanted.current = true
    setListening(true)
    startRecognition()
    timer.current = setTimeout(() => {
      wanted.current = false
      rec.current?.stop()
    }, MAX_LISTEN_MS)

    // Live microphone level for the animation (optional — recognition works without it).
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      if (!wanted.current) return stream.getTracks().forEach((t) => t.stop())
      const ctx = new AudioContext()
      const node = ctx.createAnalyser()
      node.fftSize = 256
      node.smoothingTimeConstant = 0.7
      ctx.createMediaStreamSource(stream).connect(node)
      media.current = { stream, ctx }
      setAnalyser(node)
    } catch {
      /* no level meter — the bars fall back to a gentle idle animation */
    }
  }, [startRecognition])

  /** Stops listening and sends what was said. */
  const stop = useCallback(() => {
    wanted.current = false
    if (rec.current) rec.current.stop()
    else finish()
  }, [finish])

  /** Stops listening and throws the transcript away. */
  const cancel = useCallback(() => {
    wanted.current = false
    finalText.current = ''
    interimText.current = ''
    rec.current?.abort()
    if (!rec.current) finish()
  }, [finish])

  useEffect(
    () => () => {
      wanted.current = false
      rec.current?.abort()
      releaseMedia()
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return { listening, text, error, analyser, start, stop, cancel, supported: speechInputSupported }
}

export type SpeechInput = ReturnType<typeof useSpeechInput>
