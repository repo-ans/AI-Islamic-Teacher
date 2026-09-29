import { useCallback, useEffect, useRef, useState } from 'react'
import { speechLang } from './levels'

// Minimal typing for the (still prefixed) Web Speech API.
interface RecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

const Ctor: (new () => RecognitionLike) | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>).SpeechRecognition as new () => RecognitionLike) ??
      ((window as unknown as Record<string, unknown>).webkitSpeechRecognition as new () => RecognitionLike)
    : undefined

export const speechInputSupported = !!Ctor

/** Push-to-talk voice input: returns the transcript through `onText`. */
export function useSpeechInput(lang: string, onText: (text: string, final: boolean) => void) {
  const [listening, setListening] = useState(false)
  const rec = useRef<RecognitionLike | null>(null)
  const cb = useRef(onText)
  cb.current = onText

  const stop = useCallback(() => {
    rec.current?.stop()
  }, [])

  const start = useCallback(() => {
    if (!Ctor) return
    rec.current?.stop()
    const r = new Ctor()
    r.lang = speechLang(lang)
    r.interimResults = true
    r.continuous = false
    r.onresult = (e) => {
      const results = Array.from(e.results)
      const text = results.map((x) => x[0].transcript).join(' ')
      cb.current(text, results.every((x) => x.isFinal))
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    rec.current = r
    setListening(true)
    r.start()
  }, [lang])

  useEffect(() => () => rec.current?.stop(), [])

  return { listening, start, stop, supported: speechInputSupported }
}
