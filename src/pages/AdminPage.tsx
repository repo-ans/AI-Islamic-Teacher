import { ArrowDown, ArrowUp, BookOpen, FileText, FolderOpen, Plus, Save, Trash2, Volume2, WandSparkles, X } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Modal } from '../components/Modal'
import { Button, Card, CourseBadge, ErrorNote, Input, Label, PageLoader, Pill, Select, Textarea } from '../components/ui'
import { ai } from '../lib/ai'
import { useData } from '../lib/data'
import { LEVELS } from '../lib/levels'
import { orderedLessons } from '../lib/progress'
import { repo } from '../lib/repo'
import { canGenerateAudio, generateSegmentAudio } from '../lib/tts-admin'
import type { Catalog, Course, CourseColor, DraftLesson, Module, QuestionType, SegmentKind, SourceType } from '../lib/types'
import { cn, errorMessage } from '../lib/utils'

type Selection =
  | { kind: 'course'; id: string | null }
  | { kind: 'module'; id: string | null; courseId: string }
  | { kind: 'lesson'; id: string | null; courseId: string; moduleId: string }
  | null

export function AdminPage() {
  const { refresh: refreshLearner } = useData()
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [sel, setSel] = useState<Selection>(null)

  const reload = useCallback(async () => {
    setCatalog(await repo.getCatalog(true))
    void refreshLearner()
  }, [refreshLearner])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!catalog) return <PageLoader />

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="h-fit">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Curriculum</h1>
            <p className="text-xs text-muted">Courses → modules → lessons</p>
          </div>
          <Button size="sm" onClick={() => setSel({ kind: 'course', id: null })}>
            <Plus className="size-3.5" /> Course
          </Button>
        </div>
        <ul className="space-y-3">
          {catalog.courses.map((c) => (
            <li key={c.id}>
              <TreeButton active={sel?.kind === 'course' && sel.id === c.id} onClick={() => setSel({ kind: 'course', id: c.id })}>
                <CourseBadge title={c.title} color={c.color} className="size-6 text-[9px]" />
                <span className="flex-1 truncate font-medium">{c.title}</span>
                {!c.published && <Pill tone="warn">Draft</Pill>}
              </TreeButton>
              <ul className="mt-1 ml-3 space-y-1 border-l border-dashed border-dash pl-3">
                {catalog.modules
                  .filter((m) => m.course_id === c.id)
                  .map((m) => (
                    <li key={m.id}>
                      <TreeButton active={sel?.kind === 'module' && sel.id === m.id} onClick={() => setSel({ kind: 'module', id: m.id, courseId: c.id })}>
                        <FolderOpen className="size-3.5 text-muted" />
                        <span className="flex-1 truncate">{m.title}</span>
                      </TreeButton>
                      <ul className="ml-4 space-y-0.5">
                        {orderedLessons(catalog, c.id)
                          .filter((l) => l.module_id === m.id)
                          .map((l) => (
                            <li key={l.id}>
                              <TreeButton
                                active={sel?.kind === 'lesson' && sel.id === l.id}
                                onClick={() => setSel({ kind: 'lesson', id: l.id, courseId: c.id, moduleId: m.id })}
                              >
                                <FileText className="size-3.5 text-muted" />
                                <span className="flex-1 truncate text-[13px]">{l.title}</span>
                                {!l.published && <span className="size-1.5 rounded-full bg-warn" title="Draft" />}
                              </TreeButton>
                            </li>
                          ))}
                        <li>
                          <button
                            onClick={() => setSel({ kind: 'lesson', id: null, courseId: c.id, moduleId: m.id })}
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted hover:text-ink"
                          >
                            <Plus className="size-3" /> Lesson
                          </button>
                        </li>
                      </ul>
                    </li>
                  ))}
                <li>
                  <button
                    onClick={() => setSel({ kind: 'module', id: null, courseId: c.id })}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted hover:text-ink"
                  >
                    <Plus className="size-3" /> Module
                  </button>
                </li>
              </ul>
            </li>
          ))}
        </ul>
      </Card>

      <div className="min-w-0">
        {!sel && (
          <Card className="grid min-h-80 place-items-center text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-lime">
                <BookOpen className="size-5" />
              </span>
              <p className="mt-3 font-medium">Select something to edit</p>
              <p className="text-sm text-muted">Or add a course, module or lesson from the tree.</p>
            </div>
          </Card>
        )}
        {sel?.kind === 'course' && (
          <CourseEditor key={sel.id ?? 'new'} course={catalog.courses.find((c) => c.id === sel.id)} count={catalog.courses.length} onSaved={async (id) => { await reload(); setSel(id ? { kind: 'course', id } : null) }} />
        )}
        {sel?.kind === 'module' && (
          <ModuleEditor
            key={sel.id ?? `new-${sel.courseId}`}
            module={catalog.modules.find((m) => m.id === sel.id)}
            courseId={sel.courseId}
            count={catalog.modules.filter((m) => m.course_id === sel.courseId).length}
            onSaved={async (id) => { await reload(); setSel(id ? { kind: 'module', id, courseId: sel.courseId } : null) }}
          />
        )}
        {sel?.kind === 'lesson' && (
          <LessonEditor
            key={sel.id ?? `new-${sel.moduleId}`}
            lessonId={sel.id}
            course={catalog.courses.find((c) => c.id === sel.courseId)!}
            module={catalog.modules.find((m) => m.id === sel.moduleId)!}
            nextOrder={catalog.lessons.filter((l) => l.module_id === sel.moduleId).length}
            onSaved={async (id) => { await reload(); setSel(id ? { ...sel, id } : null) }}
          />
        )}
      </div>
    </div>
  )
}

function TreeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm', active ? 'bg-ink text-white' : 'hover:bg-soft')}>
      {children}
    </button>
  )
}

function EditorHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

// ───────────────────────── Course ─────────────────────────
function CourseEditor({ course, count, onSaved }: { course?: Course; count: number; onSaved: (id: string | null) => Promise<void> }) {
  const [c, setC] = useState<Omit<Course, 'id'> & { id?: string }>(
    course ?? { slug: '', title: '', description: '', category: '', color: 'brand', order_index: count, published: false },
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const slug = c.slug || c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const saved = await repo.saveCourse({ ...c, slug })
      await onSaved(saved.id)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <EditorHeader title={course ? 'Edit course' : 'New course'}>
        {course && (
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm(`Delete "${course.title}" and all its modules and lessons?`)) return
              await repo.deleteCourse(course.id)
              await onSaved(null)
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        )}
        <Button onClick={save} loading={busy} disabled={!c.title.trim()}>
          <Save className="size-4" /> Save
        </Button>
      </EditorHeader>
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <label className="block">
          <Label>Title</Label>
          <Input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} />
        </label>
        <label className="block">
          <Label hint="URL-friendly id">Slug</Label>
          <Input value={c.slug} onChange={(e) => setC({ ...c, slug: e.target.value })} placeholder="auto from title" />
        </label>
        <label className="block sm:col-span-2">
          <Label>Description</Label>
          <Textarea value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} />
        </label>
        <label className="block">
          <Label>Category</Label>
          <Input value={c.category} onChange={(e) => setC({ ...c, category: e.target.value })} placeholder="Belief, Worship, History…" />
        </label>
        <label className="block">
          <Label>Colour</Label>
          <Select value={c.color} onChange={(e) => setC({ ...c, color: e.target.value as CourseColor })}>
            {(['brand', 'lime', 'amber', 'ink'] as const).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <Label>Order</Label>
          <Input type="number" value={c.order_index} onChange={(e) => setC({ ...c, order_index: Number(e.target.value) })} />
        </label>
        <Toggle label="Published (visible to students)" checked={c.published} onChange={(v) => setC({ ...c, published: v })} />
      </div>
      <div className="mt-4">
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Card>
  )
}

// ───────────────────────── Module ─────────────────────────
function ModuleEditor({ module, courseId, count, onSaved }: { module?: Module; courseId: string; count: number; onSaved: (id: string | null) => Promise<void> }) {
  const [m, setM] = useState<Omit<Module, 'id'> & { id?: string }>(module ?? { course_id: courseId, title: '', description: '', order_index: count })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <Card>
      <EditorHeader title={module ? 'Edit module' : 'New module'}>
        {module && (
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm(`Delete module "${module.title}" and its lessons?`)) return
              await repo.deleteModule(module.id)
              await onSaved(null)
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        )}
        <Button
          loading={busy}
          disabled={!m.title.trim()}
          onClick={async () => {
            setBusy(true)
            setError('')
            try {
              const saved = await repo.saveModule(m)
              await onSaved(saved.id)
            } catch (e) {
              setError(errorMessage(e))
            } finally {
              setBusy(false)
            }
          }}
        >
          <Save className="size-4" /> Save
        </Button>
      </EditorHeader>
      <div className="grid max-w-3xl gap-4">
        <label className="block">
          <Label>Title</Label>
          <Input value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} />
        </label>
        <label className="block">
          <Label>Description</Label>
          <Textarea value={m.description} onChange={(e) => setM({ ...m, description: e.target.value })} />
        </label>
        <label className="block max-w-40">
          <Label>Order</Label>
          <Input type="number" value={m.order_index} onChange={(e) => setM({ ...m, order_index: Number(e.target.value) })} />
        </label>
      </div>
      <div className="mt-4">
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Card>
  )
}

// ───────────────────────── Lesson ─────────────────────────
function blankDraft(course: Course, module: Module, order: number): DraftLesson {
  return {
    lesson: { course_id: course.id, module_id: module.id, title: '', description: '', objectives: [], est_minutes: 10, order_index: order, published: false },
    segments: [],
    references: [],
    questions: [],
  }
}

function LessonEditor({
  lessonId,
  course,
  module,
  nextOrder,
  onSaved,
}: {
  lessonId: string | null
  course: Course
  module: Module
  nextOrder: number
  onSaved: (id: string | null) => Promise<void>
}) {
  const [draft, setDraft] = useState<DraftLesson | null>(lessonId ? null : blankDraft(course, module, nextOrder))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [audioBusy, setAudioBusy] = useState<number | null>(null)

  useEffect(() => {
    if (!lessonId) return
    repo.getLessonContent(lessonId).then((c) => {
      if (!c) return
      setDraft({
        lesson: c.lesson,
        segments: c.segments.map(({ lesson_id: _l, ...s }) => s),
        references: c.references,
        questions: c.questions.map(({ lesson_id: _l, ...q }) => q),
      })
    })
  }, [lessonId])

  if (!draft) return <PageLoader />

  const setLesson = (patch: Partial<DraftLesson['lesson']>) => setDraft({ ...draft, lesson: { ...draft.lesson, ...patch } })
  const move = <T,>(arr: T[], i: number, d: number) => {
    const next = [...arr]
    const j = i + d
    if (j < 0 || j >= next.length) return arr
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  }

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const id = await repo.saveLesson(draft)
      await onSaved(id)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <EditorHeader title={lessonId ? 'Edit lesson' : 'New lesson'} subtitle={`${course.title} · ${module.title}`}>
          <Button variant="brand" onClick={() => setAiOpen(true)}>
            <WandSparkles className="size-4" /> Draft with AI
          </Button>
          {lessonId && (
            <Button
              variant="danger"
              onClick={async () => {
                if (!confirm('Delete this lesson?')) return
                await repo.deleteLesson(lessonId)
                await onSaved(null)
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button onClick={save} loading={busy} disabled={!draft.lesson.title.trim()}>
            <Save className="size-4" /> Save lesson
          </Button>
        </EditorHeader>
        <ErrorNote>{error}</ErrorNote>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <Label>Title</Label>
            <Input value={draft.lesson.title} onChange={(e) => setLesson({ title: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <Label>Short description</Label>
            <Input value={draft.lesson.description} onChange={(e) => setLesson({ description: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <Label hint="One per line">Learning objectives</Label>
            <Textarea
              value={draft.lesson.objectives.join('\n')}
              onChange={(e) => setLesson({ objectives: e.target.value.split('\n') })}
              onBlur={() => setLesson({ objectives: draft.lesson.objectives.map((o) => o.trim()).filter(Boolean) })}
            />
          </label>
          <label className="block">
            <Label>Minutes</Label>
            <Input type="number" value={draft.lesson.est_minutes} onChange={(e) => setLesson({ est_minutes: Number(e.target.value) })} />
          </label>
          <label className="block">
            <Label hint="Position in module">Order</Label>
            <Input type="number" value={draft.lesson.order_index} onChange={(e) => setLesson({ order_index: Number(e.target.value) })} />
          </label>
          <Toggle label="Published (visible to students)" checked={draft.lesson.published} onChange={(v) => setLesson({ published: v })} />
        </div>
      </Card>

      <Card>
        <EditorHeader title="Recorded segments" subtitle="Played in order. Check-in points pause to ask the student if they understood.">
          <Button
            variant="outline"
            onClick={() =>
              setDraft({
                ...draft,
                segments: [...draft.segments, { kind: 'teaching', title: '', content: '', audio_url: null, checkpoint: true, order_index: draft.segments.length }],
              })
            }
          >
            <Plus className="size-4" /> Segment
          </Button>
        </EditorHeader>
        <div className="space-y-3">
          {draft.segments.map((s, i) => {
            const update = (patch: Partial<typeof s>) => setDraft({ ...draft, segments: draft.segments.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
            return (
              <div key={s.id ?? `new-${i}`} className="rounded-2xl border border-dashed border-dash p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-soft text-xs font-semibold">{i + 1}</span>
                  <Select value={s.kind} onChange={(e) => update({ kind: e.target.value as SegmentKind })} className="h-9 w-32">
                    {(['intro', 'teaching', 'example', 'story', 'summary'] as const).map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </Select>
                  <Input value={s.title} onChange={(e) => update({ title: e.target.value })} placeholder="Segment title" className="h-9 min-w-40 flex-1" />
                  <RowActions
                    onUp={() => setDraft({ ...draft, segments: move(draft.segments, i, -1) })}
                    onDown={() => setDraft({ ...draft, segments: move(draft.segments, i, 1) })}
                    onDelete={() => setDraft({ ...draft, segments: draft.segments.filter((_, k) => k !== i) })}
                  />
                </div>
                <Textarea className="mt-3 min-h-28" value={s.content} onChange={(e) => update({ content: e.target.value })} placeholder="What the teacher says in this segment…" />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.checkpoint} onChange={(e) => update({ checkpoint: e.target.checked })} className="size-4 accent-ink" />
                    Check-in after this segment
                  </label>
                  <Input
                    value={s.audio_url ?? ''}
                    onChange={(e) => update({ audio_url: e.target.value || null })}
                    placeholder="Recorded audio URL (optional)"
                    className="h-9 min-w-56 flex-1"
                  />
                  {canGenerateAudio && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9"
                      disabled={!s.id || !s.content.trim()}
                      title={s.id ? 'Generate narration with the AI voice' : 'Save the lesson first'}
                      loading={audioBusy === i}
                      onClick={async () => {
                        setAudioBusy(i)
                        setError('')
                        try {
                          const url = await generateSegmentAudio(s.id!, `${s.title}. ${s.content}`)
                          update({ audio_url: url })
                        } catch (e) {
                          setError(errorMessage(e))
                        } finally {
                          setAudioBusy(null)
                        }
                      }}
                    >
                      <Volume2 className="size-3.5" /> Generate audio
                    </Button>
                  )}
                  {s.audio_url && <audio src={s.audio_url} controls className="h-9" />}
                </div>
              </div>
            )
          })}
          {draft.segments.length === 0 && <p className="text-sm text-muted">No segments yet — add one or draft the lesson with AI.</p>}
        </div>
      </Card>

      <Card>
        <EditorHeader title="References" subtitle="Shown to students as the sources of this lesson.">
          <Button
            variant="outline"
            onClick={() => setDraft({ ...draft, references: [...draft.references, { source_type: 'quran', citation: '', text: '', arabic: null, url: null }] })}
          >
            <Plus className="size-4" /> Reference
          </Button>
        </EditorHeader>
        <div className="space-y-3">
          {draft.references.map((r, i) => {
            const update = (patch: Partial<typeof r>) => setDraft({ ...draft, references: draft.references.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
            return (
              <div key={r.id ?? `new-${i}`} className="grid gap-2 rounded-2xl border border-dashed border-dash p-4 sm:grid-cols-[140px_1fr_auto]">
                <Select value={r.source_type} onChange={(e) => update({ source_type: e.target.value as SourceType })} className="h-9">
                  {(['quran', 'hadith', 'tafsir', 'book'] as const).map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </Select>
                <Input value={r.citation} onChange={(e) => update({ citation: e.target.value })} placeholder="e.g. Quran 2:255 or Sahih al-Bukhari 8" className="h-9" />
                <RowActions onDelete={() => setDraft({ ...draft, references: draft.references.filter((_, k) => k !== i) })} />
                <Textarea value={r.text} onChange={(e) => update({ text: e.target.value })} placeholder="Translation / quote" className="min-h-16 sm:col-span-3" />
                <Input value={r.arabic ?? ''} onChange={(e) => update({ arabic: e.target.value || null })} placeholder="Arabic (optional)" className="arabic h-9 sm:col-span-1" dir="rtl" />
                <Input value={r.url ?? ''} onChange={(e) => update({ url: e.target.value || null })} placeholder="https://quran.com/2/255" className="h-9 sm:col-span-2" />
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <EditorHeader title="Quiz" subtitle="Asked one by one after the lesson. Reflection questions get feedback but no score.">
          <Button
            variant="outline"
            onClick={() =>
              setDraft({
                ...draft,
                questions: [...draft.questions, { type: 'mcq', prompt: '', options: ['', '', '', ''], correct_answer: '', explanation: '', topic: '', order_index: draft.questions.length }],
              })
            }
          >
            <Plus className="size-4" /> Question
          </Button>
        </EditorHeader>
        <div className="space-y-3">
          {draft.questions.map((q, i) => {
            const update = (patch: Partial<typeof q>) => setDraft({ ...draft, questions: draft.questions.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
            const hasOptions = q.type === 'mcq' || q.type === 'true_false'
            return (
              <div key={q.id ?? `new-${i}`} className="rounded-2xl border border-dashed border-dash p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-soft text-xs font-semibold">{i + 1}</span>
                  <Select
                    value={q.type}
                    onChange={(e) => {
                      const type = e.target.value as QuestionType
                      update({ type, options: type === 'true_false' ? ['True', 'False'] : type === 'mcq' ? (q.options.length ? q.options : ['', '', '', '']) : [] })
                    }}
                    className="h-9 w-40"
                  >
                    <option value="mcq">Multiple choice</option>
                    <option value="true_false">True / false</option>
                    <option value="short_answer">Short answer</option>
                    <option value="reflection">Reflection</option>
                  </Select>
                  <Input value={q.topic} onChange={(e) => update({ topic: e.target.value })} placeholder="Topic (for weak-area tracking)" className="h-9 min-w-40 flex-1" />
                  <RowActions
                    onUp={() => setDraft({ ...draft, questions: move(draft.questions, i, -1) })}
                    onDown={() => setDraft({ ...draft, questions: move(draft.questions, i, 1) })}
                    onDelete={() => setDraft({ ...draft, questions: draft.questions.filter((_, k) => k !== i) })}
                  />
                </div>
                <Input value={q.prompt} onChange={(e) => update({ prompt: e.target.value })} placeholder="Question" className="mt-3" />
                {q.type === 'mcq' && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {q.options.map((o, k) => (
                      <Input
                        key={k}
                        value={o}
                        onChange={(e) => update({ options: q.options.map((x, j) => (j === k ? e.target.value : x)) })}
                        placeholder={`Option ${String.fromCharCode(65 + k)}`}
                        className="h-9"
                      />
                    ))}
                  </div>
                )}
                {q.type !== 'reflection' && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {hasOptions ? (
                      <Select value={q.correct_answer} onChange={(e) => update({ correct_answer: e.target.value })} className="h-9">
                        <option value="">Correct answer…</option>
                        {q.options.filter(Boolean).map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </Select>
                    ) : (
                      <Input value={q.correct_answer} onChange={(e) => update({ correct_answer: e.target.value })} placeholder="Model answer" className="h-9" />
                    )}
                    <Input value={q.explanation} onChange={(e) => update({ explanation: e.target.value })} placeholder="Explanation shown when missed" className="h-9" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {aiOpen && (
        <AiDraftDialog
          course={course}
          module={module}
          initialTitle={draft.lesson.title}
          onClose={() => setAiOpen(false)}
          onDraft={(d) => {
            setDraft({
              lesson: { ...draft.lesson, ...d.lesson },
              segments: d.segments,
              references: d.references,
              questions: d.questions,
            })
            setAiOpen(false)
          }}
        />
      )}
    </div>
  )
}

function AiDraftDialog({
  course,
  module,
  initialTitle,
  onClose,
  onDraft,
}: {
  course: Course
  module: Module
  initialTitle: string
  onClose: () => void
  onDraft: (d: Awaited<ReturnType<typeof ai.generateLesson>>) => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [notes, setNotes] = useState('')
  const [level, setLevel] = useState('adult')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Draft a lesson with AI</h2>
          <p className="text-sm text-muted">
            {course.title} · {module.title}
          </p>
        </div>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
          <X className="size-5" />
        </button>
      </div>
      <div className="mt-5 space-y-4">
        <label className="block">
          <Label>Lesson title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Belief in the Books" />
        </label>
        <label className="block">
          <Label hint="Optional">Key points, sources to use, things to avoid</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label className="block">
          <Label>Written for</Label>
          <Select value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </label>
        <p className="rounded-xl bg-warn-soft p-3 text-xs text-warn">
          AI drafts must be reviewed by a qualified teacher before publishing — check every reference and ruling.
        </p>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="brand"
            loading={busy}
            disabled={!title.trim()}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                const d = await ai.generateLesson({ courseTitle: course.title, moduleTitle: module.title, title, notes, level })
                onDraft(d)
              } catch (e) {
                setError(errorMessage(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            <WandSparkles className="size-4" /> Generate draft
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function RowActions({ onUp, onDown, onDelete }: { onUp?: () => void; onDown?: () => void; onDelete: () => void }) {
  const cls = 'grid size-8 place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink'
  return (
    <div className="flex items-center">
      {onUp && (
        <button onClick={onUp} className={cls} aria-label="Move up">
          <ArrowUp className="size-4" />
        </button>
      )}
      {onDown && (
        <button onClick={onDown} className={cls} aria-label="Move down">
          <ArrowDown className="size-4" />
        </button>
      )}
      <button onClick={onDelete} className={cn(cls, 'hover:bg-danger-soft hover:text-danger')} aria-label="Delete">
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 self-end pb-2.5 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 rounded-full transition', checked ? 'bg-ink' : 'bg-line')}
      >
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px] bg-lime' : 'left-0.5')} />
      </button>
      {label}
    </label>
  )
}

