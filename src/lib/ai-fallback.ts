/**
 * Offline teacher used in demo mode or when the AI service is unreachable.
 * It is deliberately simple: keyword intent detection and retrieval from the
 * curriculum's own narration and references — it never invents sources.
 */
import type { AnswerResult, ConverseResult, ExplainMode, Intent, LearnerCtx, LessonCtx, QuizEvaluation, QuizItem, Stage, Turn } from './ai'
import { CURRICULUM } from './curriculum'
import { teacherLines } from './teacher-lines'
import type { DraftLesson, Reference } from './types'
import { normalize } from './utils'

// ───────────── intent detection (English, Bangla, Banglish) ─────────────
const bnWord = (w: string) => new RegExp(`(^|[\\s,.!?।])${w}($|[\\s,.!?।])`)
const CONFUSED =
  /(don'?t|do not|didn'?t|did not|can'?t|cannot) (get|understand|follow)|confus|unclear|not clear|lost|repeat|bujh(i|lam)? ?(na|nai|ni)|bujhini|বুঝি নাই|বুঝিনি|বুঝলাম না|বুঝতে পারিনি|বুঝতে পারছি না|বুঝি না/i
const QUESTION =
  /\?|^(what|why|how|who|when|where|which|is|are|can|could|does|do|should|explain|tell me|ki|keno|kivabe|kothay|kobe|ke)\b|কী|কেন|কিভাবে|কীভাবে|কোথায়|কখন|কারা/i
const DECLINE = /\b(no|nope|not|later|wait|nah|na|nai)\b/i
const AFFIRM =
  /\b(yes|yeah|yep|yup|ok|okay|sure|ready|start|go|continue|carry on|fine|good|great|well|alhamdulillah|ha+|haan|ji+|jee|thik|done|got it|understood|clear)\b|হ্যাঁ|হ্যা|জি|ঠিক আছে|প্রস্তুত|চালিয়ে|ভালো|আলহামদুলিল্লাহ|বুঝেছি/i

export function detectIntent(message: string): Intent {
  const m = message.trim()
  if (CONFUSED.test(m)) return 'confused'
  if (QUESTION.test(m) && m.split(/\s+/).length > 2) return 'question'
  if (DECLINE.test(m) || bnWord('না').test(m) || /এখনো না|পরে/.test(m)) return 'decline'
  if (AFFIRM.test(m)) return 'affirm'
  if (QUESTION.test(m)) return 'question'
  return 'other'
}

// ───────────── retrieval over the curriculum ─────────────
const STOP = new Set(
  'the a an and or of to in on for is are was were be been what why how who when where which does do did can could should would about tell me please explain this that with from your you i my it its as at by his her their them they we our us not no yes'.split(
    ' ',
  ),
)
const SYNONYMS: Record<string, string> = {
  namaz: 'prayer salah', namaj: 'prayer salah', salat: 'salah prayer', pray: 'prayer salah', praying: 'prayer salah',
  wazu: 'wudu', wuzu: 'wudu', oju: 'wudu', ozu: 'wudu', ablution: 'wudu',
  god: 'allah', khuda: 'allah', prophet: 'prophet muhammad', nabi: 'prophet', rasul: 'messenger prophet',
  angel: 'angels', firishta: 'angels', feresta: 'angels', faith: 'iman', belief: 'iman',
  নামাজ: 'prayer salah', নামায: 'prayer salah', অজু: 'wudu', ওজু: 'wudu', আল্লাহ: 'allah', নবী: 'prophet',
  ফেরেশতা: 'angels', ঈমান: 'iman', তাওহীদ: 'tawhid', কুরআন: 'quran',
}

function tokens(s: string): string[] {
  const out: string[] = []
  for (const w of normalize(s).split(' ')) {
    if (w.length < 3 || STOP.has(w)) continue
    const expanded = SYNONYMS[w]
    if (expanded) out.push(...expanded.split(' '))
    out.push(w.replace(/(ies|es|s)$/, ''))
  }
  return out
}

interface Doc {
  lessonTitle: string
  text: string
  references: Reference[]
}

const CORPUS: Doc[] = CURRICULUM.flatMap((c) =>
  c.modules.flatMap((m) =>
    m.lessons.flatMap((l) => l.segments.map((s) => ({ lessonTitle: l.title, text: `${s.title}. ${s.content}`, references: l.references }))),
  ),
)

function overlap(q: string[], text: string) {
  const t = new Set(tokens(text))
  return q.reduce((n, w) => n + (t.has(w) ? 1 : 0), 0)
}

function bestSentences(q: string[], text: string, n = 3) {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const scored = sentences.map((s, i) => ({ s, i, score: overlap(q, s) }))
  const relevant = scored.filter((x) => x.score > 0)
  return (relevant.length ? relevant : scored)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, n)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)
    .join(' ')
}

function retrieve(question: string, lesson?: LessonCtx): AnswerResult {
  const q = tokens(question)
  const docs: Doc[] = [
    ...(lesson?.transcript ? [{ lessonTitle: lesson.title, text: lesson.transcript, references: lesson.references ?? [] }] : []),
    ...CORPUS,
  ]
  const ranked = docs.map((d) => ({ d, score: overlap(q, d.text) })).sort((a, b) => b.score - a.score)
  const best = ranked[0]
  if (!best || best.score === 0) {
    return {
      answer:
        "That's a good question, but it isn't covered in my lesson notes yet. Please ask a qualified local scholar or imam, and I'll be able to answer more once the full AI teacher is connected.",
      references: [],
    }
  }
  const refs = best.d.references
    .map((r) => ({ r, score: overlap(q, `${r.citation} ${r.text}`) + overlap(tokens(best.d.text), r.text) / 10 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.r)
  return {
    answer: `From our lesson “${best.d.lessonTitle}”: ${bestSentences(q, best.d.text)}`,
    references: refs,
  }
}

// ───────────── public fallbacks ─────────────
export function converse(args: { learner: LearnerCtx; stage: Stage; message: string; history: Turn[]; lesson?: LessonCtx }): ConverseResult {
  const intent = detectIntent(args.message)
  if (intent === 'question') {
    const a = retrieve(args.message, args.lesson)
    return { intent, reply: a.answer, references: a.references }
  }
  const reply = args.stage === 'greeting' && intent !== 'decline' ? teacherLines(args.learner.language).greetReply : ''
  return { intent, reply, references: [] }
}

export function answer(args: { question: string; lesson?: LessonCtx }): AnswerResult {
  return retrieve(args.question, args.lesson)
}

export function explain(args: { mode: ExplainMode; text: string; lesson: LessonCtx }) {
  const sentences = args.text.split(/(?<=[.!?])\s+/).filter(Boolean)
  const key = sentences.slice(0, 2).join(' ')
  const last = sentences[sentences.length - 1] ?? ''
  const byMode: Record<ExplainMode, string> = {
    simple: `In simple words: ${key}`,
    child: `Let's make it easy! ${sentences[0] ?? ''} Think of it like this — ${last}`,
    analogy: `Here's a way to picture it: just as a building needs a strong foundation before anything else, ${key.charAt(0).toLowerCase()}${key.slice(1)}`,
    example: `An example from daily life: ${last}`,
    summary: `The key idea: ${sentences[0] ?? ''} ${last}`,
    translate: `The main point (full translation needs the AI teacher to be connected): ${key}`,
  }
  return { explanation: byMode[args.mode] }
}

export function review(args: { items: Array<{ prompt: string; correct_answer: string; explanation: string }> }) {
  const script = args.items
    .map((i) => `The question was: “${i.prompt}” The answer is: ${i.correct_answer}. ${i.explanation}`)
    .join(' ')
  return { script: `${script} Try to remember this key point — it will help you in today's lesson.` }
}

export function evaluateQuiz(args: { items: QuizItem[] }): QuizEvaluation {
  const results = args.items.map((item) => {
    if (item.type === 'reflection') {
      return {
        index: item.index,
        correct: null,
        feedback: 'Beautiful reflection — JazakAllahu khairan. Try to act on it this week, in shaa Allah.',
      }
    }
    let correct: boolean
    if (typeof item.auto_correct === 'boolean') correct = item.auto_correct
    else {
      const expected = tokens(item.correct_answer)
      const given = new Set(tokens(item.student_answer))
      const hits = expected.filter((w) => given.has(w)).length
      const numbersMatch =
        /\d+/.test(item.correct_answer) && item.correct_answer.match(/\d+/)?.[0] === item.student_answer.match(/\d+/)?.[0]
      correct = numbersMatch || (expected.length > 0 && hits / expected.length >= 0.4)
    }
    return {
      index: item.index,
      correct,
      feedback: correct ? 'Correct — well done!' : `Not quite. The answer is: ${item.correct_answer}`,
    }
  })
  const wrong = args.items.filter((i) => results.find((r) => r.index === i.index)?.correct === false)
  return {
    results,
    summary: wrong.length ? 'You have a good grasp of most of the lesson.' : 'You understood this lesson very well.',
    improvement_areas: [...new Set(wrong.map((w) => w.topic))],
    recommendations: wrong.length ? ['Replay the summary segment of this lesson', 'Review the missed questions tomorrow'] : [],
  }
}

export function generateLesson(args: { title: string; notes: string; courseTitle: string }) {
  const draft: Omit<DraftLesson, 'lesson'> & { lesson: Pick<DraftLesson['lesson'], 'title' | 'description' | 'objectives' | 'est_minutes'> } = {
    lesson: {
      title: args.title,
      description: `An introduction to ${args.title} (${args.courseTitle}).`,
      objectives: [`Understand the meaning of ${args.title}`, 'Connect it to daily life', 'Know the key sources'],
      est_minutes: 10,
    },
    segments: [
      { kind: 'intro', title: 'Welcome', content: `Bismillah. Today we learn about ${args.title}. ${args.notes}`.trim(), audio_url: null, checkpoint: true, order_index: 0 },
      { kind: 'teaching', title: 'Main lesson', content: 'Write the main teaching here.', audio_url: null, checkpoint: true, order_index: 1 },
      { kind: 'summary', title: 'Summary', content: 'Summarise the key points here.', audio_url: null, checkpoint: false, order_index: 2 },
    ],
    references: [],
    questions: [
      { type: 'mcq', prompt: `Which statement about ${args.title} is correct?`, options: ['Option A', 'Option B', 'Option C', 'Option D'], correct_answer: 'Option A', explanation: '', topic: args.title, order_index: 0 },
      { type: 'reflection', prompt: `How will you apply what you learned about ${args.title}?`, options: [], correct_answer: '', explanation: '', topic: args.title, order_index: 1 },
    ],
  }
  return draft
}
