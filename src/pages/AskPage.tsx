import { MessageCircleQuestion, Mic, Send, Sparkles, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ReferenceChips, ReferenceDrawer } from '../components/References'
import { Button, Card, EmptyState, Pill } from '../components/ui'
import { ai, learnerCtx, type Turn } from '../lib/ai'
import { useAuth } from '../lib/auth'
import { formatDay } from '../lib/clock'
import { useData } from '../lib/data'
import { repo } from '../lib/repo'
import { useSpeechInput } from '../lib/speech-input'
import type { Reference } from '../lib/types'
import { cn, uid } from '../lib/utils'
import { TeacherAvatar, Typing } from './classroom/Messages'

interface ChatMsg {
  id: string
  role: 'teacher' | 'student'
  text: string
  references?: Reference[]
  offline?: boolean
}

const SUGGESTIONS = [
  'What is Salah and why is it important?',
  'What does Bismillah mean?',
  'Who was Khadijah?',
  'What are the five pillars of Islam?',
  'Why do Muslims fast in Ramadan?',
]

export function AskPage() {
  const { profile } = useAuth()
  const { state, refresh } = useData()
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [openRef, setOpenRef] = useState<Reference | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  const speech = useSpeechInput(profile?.language ?? 'en', (t, final) => {
    setText(t)
    if (final && t.trim()) void ask(t)
  })

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [msgs.length, thinking])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || thinking || !profile) return
    setText('')
    const history: Turn[] = msgs.slice(-8).map((m) => ({ role: m.role, text: m.text }))
    setMsgs((m) => [...m, { id: uid(), role: 'student', text: q }])
    setThinking(true)
    try {
      const r = await ai.answer({ learner: learnerCtx(profile), question: q, history })
      setMsgs((m) => [...m, { id: uid(), role: 'teacher', text: r.answer, references: r.references, offline: r.offline }])
      await repo.saveQuestion({ user_id: profile.id, lesson_id: null, question: q, answer: r.answer, references: r.references })
      void refresh()
    } finally {
      setThinking(false)
    }
  }

  const past = [...state.questions].reverse()

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex h-[calc(100vh-8rem)] min-h-[560px] flex-col rounded-[24px] bg-white">
        <div className="flex items-center justify-between border-b border-dashed border-dash p-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Ask the Teacher</h1>
            <p className="text-sm text-muted">Answers cite the Quran, authentic Hadith and recognised scholarship.</p>
          </div>
          <Pill tone="brand">
            <Sparkles className="size-3.5" /> AI teacher
          </Pill>
        </div>

        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-5 scroll-thin">
          {msgs.length === 0 && (
            <div className="mx-auto max-w-lg py-8 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-lime">
                <MessageCircleQuestion className="size-5" />
              </span>
              <p className="mt-3 font-medium">What would you like to learn?</p>
              <p className="text-sm text-muted">Ask in any language — the teacher replies in yours.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-full border border-line px-3.5 py-1.5 text-sm hover:border-ink hover:bg-soft">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m) =>
            m.role === 'student' ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-ink px-4 py-2.5 text-[15px] text-white">{m.text}</div>
              </div>
            ) : (
              <div key={m.id} className="flex animate-rise gap-3">
                <TeacherAvatar />
                <div className="max-w-[85%] min-w-0">
                  <div className="rounded-2xl rounded-tl-md bg-soft px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">{m.text}</div>
                  {m.references && m.references.length > 0 && (
                    <div className="mt-2">
                      <p className="mb-1.5 text-xs text-muted">Sources — tap to read</p>
                      <ReferenceChips refs={m.references} onOpen={setOpenRef} />
                    </div>
                  )}
                  {m.offline && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-subtle">
                      <WifiOff className="size-3" /> Offline teacher — answers come from the lesson notes only
                    </p>
                  )}
                </div>
              </div>
            ),
          )}
          {thinking && <Typing />}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void ask(text)
          }}
          className="flex gap-2 border-t border-dashed border-dash p-4"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask anything about Islam…"
            className="h-11 flex-1 rounded-xl border border-line bg-soft px-3.5 text-[15px] outline-none focus:border-brand focus:bg-white"
          />
          {speech.supported && (
            <button
              type="button"
              onClick={speech.listening ? speech.stop : speech.start}
              className={cn('grid size-11 place-items-center rounded-xl border', speech.listening ? 'animate-pulse border-danger bg-danger-soft text-danger' : 'border-line hover:bg-soft')}
              aria-label="Speak your question"
            >
              <Mic className="size-4" />
            </button>
          )}
          <Button type="submit" className="size-11 px-0" disabled={!text.trim() || thinking} aria-label="Send">
            <Send className="size-4" />
          </Button>
        </form>
      </section>

      <Card className="h-fit">
        <h2 className="font-semibold">Your questions</h2>
        <p className="text-sm text-muted">{state.questions.length} asked so far</p>
        <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto scroll-thin">
          {past.length === 0 ? (
            <EmptyState icon={<MessageCircleQuestion className="size-5" />} title="No questions yet" body="Questions from lessons and this page appear here." />
          ) : (
            past.slice(0, 30).map((q) => (
              <button
                key={q.id}
                onClick={() =>
                  setMsgs((m) => [
                    ...m,
                    { id: uid(), role: 'student', text: q.question },
                    { id: uid(), role: 'teacher', text: q.answer, references: q.references },
                  ])
                }
                className="block w-full rounded-2xl border border-dashed border-dash p-3 text-left hover:bg-soft"
              >
                <p className="line-clamp-2 text-sm font-medium">{q.question}</p>
                <p className="mt-1 text-xs text-muted">{formatDay(q.created_at, { day: 'numeric', month: 'short' })}</p>
              </button>
            ))
          )}
        </div>
        <p className="mt-4 rounded-xl bg-soft p-3 text-xs text-muted">
          For personal rulings (fatwa) — marriage, inheritance, medical or family matters — please consult a qualified local scholar.
        </p>
      </Card>

      {openRef && <ReferenceDrawer reference={openRef} onClose={() => setOpenRef(null)} />}
    </div>
  )
}
