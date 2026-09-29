import { Check, Lightbulb, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, CourseBadge, EmptyState, Input, Pill, SectionTitle } from '../components/ui'
import { ai, learnerCtx } from '../lib/ai'
import { useAuth } from '../lib/auth'
import { formatDay } from '../lib/clock'
import { useData } from '../lib/data'
import { weakTopics } from '../lib/progress'
import { repo } from '../lib/repo'
import type { MissedQuestion } from '../lib/types'

export function RevisionPage() {
  const { catalog, state } = useData()
  const topics = weakTopics(state)
  const reviewed = state.missed.filter((m) => m.reviewed_at).length

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <SectionTitle
          title="Revision"
          subtitle="Questions you missed, grouped by topic. Your teacher also reviews them at the start of your next lesson."
        />
        {topics.length === 0 ? (
          <EmptyState
            icon={<Check className="size-5" />}
            title="Nothing to revise"
            body="You've reviewed everything you missed. Keep going with your daily lessons!"
          />
        ) : (
          <div className="space-y-5">
            {topics.map((t) => {
              const course = catalog.courses.find((c) => c.id === t.courseId)
              const lesson = catalog.lessons.find((l) => l.id === t.lessonId)
              return (
                <section key={t.topic + t.courseId}>
                  <div className="mb-2 flex items-center gap-2">
                    {course && <CourseBadge title={course.title} color={course.color} className="size-6 text-[9px]" />}
                    <h3 className="font-semibold">{t.topic}</h3>
                    <span className="text-xs text-muted">· {lesson?.title}</span>
                  </div>
                  <div className="space-y-2">
                    {t.items.map((m) => (
                      <MissedCard key={m.id} item={m} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </Card>

      <div className="space-y-5">
        <div className="rounded-[24px] bg-brand p-6 text-white">
          <Pill tone="lime">
            <Sparkles className="size-3.5" /> How revision works
          </Pill>
          <ol className="mt-4 space-y-3 text-sm text-white/80">
            <li>1 · Every missed quiz question is saved here.</li>
            <li>2 · The next day, your teacher re-explains it in about 30 seconds before the new lesson.</li>
            <li>3 · Answer it correctly here to clear it from your weak areas.</li>
          </ol>
        </div>
        <Card>
          <p className="text-sm text-muted">Reviewed so far</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight">{reviewed}</p>
          <p className="mt-1 text-sm text-muted">{topics.reduce((n, t) => n + t.items.length, 0)} still waiting</p>
        </Card>
      </div>
    </div>
  )
}

function MissedCard({ item }: { item: MissedQuestion }) {
  const { profile } = useAuth()
  const { refresh } = useData()
  const [explanation, setExplanation] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<'explain' | 'check' | 'done' | null>(null)
  if (!profile) return null

  const explain = async () => {
    setBusy('explain')
    const r = await ai.review({ learner: learnerCtx(profile), items: [item] })
    setExplanation(r.script)
    setBusy(null)
  }

  const markDone = async () => {
    setBusy('done')
    await repo.markReviewed([item.id])
    await refresh()
  }

  const check = async () => {
    setBusy('check')
    const ev = await ai.evaluateQuiz({
      learner: learnerCtx(profile),
      lesson: { title: item.topic, objectives: [] },
      items: [
        {
          index: 0,
          type: 'short_answer',
          prompt: item.prompt,
          options: [],
          correct_answer: item.correct_answer,
          student_answer: answer,
          topic: item.topic,
        },
      ],
    })
    const r = ev.results[0]
    setFeedback({ ok: !!r?.correct, text: r?.feedback ?? '' })
    setBusy(null)
    if (r?.correct) await markDone()
  }

  return (
    <div className="rounded-2xl border border-dashed border-dash p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{item.prompt}</p>
        <span className="shrink-0 text-xs text-muted">{formatDay(item.created_at, { day: 'numeric', month: 'short' })}</span>
      </div>

      {explanation && (
        <div className="mt-3 flex gap-2.5 rounded-xl bg-lilac/60 p-3 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand" />
          {explanation}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Try answering again…" className="h-9 min-w-48 flex-1" />
        <Button size="sm" className="h-9" onClick={check} disabled={!answer.trim()} loading={busy === 'check'}>
          Check
        </Button>
        {!explanation && (
          <Button size="sm" variant="outline" className="h-9" onClick={explain} loading={busy === 'explain'}>
            <RotateCcw className="size-3.5" /> Explain again
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-9" onClick={markDone} loading={busy === 'done'}>
          <Check className="size-3.5" /> I understand now
        </Button>
      </div>
      {feedback && <p className={feedback.ok ? 'mt-2 text-sm text-ok' : 'mt-2 text-sm text-danger'}>{feedback.text}</p>}
    </div>
  )
}
