import { X } from 'lucide-react'
import { Modal } from './Modal'

const STEPS = [
  ['Greeting', 'Your teacher greets you with salam and asks if you are ready for class.'],
  ['Review', 'If you missed a quiz question yesterday, the teacher re-explains it in about 30 seconds.'],
  ['Lesson', 'Recorded lesson segments play one by one. Tap “Raise hand” to stop and ask anything.'],
  ['Check-ins', 'Between segments the teacher checks that you can hear and understand.'],
  ['Quiz', 'A short quiz, asked one question at a time. Answers are evaluated together at the end.'],
  ['Q&A', 'Ask follow-up questions. Answers show the Quran, Hadith or books they come from.'],
  ['Tomorrow', 'The next lesson unlocks the following day, so learning becomes a daily habit.'],
]

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">How a class works</h2>
          <p className="text-sm text-muted">Every lesson follows the same gentle rhythm.</p>
        </div>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
          <X className="size-5" />
        </button>
      </div>
      <ol className="mt-5 space-y-3">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-lime text-xs font-semibold">{i + 1}</span>
            <div>
              <p className="text-sm font-medium">{t}</p>
              <p className="text-sm text-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 rounded-xl bg-soft p-3 text-xs text-muted">
        The AI teacher is a learning aid. For personal religious rulings (fatwa), please consult a qualified scholar.
      </p>
    </Modal>
  )
}
