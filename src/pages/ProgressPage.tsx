import { BookOpen, Flame, MessageCircleQuestion, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CourseBadge, EmptyState, Pill, ProgressBar, SectionTitle, Tile } from '../components/ui'
import { formatDay } from '../lib/clock'
import { useData } from '../lib/data'
import { bestStreak, courseLessons, courseProgress, enrolledCourses, lessonsCompleted, quizAverage, recentDays, streak, weakTopics } from '../lib/progress'
import { cn } from '../lib/utils'

export function ProgressPage() {
  const { catalog, state } = useData()
  const courses = enrolledCourses(catalog, state)
  const days = recentDays(state.activity, 28)
  const avg = quizAverage(state)
  const weak = weakTopics(state)
  const lessonTitle = (id: string | null) => catalog.lessons.find((l) => l.id === id)?.title
  const moduleTitle = (id: string | null) => catalog.modules.find((m) => m.id === id)?.title

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric icon={<Flame className="size-4" />} label="Current streak" value={`${streak(state.activity)} days`} sub={`Best ${Math.max(bestStreak(state.activity), streak(state.activity))} days`} lime />
        <Metric icon={<BookOpen className="size-4" />} label="Lessons completed" value={lessonsCompleted(state)} sub={`${courses.length} course${courses.length === 1 ? '' : 's'}`} />
        <Metric icon={<Trophy className="size-4" />} label="Quiz average" value={avg === null ? '—' : `${avg}%`} sub={`${state.attempts.length} quizzes taken`} />
        <Metric icon={<MessageCircleQuestion className="size-4" />} label="Questions asked" value={state.questions.length} sub={`${state.reflections.length} reflections written`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <SectionTitle title="Course progress" subtitle="Lesson-by-lesson results" />
          {courses.length === 0 && <EmptyState icon={<BookOpen className="size-5" />} title="No courses yet" body="Enroll in a course to track your progress." />}
          <div className="space-y-5">
            {courses.map((c) => {
              const p = courseProgress(catalog, state.progress, c.id)
              return (
                <div key={c.id}>
                  <div className="mb-2 flex items-center gap-3">
                    <CourseBadge title={c.title} color={c.color} />
                    <p className="flex-1 font-medium">{c.title}</p>
                    <span className="text-sm text-muted">{p.pct}%</span>
                  </div>
                  <ProgressBar value={p.pct} tone={p.pct === 100 ? 'ok' : 'ink'} />
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {courseLessons(catalog, state.progress, c.id).map((l) => {
                      const prog = state.progress.find((x) => x.lesson_id === l.lesson.id)
                      return (
                        <li key={l.lesson.id}>
                          <Tile className="flex items-center justify-between gap-2 p-3">
                            <span className="truncate text-sm">{l.lesson.title}</span>
                            {l.status === 'completed' ? (
                              <Pill tone="ok">{prog?.total ? `${prog.score}/${prog.total}` : 'Done'}</Pill>
                            ) : l.status === 'available' || l.status === 'in_progress' ? (
                              <Pill tone="lime">Today</Pill>
                            ) : (
                              <Pill>{l.status === 'tomorrow' ? 'Tomorrow' : 'Locked'}</Pill>
                            )}
                          </Tile>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <SectionTitle title="Last 4 weeks" subtitle="Each square is a day you studied" />
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d) => (
                <span
                  key={d.day}
                  title={d.day}
                  className={cn('aspect-square rounded-md', d.active ? 'bg-ink' : 'border border-dashed border-dash')}
                />
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle title="Weak areas" />
            {weak.length === 0 ? (
              <p className="text-sm text-muted">None right now — MashaAllah!</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {weak.map((w) => (
                  <Pill key={w.topic + w.courseId} tone="warn">
                    {w.topic} · {w.items.length}
                  </Pill>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <SectionTitle title="Quiz history" />
          {state.attempts.length === 0 ? (
            <p className="text-sm text-muted">No quizzes yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Lesson / module</th>
                    <th className="pb-2 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {[...state.attempts].reverse().map((a) => (
                    <tr key={a.id} className="border-t border-dashed border-dash">
                      <td className="py-2.5 whitespace-nowrap text-muted">{formatDay(a.created_at, { day: 'numeric', month: 'short' })}</td>
                      <td className="py-2.5">
                        {a.kind === 'assessment' ? `Assessment · ${moduleTitle(a.module_id) ?? ''}` : lessonTitle(a.lesson_id) ?? 'Lesson'}
                      </td>
                      <td className="py-2.5 text-right font-medium">
                        {a.score}/{a.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card>
          <SectionTitle title="Reflections" subtitle="Your thoughts, with your teacher's feedback" />
          {state.reflections.length === 0 ? (
            <p className="text-sm text-muted">Reflections you write at the end of each quiz appear here.</p>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto scroll-thin">
              {[...state.reflections].reverse().map((r) => (
                <Tile key={r.id}>
                  <p className="text-xs text-muted">
                    {lessonTitle(r.lesson_id)} · {formatDay(r.created_at, { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="mt-1 text-sm">“{r.content}”</p>
                  {r.ai_feedback && <p className="mt-2 rounded-xl bg-lilac/60 p-2.5 text-sm text-ink/80">{r.ai_feedback}</p>}
                </Tile>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Metric({ icon, label, value, sub, lime }: { icon: ReactNode; label: string; value: ReactNode; sub: string; lime?: boolean }) {
  return (
    <div className={cn('rounded-[24px] p-5', lime ? 'bg-lime' : 'bg-white')}>
      <div className="flex items-center gap-2 text-sm">
        <span className={cn('grid size-7 place-items-center rounded-lg', lime ? 'bg-ink text-lime' : 'bg-soft text-muted')}>{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className={cn('text-sm', lime ? 'text-ink/70' : 'text-muted')}>{sub}</p>
    </div>
  )
}
