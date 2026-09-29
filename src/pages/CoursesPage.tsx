import { ArrowRight, BookOpen, Clock, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Card, CourseBadge, EmptyState, Pill, ProgressBar, SectionTitle } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { courseProgress, orderedLessons } from '../lib/progress'
import { repo } from '../lib/repo'

export function CoursesPage() {
  const { user } = useAuth()
  const { catalog, state, refresh } = useData()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const enrolled = new Set(state.enrollments.map((e) => e.course_id))

  const enroll = async (courseId: string) => {
    if (!user) return
    setBusy(courseId)
    await repo.enroll(user.id, courseId)
    await refresh()
    setBusy(null)
    navigate(`/courses/${courseId}`)
  }

  return (
    <Card>
      <SectionTitle title="Courses" subtitle="Human-designed curriculum, taught by your AI teacher — one lesson a day." />
      {catalog.courses.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-5" />} title="No courses yet" body="An admin needs to publish the curriculum first." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {catalog.courses.map((c) => {
            const lessons = orderedLessons(catalog, c.id)
            const minutes = lessons.reduce((n, l) => n + l.est_minutes, 0)
            const p = courseProgress(catalog, state.progress, c.id)
            const isEnrolled = enrolled.has(c.id)
            return (
              <div key={c.id} className="flex flex-col rounded-2xl border border-dashed border-dash p-5">
                <div className="flex items-start justify-between">
                  <CourseBadge title={c.title} color={c.color} className="size-12 rounded-xl text-sm" />
                  {isEnrolled ? <Pill tone="ok">Enrolled</Pill> : <Pill>{c.category}</Pill>}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{c.description}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="size-3.5" /> {lessons.length} lessons
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" /> ~{minutes} min
                  </span>
                </div>
                {isEnrolled && (
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-muted">Progress</span>
                      <span className="font-medium">{p.pct}%</span>
                    </div>
                    <ProgressBar value={p.pct} tone={p.pct === 100 ? 'ok' : 'ink'} />
                  </div>
                )}
                <div className="mt-5">
                  {isEnrolled ? (
                    <Button variant="outline" className="w-full" onClick={() => navigate(`/courses/${c.id}`)}>
                      Open course <ArrowRight className="size-4" />
                    </Button>
                  ) : (
                    <Button className="w-full" loading={busy === c.id} onClick={() => enroll(c.id)}>
                      <Plus className="size-4" /> Enroll for free
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
