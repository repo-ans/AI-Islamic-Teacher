import { Mic, Square, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { SpeechInput } from '../lib/speech-input'
import { cn } from '../lib/utils'

const BAR_COUNT = 18

/**
 * Bars that rise and fall with the student's voice (live microphone level).
 * Without a level meter they fall back to a gentle CSS wave.
 */
export function VoiceBars({ analyser, className }: { analyser: AnalyserNode | null; className?: string }) {
  const bars = useRef<Array<HTMLSpanElement | null>>([])

  useEffect(() => {
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    // Bin width is sampleRate / fftSize (~190 Hz); the speaking voice sits in roughly bins 1–20.
    const half = BAR_COUNT / 2
    const binFor = (i: number) => 1 + Math.round(Math.abs(i - half + 0.5) * 2)
    let raf = 0
    const draw = () => {
      analyser.getByteFrequencyData(data)
      for (let i = 0; i < BAR_COUNT; i++) {
        // Mirrored, so the loudest (lowest) voice frequencies peak in the middle.
        const b = binFor(i)
        const v = (data[b] + data[b + 1]) / 2 / 255
        const el = bars.current[i]
        if (el) el.style.transform = `scaleY(${Math.max(0.12, Math.min(1, v * 1.6))})`
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [analyser])

  return (
    <span className={cn('flex h-8 items-center gap-0.75', className)} aria-hidden>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            bars.current[i] = el
          }}
          className={cn('h-full w-1 rounded-full bg-lime transition-transform duration-75', !analyser && 'wave-bar')}
          style={analyser ? { transform: 'scaleY(0.12)' } : { animationDelay: `${(i % 6) * 0.11}s` }}
        />
      ))}
    </span>
  )
}

/** Big tap-to-talk button: lime when idle, red stop button with pulsing rings while listening. */
export function MicButton({
  speech,
  disabled,
  onStart,
  className,
}: {
  speech: SpeechInput
  disabled?: boolean
  /** Runs just before listening starts (e.g. pause the teacher so the mic doesn't hear it). */
  onStart?: () => void
  className?: string
}) {
  if (!speech.supported) return null
  const on = speech.listening
  return (
    <button
      type="button"
      onClick={
        on
          ? speech.stop
          : () => {
              onStart?.()
              void speech.start()
            }
      }
      disabled={disabled && !on}
      aria-label={on ? 'Stop and send' : 'Tap to talk'}
      title={on ? 'Tap to stop and send' : 'Tap to talk'}
      className={cn(
        'relative grid size-14 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40',
        on
          ? 'bg-danger text-white shadow-lg shadow-danger/40'
          : 'bg-lime text-ink shadow-lg shadow-lime-strong/60 ring-4 ring-lime/40 hover:scale-110 hover:-rotate-6',
        className,
      )}
    >
      {on && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-danger/40" />
          <span className="absolute -inset-1.5 animate-pulse rounded-full border-2 border-danger/40" />
        </>
      )}
      {on ? <Square className="relative size-5 fill-current" /> : <Mic className="relative size-6" strokeWidth={2.4} />}
    </button>
  )
}

/** Shown in place of the text box while the mic is on: live bars + what the student has said so far. */
export function ListeningPanel({ speech, className }: { speech: SpeechInput; className?: string }) {
  return (
    <div className={cn('flex min-h-14 flex-1 animate-rise items-center gap-3 rounded-2xl bg-ink px-4 py-2 text-white', className)}>
      <VoiceBars analyser={speech.analyser} />
      <p className="line-clamp-2 min-w-0 flex-1 text-[15px]">
        {speech.text || <span className="text-white/60">Listening… speak now, then tap ■ to send</span>}
      </p>
      <button
        type="button"
        onClick={speech.cancel}
        className="grid size-8 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
        aria-label="Cancel"
        title="Cancel"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
