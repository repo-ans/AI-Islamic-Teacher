import { Check, CircleCheck, CircleX, Headphones, LayoutGrid, MessageCircleQuestion, Pause, Play, RotateCcw, SkipForward, WifiOff } from 'lucide-react'
import { Link } from 'react-router'
import { ReferenceChips } from '../../components/References'
import { Button, buttonClasses, Pill } from '../../components/ui'
import type { NarratorState } from '../../lib/narrator'
import type { LessonContent, Reference } from '../../lib/types'
import { cn } from '../../lib/utils'
import type { Classroom, Msg } from './useClassroom'

export function TeacherAvatar({ className }: { className?: string }) {
  return (
    <span className={cn('grid size-8 shrink-0 place-items-center rounded-full bg-ink', className)}>
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path d="M15.4 4.2a8 8 0 1 0 4.2 12.7A6.4 6.4 0 1 1 15.4 4.2Z" fill="#dff77e" />
      </svg>
    </span>
  )
}

export function Waveform({ active, light }: { active: boolean; light?: boolean }) {
  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn('w-[3px] rounded-full', light ? 'bg-lime' : 'bg-brand', active ? 'wave-bar h-4' : 'h-1.5')}
          style={active ? { animationDelay: `${i * 0.12}s` } : undefined}
        />
      ))}
    </span>
  )
}

interface RenderProps {
  msg: Msg
  content: LessonContent
  room: Classroom
  narratorState: NarratorState
  voiceOn: boolean
  onRef: (r: Reference) => void
}

export function MessageView({ msg, content, room, narratorState, voiceOn, onRef }: RenderProps) {
  switch (msg.kind) {
    case 'teacher':
      return (
        <div className="flex animate-rise gap-3">
          <TeacherAvatar />
          <div className="max-w-[85%] min-w-0">
            {msg.note && <p className="mb-1 text-xs font-medium text-brand">{msg.note}</p>}
            <div className="rounded-2xl rounded-tl-md bg-soft px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</div>
            {msg.references && msg.references.length > 0 && (
              <div className="mt-2">
                <p className="mb-1.5 text-xs text-muted">Sources — tap to read</p>
                <ReferenceChips refs={msg.references} onOpen={onRef} />
              </div>
            )}
            {msg.offline && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-subtle">
                <WifiOff className="size-3" /> Offline teacher
              </p>
            )}
          </div>
        </div>
      )

    case 'student':
      return (
        <div className="flex animate-rise justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-ink px-4 py-2.5 text-[15px] text-white">{msg.text}</div>
        </div>
      )

    case 'segment': {
      const seg = content.segments[msg.index]
      const active = room.segIdx === msg.index && (room.phase === 'segment' || room.phase === 'paused' || room.phase === 'asking')
      const playing = active && narratorState === 'playing'
      const loading = active && narratorState === 'loading'
      return (
        <div
          className={cn(
            'animate-rise rounded-2xl border p-4 sm:p-5 transition-colors',
            active ? 'border-ink/15 bg-white shadow-lg shadow-ink/5' : 'border-dashed border-dash',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={cn('grid size-7 place-items-center rounded-lg', active ? 'bg-lime' : 'bg-soft text-muted')}>
                <Headphones className="size-3.5" />
              </span>
              <span className="text-xs font-medium text-muted">
                Recorded lesson · {msg.index + 1}/{content.segments.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {playing && <Waveform active />}
              <Pill tone={active ? 'lime' : 'neutral'} className="capitalize">
                {seg.kind}
              </Pill>
            </div>
          </div>
          <h3 className="mt-3 font-semibold">{seg.title}</h3>
          <p className={cn('mt-1.5 text-[15px] leading-relaxed', active ? 'text-ink' : 'text-muted')}>{seg.content}</p>

          {active && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-dash pt-4">
              {voiceOn ? (
                <>
                  <Button size="sm" onClick={room.segmentControls.toggle} loading={loading}>
                    {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                    {playing ? 'Pause' : loading ? 'Loading' : 'Play'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={room.segmentControls.replay}>
                    <RotateCcw className="size-3.5" /> Replay
                  </Button>
                  <Button size="sm" variant="ghost" onClick={room.segmentControls.skip} className="ml-auto">
                    Skip <SkipForward className="size-3.5" />
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={room.segmentControls.skip}>
                  I've read this — continue <SkipForward className="size-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      )
    }

    case 'quiz': {
      const q = content.questions[msg.index]
      const answer = room.answered[q.id]
      const current = room.phase === 'quiz' && room.qIdx === msg.index && answer === undefined
      const typeLabel = { mcq: 'Multiple choice', true_false: 'True or false', short_answer: 'Short answer', reflection: 'Reflection' }[q.type]
      return (
        <div className="flex animate-rise gap-3">
          <TeacherAvatar />
          <div className={cn('max-w-[85%] min-w-0 flex-1 rounded-2xl rounded-tl-md border p-4', current ? 'border-brand/30 bg-brand-soft/60' : 'border-dashed border-dash')}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-brand">
                Question {msg.index + 1} of {content.questions.length}
              </span>
              <Pill tone="brand">{typeLabel}</Pill>
            </div>
            <p className="mt-2 font-medium">{q.prompt}</p>
            {(q.type === 'mcq' || q.type === 'true_false') && (
              <div className={cn('mt-3 grid gap-2', q.type === 'true_false' ? 'grid-cols-2' : 'sm:grid-cols-2')}>
                {q.options.map((o, i) => (
                  <button
                    key={o}
                    disabled={!current}
                    onClick={() => room.answerOption(o)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 text-left text-sm transition',
                      answer === o ? 'border-ink bg-ink text-white' : 'border-line',
                      current && 'hover:border-ink',
                      !current && answer !== o && 'opacity-50',
                    )}
                  >
                    <span className={cn('grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold', answer === o ? 'bg-lime text-ink' : 'bg-soft text-muted')}>
                      {q.type === 'true_false' ? (o === 'True' ? 'T' : 'F') : String.fromCharCode(65 + i)}
                    </span>
                    {o}
                  </button>
                ))}
              </div>
            )}
            {(q.type === 'short_answer' || q.type === 'reflection') && current && (
              <p className="mt-2 text-xs text-muted">Type or say your answer below.</p>
            )}
          </div>
        </div>
      )
    }

    case 'result':
      return (
        <div className="animate-rise rounded-2xl bg-ink p-5 text-white">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">Quiz result</p>
              <p className="text-5xl font-semibold tracking-tight text-lime">
                {msg.score}
                <span className="text-2xl text-white/50">/{msg.total}</span>
              </p>
            </div>
            <p className="max-w-sm text-sm text-white/80">{msg.summary}</p>
          </div>
          <ul className="mt-5 space-y-2">
            {msg.graded.map((g) => (
              <li key={g.questionId} className="rounded-xl bg-white/5 p-3">
                <div className="flex gap-2.5">
                  {g.correct === null ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-lime" />
                  ) : g.correct ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-lime" />
                  ) : (
                    <CircleX className="mt-0.5 size-4 shrink-0 text-[#ff8b8b]" />
                  )}
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{g.prompt}</p>
                    <p className="mt-0.5 text-white/60">Your answer: {g.answer || '—'}</p>
                    <p className="mt-1 text-white/80">{g.feedback}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {msg.improvement_areas.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium tracking-wide text-white/50 uppercase">To improve</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {msg.improvement_areas.map((a) => (
                  <span key={a} className="rounded-full bg-white/10 px-2.5 py-1 text-xs">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
          {msg.recommendations.length > 0 && (
            <ul className="mt-3 list-inside list-disc text-sm text-white/70">
              {msg.recommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )

    case 'done':
      return (
        <div className="animate-rise rounded-2xl border border-dashed border-dash p-5 text-center">
          <p className="text-3xl">🌙</p>
          <p className="mt-2 font-semibold">Lesson complete</p>
          <p className="text-sm text-muted">Come back tomorrow for the next lesson to keep your streak going.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link to="/" className={buttonClasses('primary')}>
              <LayoutGrid className="size-4" /> Dashboard
            </Link>
            <Link to="/ask" className={buttonClasses('outline')}>
              <MessageCircleQuestion className="size-4" /> Ask the teacher
            </Link>
          </div>
        </div>
      )
  }
}

export function Typing() {
  return (
    <div className="flex gap-3">
      <TeacherAvatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-soft px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}
