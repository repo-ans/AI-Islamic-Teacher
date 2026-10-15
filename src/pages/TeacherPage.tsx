import { BadgeCheck, ChevronRight, ClipboardList, MessageSquareWarning } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Card, CourseBadge, EmptyState, PageLoader, Pill, SectionTitle, Segmented } from '../components/ui'
import { formatDay } from '../lib/clock'
import { orderedLessons } from '../lib/progress'
import { repo } from '../lib/repo'
import type { Catalog, LessonReview } from '../lib/types'

type Filter = 'pending' | 'validated' | 'all'

/** Teacher portal home: every submitted lesson, waiting for validation or already validated. */
export function TeacherPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [reviews, setReviews] = useState<LessonReview[]>([])
  const [filter, setFilter] = useState<Filter>('pending')

  useEffect(() => {
    void Promise.all([repo.getCatalog('teacher'), repo.listReviews()]).then(([c, r]) => {
      setCatalog(c)
      setReviews(r)
    })
  }, [])

  const openByLesson = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of reviews) if (r.status === 'open') m.set(r.lesson_id, (m.get(r.lesson_id) ?? 0) + 1)
    return m
  }, [reviews])

  if (!catalog) return <PageLoader />

  const pending = catalog.lessons.filter((l) => !l.validated_at).length
  const validated = catalog.lessons.length - pending

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <SectionTitle
          title="Lesson review"
          subtitle="AI-drafted lessons reach students only after a teacher validates them."
          action={
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'pending', label: `Needs validation (${pending})` },
                { value: 'validated', label: `Validated (${validated})` },
                { value: 'all', label: 'All' },
              ]}
            />
          }
        />
        <div className="space-y-6">
          {catalog.courses.map((c) => {
            const lessons = orderedLessons(catalog, c.id).filter((l) =>
              filter === 'all' ? true : filter === 'pending' ? !l.validated_at : !!l.validated_at,
            )
            if (!lessons.length) return null
            return (
              <section key={c.id}>
                <div className="mb-2 flex items-center gap-2">
                  <CourseBadge title={c.title} color={c.color} className="size-6 text-[9px]" />
                  <h3 className="font-semibold">{c.title}</h3>
                </div>
                <ul className="space-y-2">
                  {lessons.map((l) => {
                    const open = openByLesson.get(l.id) ?? 0
                    return (
                      <li key={l.id}>
                        <Link
                          to={`/teach/lesson/${l.id}`}
                          className="flex flex-wrap items-center gap-3 rounded-2xl bg-soft px-4 py-3 transition hover:bg-lilac/60"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{l.title}</span>
                            <span className="block truncate text-xs text-muted">
                              {catalog.modules.find((m) => m.id === l.module_id)?.title}
                            </span>
                          </span>
                          {open > 0 && (
                            <Pill tone="warn">
                              <MessageSquareWarning className="size-3" /> {open} improvement{open > 1 ? 's' : ''} requested
                            </Pill>
                          )}
                          {l.validated_at ? (
                            <Pill tone="ok">
                              <BadgeCheck className="size-3" /> {l.validated_by_name} · {formatDay(l.validated_at, { day: 'numeric', month: 'short' })}
                            </Pill>
                          ) : (
                            <Pill tone="brand">Needs validation</Pill>
                          )}
                          <ChevronRight className="size-4 text-muted" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
          {filter === 'pending' && pending === 0 && (
            <EmptyState icon={<BadgeCheck className="size-5" />} title="All caught up" body="Every submitted lesson has been validated. JazakAllahu khairan!" />
          )}
        </div>
      </Card>

      <div className="space-y-5">
        <div className="rounded-[24px] bg-brand p-6 text-white">
          <Pill tone="lime">
            <ClipboardList className="size-3.5" /> How review works
          </Pill>
          <ol className="mt-4 space-y-3 text-sm text-white/80">
            <li>1 · Read the lesson parts, sources and quiz.</li>
            <li>2 · If it is accurate and suitable, press Validate — students can then learn it, and they see your name.</li>
            <li>3 · Each lesson is validated once. Anyone can still request improvements, before or after.</li>
            <li>4 · When the admin edits a lesson, it comes back here for validation again.</li>
          </ol>
        </div>
        <Card>
          <p className="text-sm text-muted">Open improvement requests</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight">{reviews.filter((r) => r.status === 'open').length}</p>
        </Card>
      </div>
    </div>
  )
}
