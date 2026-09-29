import { ArrowLeft, ArrowRight, CircleCheck, CircleX, ClipboardCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button, buttonClasses, Card, PageLoader, Pill, ProgressBar, Textarea } from '../components/ui'
import { ai, learnerCtx, type QuizEvaluation } from '../lib/ai'
import { useAuth } from '../lib/auth'
import { dayKey } from '../lib/clock'
import { useData } from '../lib/data'
import { moduleComplete } from '../lib/progress'
import { repo } from '../lib/repo'
import type { QuizQuestion } from '../lib/types'
import { cn, normalize, pct } from '../lib/utils'

const MAX_QUESTIONS = 10

export function AssessmentPage() {
  const { moduleId = '' } = useParams()
  const { profile } = useAuth()
  const { catalog, state, refresh } = useData()
  const mod = catalog.modules.find((m) => m.id === moduleId)
  const course = catalog.courses.find((c) => c.id === mod?.course_id)

  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null)
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [result, setResult] = useState<{ ev: QuizEvaluation; correct: boolean[]; score: number } | null>(null)
  const [grading, setGrading] = useState(false)
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    repo.getModuleQuestions(moduleId).then((qs) => {
      const pool = qs.filter((q) => q.type !== 'reflection').sort(() => Math.random() - 0.5)
      setQuestions(pool.slice(0, MAX_QUESTIONS))
    })
  }, [moduleId])

  if (!profile || !questions) return <PageLoader />
  if (!mod || !course || !moduleComplete(catalog, state.progress, mod.id)) {
    return (
      <div className="grid min-h-screen place-items-center p-5">
        <Card className="max-w-md text-center">
          <p className="text-sm text-muted">Complete every lesson in this module to unlock its assessment.</p>
          <Link to={course ? `/courses/${course.id}` : '/courses'} className={buttonClasses('primary', 'md', 'mt-4')}>
            Back to course
          </Link>
        </Card>
      </div>
    )
  }

  const q = questions[i]
  const choose = (value: string) => {
    const next = { ...answers, [q.id]: value }
    setAnswers(next)
    setDraft('')
    if (i + 1 < questions.length) setI(i + 1)
    else void grade(next)
  }

  const grade = async (all: Record<string, string>) => {
    setGrading(true)
    const items = questions.map((qq, index) => {
      const student_answer = all[qq.id] ?? ''
      return {
        index,
        type: qq.type,
        prompt: qq.prompt,
        options: qq.options,
        correct_answer: qq.correct_answer,
        student_answer,
        topic: qq.topic,
        auto_correct: qq.type === 'short_answer' ? null : normalize(student_answer) === normalize(qq.correct_answer),
      }
    })
    const ev = await ai.evaluateQuiz({ learner: learnerCtx(profile), lesson: { title: mod.title, objectives: [mod.description] }, items })
    const correct = items.map((it) => (typeof it.auto_correct === 'boolean' ? it.auto_correct : !!ev.results.find((r) => r.index === it.index)?.correct))
    const score = correct.filter(Boolean).length
    try {
      await repo.saveQuizAttempt({
        user_id: profile.id,
        lesson_id: null,
        module_id: mod.id,
        kind: 'assessment',
        answers: questions.map((qq, k) => ({ question_id: qq.id, answer: all[qq.id] ?? '', correct: correct[k] })),
        score,
        total: questions.length,
        feedback: ev.summary,
      })
      await repo.addMissed(
        questions
          .filter((_, k) => !correct[k])
          .map((qq) => ({
            user_id: profile.id,
            course_id: course.id,
            lesson_id: qq.lesson_id,
            question_id: qq.id,
            topic: qq.topic,
            prompt: qq.prompt,
            correct_answer: qq.correct_answer,
            explanation: qq.explanation,
          })),
      )
      await repo.logActivity(profile.id, dayKey(), Math.max(1, Math.round((Date.now() - startedAt) / 60000)), 0)
      await refresh()
    } catch (e) {
      console.error(e)
    }
    setResult({ ev, correct, score })
    setGrading(false)
  }

  return (
    <div className="min-h-screen p-3 sm:p-5">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link to={`/courses/${course.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> {course.title}
        </Link>
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-lime">
              <ClipboardCheck className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted uppercase">End of module assessment</p>
              <h1 className="text-lg font-semibold">{mod.title}</h1>
            </div>
          </div>

          {!result && q && (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs text-muted">
                <span>
                  Question {i + 1} of {questions.length}
                </span>
                <span>{q.topic}</span>
              </div>
              <ProgressBar value={pct(i, questions.length)} />
              <p className="mt-6 text-lg font-medium">{q.prompt}</p>
              {q.type === 'short_answer' ? (
                <div className="mt-4 space-y-3">
                  <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Your answer…" />
                  <Button onClick={() => choose(draft.trim())} disabled={!draft.trim() || grading} loading={grading}>
                    Next <ArrowRight className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {q.options.map((o) => (
                    <button
                      key={o}
                      disabled={grading}
                      onClick={() => choose(o)}
                      className="rounded-xl border border-line px-4 py-3 text-left text-sm transition hover:border-ink hover:bg-soft disabled:opacity-50"
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
              {grading && <p className="mt-4 text-sm text-muted">Your teacher is reviewing your answers…</p>}
            </div>
          )}

          {!result && !q && <p className="mt-6 text-sm text-muted">This module has no assessment questions yet.</p>}

          {result && (
            <div className="mt-6">
              <div className="rounded-2xl bg-ink p-5 text-white">
                <p className="text-sm text-white/60">Your score</p>
                <p className="text-5xl font-semibold text-lime">
                  {result.score}
                  <span className="text-2xl text-white/50">/{questions.length}</span>
                </p>
                <p className="mt-2 text-sm text-white/80">{result.ev.summary}</p>
              </div>
              <ul className="mt-4 space-y-2">
                {questions.map((qq, k) => (
                  <li key={qq.id} className={cn('flex gap-3 rounded-2xl border border-dashed border-dash p-3')}>
                    {result.correct[k] ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-ok" /> : <CircleX className="mt-0.5 size-4 shrink-0 text-danger" />}
                    <div className="text-sm">
                      <p className="font-medium">{qq.prompt}</p>
                      <p className="text-muted">Your answer: {answers[qq.id] || '—'}</p>
                      {!result.correct[k] && <p className="mt-1">Correct: {qq.correct_answer}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              {result.ev.improvement_areas.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {result.ev.improvement_areas.map((a) => (
                    <Pill key={a} tone="warn">
                      {a}
                    </Pill>
                  ))}
                </div>
              )}
              <div className="mt-5 flex gap-2">
                <Link to="/revision" className={buttonClasses('primary')}>
                  Go to revision
                </Link>
                <Link to={`/courses/${course.id}`} className={buttonClasses('outline')}>
                  Back to course
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
