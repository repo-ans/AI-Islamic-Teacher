import { ArrowUp, ArrowUpRight, Check, ChevronRight, Lock, MessageCircleQuestion, Play, Plus, Sparkles } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, Card, CourseBadge, DotMeter, Pill, ProgressBar, Segmented, Tile } from '../components/ui'
import { useAuth } from '../lib/auth'
import { formatDay, greetingForHour, now } from '../lib/clock'
import { useData } from '../lib/data'
import {
  bestStreak,
  courseLessons,
  courseProgress,
  enrolledCourses,
  lessonsCompleted,
  minutesThisWeek,
  nextUp,
  quizAverage,
  recentDays,
  streak,
  weakTopics,
  weekAtAGlance,
  type LessonWithStatus,
} from '../lib/progress'
import { cn, firstName } from '../lib/utils'

type Range = 'today' | 'week' | 'course'

export function DashboardPage() {
  const { profile } = useAuth()
  const { catalog, state } = useData()
  const navigate = useNavigate()
  const [range, setRange] = useState<Range>('week')

  const next = nextUp(catalog, state)
  const courses = enrolledCourses(catalog, state)
  const currentStreak = streak(state.activity)
  const best = Math.max(bestStreak(state.activity), currentStreak)
  const avg = quizAverage(state)
  const completed = lessonsCompleted(state)
  const totalLessons = courses.reduce((n, c) => n + courseProgress(catalog, state.progress, c.id).total, 0)
  const weak = weakTopics(state)
  const weekMinutes = minutesThisWeek(state.activity)
  const questionsThisWeek = state.questions.filter((q) => now().getTime() - new Date(q.created_at).getTime() < 7 * 86_400_000).length
  const lastAttempt = state.attempts[state.attempts.length - 1]
  const readyToday = next && next.status !== 'tomorrow'

  const upcoming = useMemo(() => {
    const all = courses.flatMap((c) => courseLessons(catalog, state.progress, c.id))
    if (range === 'today') return all.filter((l) => l.status === 'available' || l.status === 'in_progress')
    if (range === 'week') {
      // Today's open lessons, then the next few in each course (one per day).
      return courses.flatMap((c) =>
        courseLessons(catalog, state.progress, c.id)
          .filter((l) => l.status !== 'completed')
          .slice(0, 3),
      )
    }
    return all
  }, [catalog, state.progress, courses, range])

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="min-w-0 space-y-5">
        {/* Greeting + stats */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
                {greetingForHour()}, {firstName(profile?.full_name)}
              </h1>
              <p className="mt-1 max-w-md text-sm text-muted">
                Assalamu alaikum! You've learned {weekMinutes} min this week.{' '}
                {readyToday
                  ? `Today's lesson, “${next!.lesson.title}”, is ready for you.`
                  : next
                    ? 'Your next lesson unlocks tomorrow, in shaa Allah.'
                    : 'Choose a course to begin your journey.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/ask')}>
                <MessageCircleQuestion className="size-4" /> Ask the teacher
              </Button>
              {readyToday ? (
                <Button onClick={() => navigate(`/learn/${next!.lesson.id}`)}>
                  <Play className="size-4" /> {next!.status === 'in_progress' ? 'Continue lesson' : "Start today's lesson"}
                </Button>
              ) : (
                <Button onClick={() => navigate('/courses')}>
                  <Plus className="size-4" /> Add a course
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="-rotate-2 rounded-2xl border-2 border-dashed border-ink/25 bg-lime p-4">
              <p className="text-sm font-medium">Learning streak</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">
                {currentStreak}
                <span className="ml-1 text-lg font-medium">{currentStreak === 1 ? 'day' : 'days'}</span>
              </p>
              <DotMeter className="mt-3" tone="ink" max={7} value={recentDays(state.activity, 7).filter((d) => d.active).length} />
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white">
                <ArrowUp className="size-3" /> Best: {best} {best === 1 ? 'day' : 'days'}
              </span>
            </div>
            <Stat
              label="Lessons completed"
              value={completed}
              suffix={`of ${totalLessons}`}
              meter={<DotMeter tone="brand" max={10} value={totalLessons ? Math.round((completed / totalLessons) * 10) : 0} />}
              pill={
                <Pill tone="ok">
                  <Check className="size-3" /> {readyToday ? 'Lesson ready today' : 'On track'}
                </Pill>
              }
            />
            <Stat
              label="Quiz average"
              value={avg ?? '—'}
              suffix={avg !== null ? '%' : ''}
              meter={<DotMeter tone="ink" max={10} value={avg ? Math.round(avg / 10) : 0} />}
              pill={
                lastAttempt ? (
                  <Pill tone="brand">
                    Last: {lastAttempt.score}/{lastAttempt.total}
                  </Pill>
                ) : (
                  <Pill>No quizzes yet</Pill>
                )
              }
            />
            <Stat
              label="Questions asked"
              value={state.questions.length}
              meter={<DotMeter tone="lilac" max={10} value={Math.min(10, state.questions.length)} />}
              pill={<Pill tone="brand">+ {questionsThisWeek} this week</Pill>}
            />
          </div>
        </Card>

        {/* Upcoming lessons */}
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Upcoming lessons</h2>
              <p className="text-sm text-muted">{formatDay(now())}</p>
            </div>
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This week' },
                { value: 'course', label: 'All' },
              ]}
            />
          </div>

          <div className="space-y-2">
            {upcoming.length === 0 && (
              <Tile className="py-8 text-center text-sm text-muted">
                {courses.length === 0 ? (
                  <>
                    You're not enrolled yet.{' '}
                    <Link to="/courses" className="font-medium text-ink underline">
                      Browse courses
                    </Link>
                  </>
                ) : range === 'today' ? (
                  "Today's lesson is done — see you tomorrow, in shaa Allah."
                ) : (
                  'All lessons completed. MashaAllah!'
                )}
              </Tile>
            )}
            {upcoming.map((l) => (
              <LessonRow key={l.lesson.id} item={l} />
            ))}
          </div>

          <WeekAtAGlance />
        </Card>
      </div>

      {/* Right column */}
      <div className="space-y-5">
        <div className="rounded-[24px] bg-brand p-6 text-white">
          <div className="flex items-center justify-between">
            <Pill tone="lime">
              <Sparkles className="size-3.5" /> AI suggestion
            </Pill>
            <Link to="/revision" className="text-xs text-white/70 underline underline-offset-2 hover:text-white">
              Why this?
            </Link>
          </div>
          {weak.length > 0 ? (
            <>
              <h3 className="mt-4 text-[22px] leading-tight font-semibold">
                {weak.length} topic{weak.length > 1 ? 's' : ''} could use a quick review
              </h3>
              <div className="mt-4 space-y-2">
                {weak.slice(0, 3).map((w) => {
                  const course = catalog.courses.find((c) => c.id === w.courseId)
                  const lesson = catalog.lessons.find((l) => l.id === w.lessonId)
                  return (
                    <Link
                      key={w.topic + w.courseId}
                      to="/revision"
                      className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-white/25 p-3 transition hover:bg-white/5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{w.topic}</span>
                        <span className="block truncate text-xs text-white/60">
                          {course?.title} · {lesson?.title}
                        </span>
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-white/70" />
                    </Link>
                  )
                })}
              </div>
              <Button variant="lime" className="mt-4 w-full" onClick={() => navigate('/revision')}>
                Start review
              </Button>
            </>
          ) : (
            <>
              <h3 className="mt-4 text-[22px] leading-tight font-semibold">
                {readyToday ? 'Keep your streak alive today' : "You're all caught up"}
              </h3>
              <p className="mt-2 text-sm text-white/70">
                {readyToday
                  ? `A ${next!.lesson.est_minutes}-minute lesson is waiting: ${next!.lesson.title}.`
                  : 'No weak areas right now. Ask the teacher anything you are curious about.'}
              </p>
              <Button
                variant="lime"
                className="mt-5 w-full"
                onClick={() => navigate(readyToday ? `/learn/${next!.lesson.id}` : '/ask')}
              >
                {readyToday ? 'Start lesson' : 'Ask a question'}
              </Button>
            </>
          )}
        </div>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Course progress</h2>
            <Pill tone="warn">{courses.length} enrolled</Pill>
          </div>
          <div className="space-y-2.5">
            {courses.map((c) => {
              const p = courseProgress(catalog, state.progress, c.id)
              const mod = catalog.modules.find((m) => m.course_id === c.id)
              return (
                <Link key={c.id} to={`/courses/${c.id}`} className="block">
                  <Tile className="transition hover:border-ink/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.title}</p>
                        <p className="truncate text-xs text-muted">{mod?.title}</p>
                      </div>
                      <span className={cn('text-sm font-medium', p.pct === 100 && 'text-ok')}>
                        {p.done} / {p.total}
                      </span>
                    </div>
                    <ProgressBar className="mt-3" value={p.pct} tone={p.pct === 100 ? 'ok' : 'ink'} />
                  </Tile>
                </Link>
              )
            })}
            {courses.length === 0 && <p className="text-sm text-muted">No courses yet.</p>}
          </div>
          {state.questions.length > 0 && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-lilac p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-brand">
                <MessageCircleQuestion className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-muted">Your last question</span>
                <span className="block truncate text-sm font-medium">{state.questions[state.questions.length - 1].question}</span>
              </span>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, suffix, meter, pill }: { label: string; value: number | string; suffix?: string; meter: ReactNode; pill: ReactNode }) {
  return (
    <Tile className="flex flex-col">
      <p className="text-sm text-ink/80">{label}</p>
      <p className="mt-2 text-4xl font-semibold tracking-tight">
        {value}
        {suffix && <span className="ml-1.5 text-sm font-normal text-muted">{suffix}</span>}
      </p>
      <div className="mt-3">{meter}</div>
      <div className="mt-auto pt-3">{pill}</div>
    </Tile>
  )
}

function LessonRow({ item }: { item: LessonWithStatus }) {
  const navigate = useNavigate()
  const open = item.status === 'available' || item.status === 'in_progress' || item.status === 'completed'
  const when =
    item.status === 'completed'
      ? 'Done'
      : item.status === 'available' || item.status === 'in_progress'
        ? 'Today'
        : item.status === 'tomorrow'
          ? 'Tomorrow'
          : `Day ${item.index + 1}`
  const pill = {
    completed: <Pill tone="ok">Completed</Pill>,
    in_progress: <Pill tone="warn">In progress</Pill>,
    available: <Pill tone="ok">Ready</Pill>,
    tomorrow: <Pill tone="warn">Opens tomorrow</Pill>,
    locked: <Pill>Locked</Pill>,
  }[item.status]

  return (
    <button
      onClick={() => navigate(open ? `/learn/${item.lesson.id}` : `/courses/${item.course.id}`)}
      className="flex w-full items-center gap-4 rounded-2xl bg-soft px-4 py-3 text-left transition hover:bg-lilac/60"
    >
      <span className={cn('w-16 shrink-0 text-sm font-semibold', !open && 'text-muted')}>{when}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.lesson.title}</span>
        <span className="block truncate text-xs text-muted">{item.module?.title}</span>
      </span>
      <span className="hidden items-center gap-2 text-sm text-ink/80 md:flex">
        <CourseBadge title={item.course.title} color={item.course.color} className="size-6 text-[9px]" />
        {item.course.title}
      </span>
      <span className="hidden w-14 text-right text-sm text-muted sm:block">{item.lesson.est_minutes} min</span>
      <span className="w-28 text-right">{pill}</span>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white">
        {open ? <ChevronRight className="size-4" /> : <Lock className="size-3.5 text-muted" />}
      </span>
    </button>
  )
}

function WeekAtAGlance() {
  const { state } = useData()
  const week = weekAtAGlance(state.activity)
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Week at a glance</h3>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-ink" /> Lesson done
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-line" /> No lesson
          </span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {week.map((d) => (
          <div
            key={d.key}
            className={cn('rounded-2xl p-3', d.isToday ? 'bg-ink text-white' : 'border border-dashed border-dash')}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{formatDay(d.date, { weekday: 'short' })}</span>
              <span className={d.isToday ? 'text-white/60' : 'text-muted'}>{d.date.getDate()}</span>
            </div>
            <p className={cn('mt-3 text-2xl font-semibold', d.isToday && 'text-lime')}>{d.minutes}</p>
            <p className={cn('text-xs', d.isToday ? 'text-white/60' : 'text-muted')}>minutes</p>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: Math.max(1, d.lessons) }, (_, i) => (
                <span
                  key={i}
                  className={cn('size-1.5 rounded-full', d.lessons ? (d.isToday ? 'bg-lime' : 'bg-ink') : d.isToday ? 'bg-white/25' : 'bg-line')}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
