import { ArrowLeft, BadgeCheck, CircleCheck, MessageSquareWarning, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Modal } from '../components/Modal'
import { ReferenceDrawer, ReferenceList } from '../components/References'
import { Button, Card, ErrorNote, Label, PageLoader, Pill, SectionTitle, Select, Textarea, Tile } from '../components/ui'
import { ReviewList, ValidatedBadge } from '../components/Validation'
import { useAuth } from '../lib/auth'
import { repo } from '../lib/repo'
import type { LessonContent, LessonReview, Reference } from '../lib/types'
import { errorMessage } from '../lib/utils'

/** A teacher reads the whole lesson, then validates it or requests improvements. */
export function TeacherLessonPage() {
  const { lessonId = '' } = useParams()
  const { profile } = useAuth()
  const [content, setContent] = useState<LessonContent | null | undefined>(undefined)
  const [reviews, setReviews] = useState<LessonReview[]>([])
  const [openRef, setOpenRef] = useState<Reference | null>(null)
  const [improving, setImproving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([repo.getLessonContent(lessonId), repo.listReviews(lessonId)])
    setContent(c)
    setReviews(r)
  }, [lessonId])

  useEffect(() => {
    void load()
  }, [load])

  if (content === undefined) return <PageLoader />
  if (!content) {
    return (
      <Card>
        <p className="text-sm text-muted">Lesson not found.</p>
        <Link to="/teach" className="mt-3 inline-block text-sm font-medium underline">
          Back to review
        </Link>
      </Card>
    )
  }

  const { lesson, segments, references, questions } = content
  const validated = !!lesson.validated_at
  const openRequests = reviews.filter((r) => r.status === 'open').length

  const validate = async () => {
    setBusy(true)
    setError('')
    try {
      await repo.validateLesson(lesson.id)
      setConfirming(false)
      await load()
    } catch (e) {
      setError(errorMessage(e))
      setConfirming(false)
      await load() // someone else may have validated it meanwhile
    } finally {
      setBusy(false)
    }
  }

  const locations = [
    'General',
    'Title & objectives',
    ...segments.map((s, i) => `Part ${i + 1} · ${s.title}`),
    'Sources',
    ...questions.map((_, i) => `Quiz Q${i + 1}`),
  ]

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <Card>
          <Link to="/teach" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> All lessons
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{lesson.title}</h1>
          <p className="mt-1 text-sm text-muted">{lesson.description}</p>
          <p className="mt-4 text-xs font-medium tracking-wide text-muted uppercase">Objectives</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            {lesson.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle title="Recorded lesson parts" subtitle="What the teacher voice says, in order." />
          <ol className="space-y-3">
            {segments.map((s, i) => (
              <li key={s.id}>
                <Tile className="md:flex md:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-full bg-soft text-xs font-semibold">{i + 1}</span>
                      <p className="font-medium">{s.title}</p>
                      <Pill className="capitalize">{s.kind}</Pill>
                    </div>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink/90">{s.content}</p>
                  </div>
                  {s.image_url && <img src={s.image_url} alt="" className="mt-3 aspect-3/2 w-full rounded-xl object-cover md:mt-0 md:w-56" />}
                </Tile>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <SectionTitle title="Sources" subtitle="Tap to read the full reference." />
          <ReferenceList refs={references} onOpen={setOpenRef} />
        </Card>

        <Card>
          <SectionTitle title="Quiz" subtitle="Correct answers are highlighted." />
          <ol className="space-y-3">
            {questions.map((q, i) => (
              <li key={q.id}>
                <Tile>
                  <p className="text-xs font-medium text-brand">
                    Q{i + 1} · {{ mcq: 'Multiple choice', true_false: 'True / false', short_answer: 'Short answer', reflection: 'Reflection' }[q.type]}
                  </p>
                  <p className="mt-1 font-medium">{q.prompt}</p>
                  {q.options.length > 0 && (
                    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {q.options.map((o) => (
                        <li key={o} className={o === q.correct_answer ? 'flex items-center gap-1.5 rounded-lg bg-ok-soft px-2.5 py-1.5 text-sm text-ok' : 'rounded-lg bg-soft px-2.5 py-1.5 text-sm'}>
                          {o === q.correct_answer && <CircleCheck className="size-3.5" />}
                          {o}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.type === 'short_answer' && <p className="mt-2 text-sm text-ok">Model answer: {q.correct_answer}</p>}
                  {q.explanation && <p className="mt-2 text-sm text-muted">{q.explanation}</p>}
                </Tile>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="space-y-5">
        <div className="sticky top-5 space-y-5">
          <Card>
            <p className="text-sm font-semibold">Your decision</p>
            {validated ? (
              <>
                <ValidatedBadge lesson={lesson} className="mt-3" />
                <p className="mt-3 text-xs text-muted">This lesson is already validated and visible to students. You can still request improvements.</p>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">Students can't see this lesson until a teacher validates it.</p>
                {profile?.role === 'teacher' ? (
                  <Button variant="lime" size="lg" className="mt-4 w-full" onClick={() => setConfirming(true)}>
                    <BadgeCheck className="size-5" /> Validate lesson
                  </Button>
                ) : (
                  <p className="mt-3 rounded-xl bg-soft p-3 text-xs text-muted">Only accounts with the Teacher role can validate.</p>
                )}
                {openRequests > 0 && (
                  <p className="mt-2 text-xs text-warn">
                    {openRequests} improvement request{openRequests > 1 ? 's are' : ' is'} still open — check them before validating.
                  </p>
                )}
              </>
            )}
            {profile?.role === 'teacher' && (
              <Button variant="outline" className="mt-2 w-full" onClick={() => setImproving(true)}>
                <MessageSquareWarning className="size-4" /> Request improvement
              </Button>
            )}
            <div className="mt-3">
              <ErrorNote>{error}</ErrorNote>
            </div>
          </Card>

          <Card>
            <p className="mb-3 text-sm font-semibold">Improvement requests</p>
            <ReviewList reviews={reviews} />
          </Card>
        </div>
      </div>

      {confirming && (
        <Modal onClose={() => setConfirming(false)}>
          <h2 className="text-lg font-semibold">Validate “{lesson.title}”?</h2>
          <p className="mt-2 text-sm text-muted">
            You confirm the lesson is accurate and suitable for students. It becomes visible to them immediately, with your name
            {profile?.teacher_title ? ` and title (${profile.teacher_title})` : ''} shown as the validator. A lesson can only be validated once.
          </p>
          {!profile?.teacher_title && (
            <p className="mt-3 rounded-xl bg-warn-soft p-3 text-xs text-warn">
              Tip: add your qualification in Settings so students see it next to your name.
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="lime" onClick={validate} loading={busy}>
              <BadgeCheck className="size-4" /> Yes, validate
            </Button>
          </div>
        </Modal>
      )}

      {improving && (
        <ImproveDialog
          locations={locations}
          onClose={() => setImproving(false)}
          onSubmit={async (location, comment) => {
            await repo.requestImprovement(lesson.id, location, comment)
            setImproving(false)
            await load()
          }}
        />
      )}

      {openRef && <ReferenceDrawer reference={openRef} onClose={() => setOpenRef(null)} />}
    </div>
  )
}

function ImproveDialog({
  locations,
  onClose,
  onSubmit,
}: {
  locations: string[]
  onClose: () => void
  onSubmit: (location: string, comment: string) => Promise<void>
}) {
  const [location, setLocation] = useState(locations[0])
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Request improvement</h2>
          <p className="text-sm text-muted">Tell the curriculum team exactly what to change.</p>
        </div>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
          <X className="size-5" />
        </button>
      </div>
      <div className="mt-5 space-y-4">
        <label className="block">
          <Label>Where?</Label>
          <Select value={location} onChange={(e) => setLocation(e.target.value)}>
            {locations.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        </label>
        <label className="block">
          <Label>What should change?</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. The hadith number should be Sahih Muslim 8, and simplify the second paragraph for children."
            className="min-h-32"
          />
        </label>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={!comment.trim()}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                await onSubmit(location, comment.trim())
              } catch (e) {
                setError(errorMessage(e))
                setBusy(false)
              }
            }}
          >
            <MessageSquareWarning className="size-4" /> Send request
          </Button>
        </div>
      </div>
    </Modal>
  )
}
