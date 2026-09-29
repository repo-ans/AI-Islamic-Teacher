import { ArrowLeft, Check, ClipboardCheck, Clock, Lock, Play, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button, Card, CourseBadge, Pill, ProgressBar, Tile } from '../components/ui'
import { useAuth } from '../lib/auth'
import { formatDay } from '../lib/clock'
import { useData } from '../lib/data'
import { courseLessons, courseProgress, moduleComplete, type LessonWithStatus } from '../lib/progress'
import { repo } from '../lib/repo'
import { cn } from '../lib/utils'

export function CourseDetailPage() {
  const { courseId = '' } = useParams()
  const { user } = useAuth()
  const { catalog, state, refresh } = useData()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const course = catalog.courses.find((c) => c.id === courseId)
  if (!course) {
    return (
      <Card>
        <p className="text-sm text-muted">Course not found.</p>
        <Link to="/courses" className="mt-3 inline-block text-sm font-medium underline">
          Back to courses
        </Link>
      </Card>
    )
  }

  const enrolled = state.enrollments.some((e) => e.course_id === course.id)
  const lessons = courseLessons(catalog, state.progress, course.id)
  const modules = catalog.modules.filter((m) => m.course_id === course.id)
  const p = courseProgress(catalog, state.progress, course.id)

  return (
    <div className="space-y-5">
      <Card>
        <Link to="/courses" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> All courses
        </Link>
        <div className="mt-4 flex flex-wrap items-start gap-5">
          <CourseBadge title={course.title} color={course.color} className="size-14 rounded-2xl text-base" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
              <Pill>{course.category}</Pill>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted">{course.description}</p>
            {enrolled && (
              <div className="mt-4 max-w-md">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted">
                    {p.done} of {p.total} lessons complete
                  </span>
                  <span className="font-medium">{p.pct}%</span>
                </div>
                <ProgressBar value={p.pct} tone={p.pct === 100 ? 'ok' : 'ink'} />
              </div>
            )}
          </div>
          {!enrolled && (
            <Button
              loading={busy}
              onClick={async () => {
                if (!user) return
                setBusy(true)
                await repo.enroll(user.id, course.id)
                await refresh()
                setBusy(false)
              }}
            >
              <Plus className="size-4" /> Enroll for free
            </Button>
          )}
        </div>
      </Card>

      {modules.map((m, mi) => {
        const items = lessons.filter((l) => l.lesson.module_id === m.id)
        const done = moduleComplete(catalog, state.progress, m.id)
        const assessment = state.attempts.filter((a) => a.kind === 'assessment' && a.module_id === m.id).at(-1)
        return (
          <Card key={m.id}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">Module {mi + 1}</p>
                <h2 className="text-lg font-semibold tracking-tight">{m.title}</h2>
                <p className="text-sm text-muted">{m.description}</p>
              </div>
              <Button variant={done ? 'lime' : 'outline'} disabled={!done || !enrolled} onClick={() => navigate(`/assessment/${m.id}`)}>
                <ClipboardCheck className="size-4" />
                {assessment ? `Assessment · ${assessment.score}/${assessment.total}` : 'Module assessment'}
              </Button>
            </div>
            <ol className="space-y-2">
              {items.map((item) => (
                <LessonItem key={item.lesson.id} item={item} enrolled={enrolled} />
              ))}
            </ol>
            {!done && <p className="mt-3 text-xs text-muted">The module assessment opens after you complete every lesson in this module.</p>}
          </Card>
        )
      })}
    </div>
  )
}

function LessonItem({ item, enrolled }: { item: LessonWithStatus; enrolled: boolean }) {
  const navigate = useNavigate()
  const { state } = useData()
  const progress = state.progress.find((p) => p.lesson_id === item.lesson.id)
  const open = enrolled && (item.status === 'available' || item.status === 'in_progress' || item.status === 'completed')

  return (
    <li>
      <Tile className={cn('flex flex-wrap items-center gap-4', !open && 'opacity-70')}>
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold',
            item.status === 'completed' ? 'bg-ok-soft text-ok' : open ? 'bg-lime text-ink' : 'bg-soft text-muted',
          )}
        >
          {item.status === 'completed' ? <Check className="size-4" /> : item.index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{item.lesson.title}</p>
          <p className="text-sm text-muted">{item.lesson.description}</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Clock className="size-3.5" /> {item.lesson.est_minutes} min
        </span>
        {item.status === 'completed' && progress?.total ? (
          <Pill tone="ok">
            Quiz {progress.score}/{progress.total}
          </Pill>
        ) : null}
        {item.status === 'tomorrow' && item.unlockAt && <Pill tone="warn">Opens {formatDay(item.unlockAt, { weekday: 'long' })}</Pill>}
        {open ? (
          <Button size="sm" variant={item.status === 'completed' ? 'outline' : 'primary'} onClick={() => navigate(`/learn/${item.lesson.id}`)}>
            {item.status === 'completed' ? (
              <>
                <RotateCcw className="size-3.5" /> Replay
              </>
            ) : (
              <>
                <Play className="size-3.5" /> {item.status === 'in_progress' ? 'Continue' : 'Start'}
              </>
            )}
          </Button>
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-soft">
            <Lock className="size-3.5 text-muted" />
          </span>
        )}
      </Tile>
    </li>
  )
}
