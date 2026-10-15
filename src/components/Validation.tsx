import { BadgeCheck, Check, CircleDot } from 'lucide-react'
import { formatDay } from '../lib/clock'
import type { Lesson, LessonReview } from '../lib/types'
import { cn } from '../lib/utils'
import { Button, Pill } from './ui'

/** "Validated by …" — shown to students so they know a teacher checked the lesson. */
export function ValidatedBadge({ lesson, compact, className }: { lesson: Lesson; compact?: boolean; className?: string }) {
  if (!lesson.validated_at) return null
  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-ok', className)} title={lesson.validated_by_title ?? undefined}>
        <BadgeCheck className="size-3.5" /> Validated by {lesson.validated_by_name || 'a teacher'}
      </span>
    )
  }
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl bg-ok-soft p-3.5', className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-ok">
        <BadgeCheck className="size-5" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-medium text-ink">Checked by a teacher</p>
        <p className="text-ink/80">
          {lesson.validated_by_name || 'A teacher'}
          {lesson.validated_by_title ? <span className="text-muted"> · {lesson.validated_by_title}</span> : null}
        </p>
        <p className="text-xs text-muted">Validated {formatDay(lesson.validated_at, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    </div>
  )
}

/** Improvement requests on a lesson, newest first. Admins can mark them resolved. */
export function ReviewList({ reviews, onResolve }: { reviews: LessonReview[]; onResolve?: (id: string) => void }) {
  if (!reviews.length) return <p className="text-sm text-muted">No improvement requests yet.</p>
  return (
    <ul className="space-y-2">
      {reviews.map((r) => (
        <li key={r.id} className={cn('rounded-2xl border border-dashed p-3.5', r.status === 'open' ? 'border-warn/40 bg-warn-soft/40' : 'border-dash')}>
          <div className="flex flex-wrap items-center gap-2">
            {r.status === 'open' ? (
              <Pill tone="warn">
                <CircleDot className="size-3" /> Open
              </Pill>
            ) : (
              <Pill tone="ok">
                <Check className="size-3" /> Resolved
              </Pill>
            )}
            <span className="text-xs font-medium">{r.location}</span>
            <span className="ml-auto text-xs text-muted">
              {r.teacher_name || 'Teacher'} · {formatDay(r.created_at, { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <p className="mt-2 text-sm whitespace-pre-wrap">{r.comment}</p>
          {onResolve && r.status === 'open' && (
            <Button size="sm" variant="outline" className="mt-2.5" onClick={() => onResolve(r.id)}>
              <Check className="size-3.5" /> Mark resolved
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
