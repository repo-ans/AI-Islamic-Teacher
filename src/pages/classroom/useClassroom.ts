/**
 * The guided-lesson engine.
 *
 *   greeting → (review of yesterday's missed questions) → recorded segments
 *   with check-ins → feedback & questions → quiz (one question at a time)
 *   → AI evaluation → open Q&A → done (next lesson unlocks tomorrow)
 *
 * The student can "raise hand" during any recorded segment: narration pauses,
 * the AI answers (with sources), then the recording resumes.
 *
 * Flow state lives in refs so async continuations (narration callbacks, AI
 * responses) always see the current phase rather than a stale render.
 */
import { useEffect, useRef, useState } from 'react'
import { ai, learnerCtx, type ExplainMode, type LessonCtx, type QuizItem, type Turn } from '../../lib/ai'
import { dayKey } from '../../lib/clock'
import type { Narrator } from '../../lib/narrator'
import { repo } from '../../lib/repo'
import { linesLang, pick, teacherLines } from '../../lib/teacher-lines'
import type { Course, LessonContent, MissedQuestion, Profile, QuestionType, Reference } from '../../lib/types'
import { normalize, uid } from '../../lib/utils'

export type Phase =
  | 'greeting'
  | 'review'
  | 'segment'
  | 'checkpoint'
  | 'paused'
  | 'asking'
  | 'feedback'
  | 'pre_quiz'
  | 'quiz'
  | 'grading'
  | 'open_qa'
  | 'done'

export interface GradedItem {
  questionId: string
  prompt: string
  type: QuestionType
  topic: string
  answer: string
  correct: boolean | null
  feedback: string
  correct_answer: string
  explanation: string
}

export type Msg =
  | { id: string; kind: 'teacher'; text: string; references?: Reference[]; note?: string; offline?: boolean }
  | { id: string; kind: 'student'; text: string }
  | { id: string; kind: 'segment'; index: number }
  | { id: string; kind: 'quiz'; index: number }
  | {
      id: string
      kind: 'result'
      score: number
      total: number
      graded: GradedItem[]
      summary: string
      improvement_areas: string[]
      recommendations: string[]
    }
  | { id: string; kind: 'done' }

type ChipValue =
  | 'ready'
  | 'not_ready'
  | 'continue'
  | 'confused'
  | 'question'
  | 'no_questions'
  | 'quiz_ready'
  | 'quiz_wait'
  | 'got_it'
  | 'still_confused'
  | 'resume'
  | 'finish'

export interface Chip {
  label: string
  value: ChipValue
}

/** 0 greeting · 1 lesson · 2 discussion · 3 quiz · 4 Q&A */
const STAGE: Record<Phase, number | null> = {
  greeting: 0,
  review: 0,
  segment: 1,
  checkpoint: 1,
  paused: 1,
  asking: null,
  feedback: 2,
  pre_quiz: 2,
  quiz: 3,
  grading: 3,
  open_qa: 4,
  done: 4,
}

export const EXPLAIN_LABEL: Record<ExplainMode, string> = {
  simple: 'Explain simply',
  child: "Like I'm a child",
  analogy: 'With an analogy',
  example: 'Give an example',
  summary: 'Summarise it',
  translate: 'In my language',
}

interface Options {
  content: LessonContent
  course: Course
  profile: Profile
  review: MissedQuestion[]
  narrator: Narrator
  voiceOn: boolean
  alreadyCompleted: boolean
  onSaved: () => void
}

export function useClassroom(opts: Options) {
  const { content, course, profile, narrator } = opts
  const { lesson, segments, questions, references } = content
  const L = teacherLines(profile.language)
  const lineLang = linesLang(profile.language)
  const learner = learnerCtx(profile)

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [chips, setChips] = useState<Chip[]>([])
  const [phase, setPhaseState] = useState<Phase>('greeting')
  const [stage, setStage] = useState(0)
  const [thinking, setThinking] = useState(false)
  const [segIdx, setSegIdx] = useState(-1)
  const [qIdx, setQIdx] = useState(-1)
  const [answered, setAnswered] = useState<Record<string, string>>({})

  const msgsRef = useRef<Msg[]>([])
  const phaseRef = useRef<Phase>('greeting')
  const segRef = useRef(-1)
  const qRef = useRef(-1)
  const answers = useRef(new Map<string, string>())
  const returnTo = useRef<Phase>('checkpoint')
  const cpCount = useRef(0)
  const started = useRef(false)
  const completed = useRef(false)
  const startedAt = useRef(Date.now())
  const shownSegments = useRef(new Set<number>())
  const voiceRef = useRef(opts.voiceOn)
  voiceRef.current = opts.voiceOn

  const chip = {
    ready: { label: L.chips.ready, value: 'ready' },
    notReady: { label: L.chips.notReady, value: 'not_ready' },
    readyNow: { label: L.chips.readyNow, value: 'ready' },
    continue: { label: L.chips.continue, value: 'continue' },
    confused: { label: L.chips.confused, value: 'confused' },
    question: { label: L.chips.question, value: 'question' },
    noQuestions: { label: L.chips.noQuestions, value: 'no_questions' },
    quizReady: { label: L.chips.quizReady, value: 'quiz_ready' },
    quizWait: { label: L.chips.quizWait, value: 'quiz_wait' },
    gotIt: { label: L.chips.gotIt, value: 'got_it' },
    stillConfused: { label: L.chips.stillConfused, value: 'still_confused' },
    resume: { label: L.chips.continue, value: 'resume' },
    anotherQuestion: { label: L.chips.anotherQuestion, value: 'question' },
    yesQuestion: { label: L.chips.yesQuestion, value: 'question' },
    finish: { label: L.chips.finish, value: 'finish' },
  } satisfies Record<string, Chip>

  // ───────────── primitives ─────────────
  const push = (m: Msg) => {
    msgsRef.current = [...msgsRef.current, m]
    setMsgs(msgsRef.current)
  }

  /** Scripted line (already in the learner's language when available). */
  const say = (text: string, extra: { references?: Reference[]; note?: string; offline?: boolean; lang?: string } = {}) => {
    const { lang, ...rest } = extra
    push({ id: uid(), kind: 'teacher', text, ...rest })
    return voiceRef.current ? narrator.speakLine(text, lang ?? lineLang) : Promise.resolve()
  }
  /** AI-generated reply — always in the learner's own language. */
  const sayAI = (text: string, extra: { references?: Reference[]; note?: string; offline?: boolean } = {}) =>
    say(text, { ...extra, lang: profile.language })

  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
    const s = STAGE[p]
    if (s !== null) setStage((cur) => Math.max(cur, s))
  }

  const history = (): Turn[] =>
    msgsRef.current
      .filter((m): m is Extract<Msg, { kind: 'teacher' | 'student' }> => m.kind === 'teacher' || m.kind === 'student')
      .slice(-8)
      .map((m) => ({ role: m.kind, text: m.text }))

  const lessonCtx = (): LessonCtx => ({
    title: lesson.title,
    objectives: lesson.objectives,
    segment: segments[segRef.current]?.content,
    transcript: segments.map((s) => `${s.title}. ${s.content}`).join('\n'),
    references,
  })

  async function thinkingWhile<T>(fn: () => Promise<T>): Promise<T> {
    setThinking(true)
    try {
      return await fn()
    } finally {
      setThinking(false)
    }
  }

  const saveQuestion = (question: string, answer: string, refs: Reference[]) =>
    repo
      .saveQuestion({ user_id: profile.id, lesson_id: lesson.id, question, answer, references: refs })
      .then(opts.onSaved)
      .catch((e) => console.warn('saveQuestion', e))

  // ───────────── greeting & review ─────────────
  const start = () => {
    setPhase('greeting')
    void say(`${L.greeting(learner.name.split(' ')[0] || learner.name)} ${L.askReady(lesson.title)}`)
    setChips([chip.ready, chip.notReady])
  }

  const beginClass = async () => {
    setChips([])
    repo.startLesson(profile.id, lesson).catch((e) => console.warn('startLesson', e))
    await say(L.startLesson)
    if (opts.review.length) await startReview()
    else playSegment(0)
  }

  const startReview = async () => {
    setPhase('review')
    await say(L.reviewIntro(opts.review[0].prompt))
    const r = await thinkingWhile(() =>
      ai.review({
        learner,
        items: opts.review.map((m) => ({ prompt: m.prompt, correct_answer: m.correct_answer, explanation: m.explanation })),
      }),
    )
    await sayAI(r.script, { note: 'Quick review', offline: r.offline })
    void say(L.reviewCheck)
    setChips([chip.gotIt, chip.stillConfused])
  }

  const explainReviewAgain = async () => {
    setChips([])
    const text = opts.review.map((m) => `${m.prompt} — ${m.correct_answer}. ${m.explanation}`).join(' ')
    const r = await thinkingWhile(() => ai.explain({ learner, mode: profile.level === 'child' ? 'child' : 'simple', text, lesson: lessonCtx() }))
    await sayAI(r.explanation, { offline: r.offline })
    void say(L.reviewCheck)
    setChips([chip.gotIt, chip.stillConfused])
  }

  const finishReview = () => {
    setChips([])
    repo
      .markReviewed(opts.review.map((m) => m.id))
      .then(opts.onSaved)
      .catch((e) => console.warn('markReviewed', e))
    playSegment(0)
  }

  // ───────────── recorded segments ─────────────
  const playSegment = (i: number) => {
    if (i >= segments.length) return void lessonEnd()
    segRef.current = i
    setSegIdx(i)
    setPhase('segment')
    setChips([])
    if (!shownSegments.current.has(i)) {
      shownSegments.current.add(i)
      push({ id: uid(), kind: 'segment', index: i })
    }
    if (voiceRef.current) {
      const s = segments[i]
      void narrator.play({ key: s.id, text: `${s.title}. ${s.content}`, audioUrl: s.audio_url, lang: 'en' }, () => onSegmentEnd(i))
    }
  }

  function onSegmentEnd(i: number) {
    if (segRef.current !== i || (phaseRef.current !== 'segment' && phaseRef.current !== 'paused')) return
    narrator.stop()
    if (i >= segments.length - 1) return void lessonEnd()
    if (segments[i].checkpoint) return void checkpoint()
    playSegment(i + 1)
  }

  const checkpoint = () => {
    setPhase('checkpoint')
    void say(pick(L.checkpoints, cpCount.current++))
    setChips([chip.continue, chip.confused, chip.question])
  }

  const explainCurrent = async (back: 'checkpoint' | 'paused' = 'checkpoint') => {
    setChips([])
    void say(L.confusedIntro)
    const seg = segments[Math.max(0, segRef.current)]
    const mode: ExplainMode = profile.language !== 'en' ? 'translate' : profile.level === 'child' ? 'child' : 'simple'
    const r = await thinkingWhile(() => ai.explain({ learner, mode, text: seg.content, lesson: lessonCtx() }))
    await sayAI(r.explanation, { offline: r.offline })
    returnTo.current = back
    returnPrompt()
  }

  const raiseHand = () => {
    if (phaseRef.current !== 'segment') return
    narrator.pause()
    askMode('paused')
  }

  const resume = () => {
    setChips([])
    setPhase('segment')
    if (!voiceRef.current) return
    if (narrator.state === 'paused') narrator.resume()
    else {
      const i = segRef.current
      const s = segments[i]
      void narrator.play({ key: s.id, text: `${s.title}. ${s.content}`, audioUrl: s.audio_url, lang: 'en' }, () => onSegmentEnd(i))
    }
  }

  // ───────────── questions ─────────────
  const askMode = (back: Phase) => {
    returnTo.current = back
    setPhase('asking')
    setChips([])
    void say(L.askGoAhead)
  }

  const returnPrompt = () => {
    switch (returnTo.current) {
      case 'paused':
        setPhase('paused')
        void say(L.resumeQ)
        return setChips([chip.resume, chip.anotherQuestion])
      case 'feedback':
        setPhase('feedback')
        void say(L.beforeQuiz)
        return setChips([chip.noQuestions, chip.question])
      case 'open_qa':
        setPhase('open_qa')
        void say(L.otherQuestions)
        return setChips([chip.yesQuestion, chip.finish])
      default:
        setPhase('checkpoint')
        void say(L.continueQ)
        return setChips([chip.continue, chip.confused, chip.question])
    }
  }

  const answerQuestion = async (question: string) => {
    setChips([])
    const r = await thinkingWhile(() => ai.answer({ learner, question, history: history(), lesson: lessonCtx() }))
    await sayAI(r.answer, { references: r.references, offline: r.offline })
    void saveQuestion(question, r.answer, r.references)
    returnPrompt()
  }

  // ───────────── end of lesson, quiz, results ─────────────
  const lessonEnd = () => {
    narrator.stop()
    setPhase('feedback')
    void say(L.lessonEnd)
    setChips([chip.noQuestions, chip.question])
  }

  const preQuiz = () => {
    if (!questions.length) return void grade()
    setPhase('pre_quiz')
    void say(L.quizIntro)
    setChips([chip.quizReady, chip.quizWait])
  }

  const askQuestion = (i: number) => {
    qRef.current = i
    setQIdx(i)
    setPhase('quiz')
    setChips([])
    push({ id: uid(), kind: 'quiz', index: i })
    if (voiceRef.current) {
      const q = questions[i]
      void narrator.speakLine(`${L.quizQ(i + 1, questions.length)}. ${q.prompt}`, 'en')
    }
  }

  const recordAnswer = (answer: string) => {
    const i = qRef.current
    const q = questions[i]
    if (!q || answers.current.has(q.id)) return
    answers.current.set(q.id, answer)
    setAnswered((a) => ({ ...a, [q.id]: answer }))
    if (i + 1 < questions.length) {
      push({ id: uid(), kind: 'teacher', text: pick(L.acks, i) })
      askQuestion(i + 1)
    } else void grade()
  }

  const grade = async () => {
    setPhase('grading')
    setChips([])
    if (questions.length) void say(L.grading)

    const items: QuizItem[] = questions.map((q, index) => {
      const student_answer = answers.current.get(q.id) ?? ''
      const auto = q.type === 'mcq' || q.type === 'true_false' ? normalize(student_answer) === normalize(q.correct_answer) : null
      return {
        index,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        correct_answer: q.correct_answer,
        student_answer,
        topic: q.topic,
        auto_correct: auto,
      }
    })

    let score = 0
    let total = 0
    let summary = ''
    let graded: GradedItem[] = []
    if (items.length) {
      const ev = await thinkingWhile(() => ai.evaluateQuiz({ learner, lesson: lessonCtx(), items }))
      graded = items.map((it) => {
        const q = questions[it.index]
        const r = ev.results.find((x) => x.index === it.index)
        const correct = it.type === 'reflection' ? null : typeof it.auto_correct === 'boolean' ? it.auto_correct : (r?.correct ?? false)
        return {
          questionId: q.id,
          prompt: q.prompt,
          type: q.type,
          topic: q.topic,
          answer: it.student_answer,
          correct,
          feedback: r?.feedback || (correct ? 'Correct!' : `The answer is: ${q.correct_answer}`),
          correct_answer: q.correct_answer,
          explanation: q.explanation,
        }
      })
      total = graded.filter((g) => g.correct !== null).length
      score = graded.filter((g) => g.correct === true).length
      summary = ev.summary
      push({
        id: uid(),
        kind: 'result',
        score,
        total,
        graded,
        summary: ev.summary,
        improvement_areas: ev.improvement_areas,
        recommendations: ev.recommendations,
      })
      const p = total ? Math.round((score / total) * 100) : 100
      await say(`${L.result(score, total)} ${L.praise(p)}`)
    }

    await persist(graded, score, total, summary)

    setPhase('open_qa')
    void say(L.otherQuestions)
    setChips([chip.yesQuestion, chip.finish])
  }

  const persist = async (graded: GradedItem[], score: number, total: number, summary: string) => {
    const user_id = profile.id
    try {
      if (graded.length) {
        await repo.saveQuizAttempt({
          user_id,
          lesson_id: lesson.id,
          module_id: lesson.module_id,
          kind: 'lesson',
          answers: graded.map((g) => ({ question_id: g.questionId, answer: g.answer, correct: g.correct, feedback: g.feedback })),
          score,
          total,
          feedback: summary,
        })
        await repo.addMissed(
          graded
            .filter((g) => g.correct === false)
            .map((g) => ({
              user_id,
              course_id: course.id,
              lesson_id: lesson.id,
              question_id: g.questionId,
              topic: g.topic,
              prompt: g.prompt,
              correct_answer: g.correct_answer,
              explanation: g.explanation,
            })),
        )
        for (const g of graded.filter((x) => x.type === 'reflection' && x.answer.trim())) {
          await repo.saveReflection({ user_id, lesson_id: lesson.id, content: g.answer, ai_feedback: g.feedback })
        }
      }
      await repo.completeLesson(user_id, lesson, score, total)
      const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))
      await repo.logActivity(user_id, dayKey(), minutes, opts.alreadyCompleted ? 0 : 1)
      completed.current = true
      opts.onSaved()
    } catch (e) {
      console.error(e)
      push({ id: uid(), kind: 'teacher', text: "I couldn't save your progress just now. Please check your connection — your answers are still shown above." })
    }
  }

  const finishLesson = () => {
    setChips([])
    setPhase('done')
    void say(L.finish)
    push({ id: uid(), kind: 'done' })
  }

  // ───────────── input routing ─────────────
  const converse = (stage: Parameters<typeof ai.converse>[0]['stage'], message: string) =>
    thinkingWhile(() => ai.converse({ learner, stage, message, history: history(), lesson: lessonCtx() }))

  async function route(value: ChipValue | null, text: string | null) {
    const p = phaseRef.current
    switch (p) {
      case 'greeting': {
        if (value === 'ready') return beginClass()
        if (value === 'not_ready') {
          void say(L.notReady)
          return setChips([chip.readyNow])
        }
        if (!text) return
        const r = await converse('greeting', text)
        if (r.reply) await sayAI(r.reply, { references: r.references, offline: r.offline })
        if (r.intent === 'question') void saveQuestion(text, r.reply, r.references)
        if (r.intent === 'affirm') return beginClass()
        if (r.intent === 'decline') {
          if (!r.reply) void say(L.notReady)
          return setChips([chip.readyNow])
        }
        void say(L.askReady(lesson.title))
        return setChips([chip.ready, chip.notReady])
      }

      case 'review': {
        if (value === 'got_it') return finishReview()
        if (value === 'still_confused') return explainReviewAgain()
        if (!text) return
        const r = await converse('review', text)
        if (r.intent === 'confused') return explainReviewAgain()
        if (r.reply) await sayAI(r.reply, { references: r.references, offline: r.offline })
        if (r.intent === 'question') {
          void saveQuestion(text, r.reply, r.references)
          void say(L.reviewCheck)
          return setChips([chip.gotIt, chip.stillConfused])
        }
        return finishReview()
      }

      case 'segment': {
        // Typing while the recording plays = raising a hand.
        if (!text) return
        narrator.pause()
        returnTo.current = 'paused'
        setPhase('asking')
        return answerQuestion(text)
      }

      case 'checkpoint':
      case 'paused': {
        const back = p
        if (value === 'continue') return nextSegment()
        if (value === 'resume') return resume()
        if (value === 'confused' || value === 'still_confused') return explainCurrent(back)
        if (value === 'question') return askMode(back)
        if (!text) return
        const r = await converse('checkpoint', text)
        if (r.intent === 'confused') return explainCurrent(back)
        if (r.intent === 'question') {
          await sayAI(r.reply, { references: r.references, offline: r.offline })
          void saveQuestion(text, r.reply, r.references)
          returnTo.current = back
          return returnPrompt()
        }
        if (r.reply) await sayAI(r.reply, { offline: r.offline })
        return back === 'paused' ? resume() : nextSegment()
      }

      case 'asking':
        if (text) return answerQuestion(text)
        return

      case 'feedback': {
        if (value === 'no_questions') return preQuiz()
        if (value === 'question') return askMode('feedback')
        if (!text) return
        const r = await converse('feedback', text)
        if (r.intent === 'question' || r.intent === 'confused') {
          const reply = r.reply || (await ai.answer({ learner, question: text, history: history(), lesson: lessonCtx() })).answer
          await sayAI(reply, { references: r.references, offline: r.offline })
          void saveQuestion(text, reply, r.references)
          returnTo.current = 'feedback'
          return returnPrompt()
        }
        if (r.reply) await sayAI(r.reply, { offline: r.offline })
        return preQuiz()
      }

      case 'pre_quiz': {
        if (value === 'quiz_ready') return askQuestion(0)
        if (value === 'quiz_wait') {
          void say(L.quizWait)
          return setChips([chip.quizReady])
        }
        if (!text) return
        const r = await converse('pre_quiz', text)
        if (r.intent === 'question') {
          await sayAI(r.reply, { references: r.references, offline: r.offline })
          void saveQuestion(text, r.reply, r.references)
          void say(L.quizIntro)
          return setChips([chip.quizReady, chip.quizWait])
        }
        if (r.intent === 'decline') {
          void say(L.quizWait)
          return setChips([chip.quizReady])
        }
        return askQuestion(0)
      }

      case 'quiz':
        if (text !== null) recordAnswer(text)
        return

      case 'open_qa':
        if (value === 'question') return askMode('open_qa')
        if (value === 'finish') return finishLesson()
        if (text) {
          returnTo.current = 'open_qa'
          return answerQuestion(text)
        }
        return

      default:
        return
    }
  }

  function nextSegment() {
    setChips([])
    playSegment(segRef.current + 1)
  }

  // ───────────── public API ─────────────
  const sendChip = (c: Chip) => {
    if (thinking) return
    push({ id: uid(), kind: 'student', text: c.label })
    void route(c.value, null)
  }

  const sendText = (text: string) => {
    const t = text.trim()
    if (!t || thinking) return
    push({ id: uid(), kind: 'student', text: t })
    void route(null, t)
  }

  /** Multiple-choice / true-false answers clicked on the quiz card. */
  const answerOption = (option: string) => {
    if (phaseRef.current !== 'quiz') return
    push({ id: uid(), kind: 'student', text: option })
    recordAnswer(option)
  }

  const explainDifferently = async (mode: ExplainMode) => {
    if (thinking) return
    const wasPlaying = phaseRef.current === 'segment'
    if (wasPlaying) narrator.pause()
    const seg = segments[segRef.current]
    push({ id: uid(), kind: 'student', text: EXPLAIN_LABEL[mode] })
    const r = await thinkingWhile(() =>
      ai.explain({ learner, mode, text: seg ? `${seg.title}. ${seg.content}` : `${lesson.title}. ${lesson.description}`, lesson: lessonCtx() }),
    )
    await sayAI(r.explanation, { note: EXPLAIN_LABEL[mode], offline: r.offline })
    if (wasPlaying) {
      returnTo.current = 'paused'
      returnPrompt()
    }
  }

  const segmentControls = {
    toggle: () => {
      if (narrator.state === 'playing') {
        if (phaseRef.current === 'segment') {
          narrator.pause()
          setPhase('paused')
          setChips([chip.resume, chip.question])
        }
      } else if (phaseRef.current === 'paused' || phaseRef.current === 'segment') resume()
    },
    skip: () => onSegmentEnd(segRef.current),
    replay: () => {
      narrator.stop()
      setPhase('segment')
      setChips([])
      const i = segRef.current
      const s = segments[i]
      if (voiceRef.current) void narrator.play({ key: s.id, text: `${s.title}. ${s.content}`, audioUrl: s.audio_url, lang: 'en' }, () => onSegmentEnd(i))
    },
  }

  /** Voice toggled mid-segment: stop or start the narration. */
  useEffect(() => {
    if (phaseRef.current !== 'segment') return
    if (!opts.voiceOn) narrator.stop()
    else segmentControls.replay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.voiceOn])

  useEffect(() => {
    if (started.current) return
    started.current = true
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Count partial study time toward today's streak if the student leaves early.
  useEffect(
    () => () => {
      const elapsed = Date.now() - startedAt.current
      if (!completed.current && elapsed > 60_000 && started.current) {
        repo.logActivity(profile.id, dayKey(), Math.round(elapsed / 60000), 0).catch(() => {})
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const currentQuestion = phase === 'quiz' ? questions[qIdx] : undefined
  const inputEnabled =
    !thinking &&
    phase !== 'grading' &&
    phase !== 'done' &&
    !(phase === 'quiz' && currentQuestion && (currentQuestion.type === 'mcq' || currentQuestion.type === 'true_false'))

  return {
    msgs,
    chips,
    phase,
    stage,
    thinking,
    segIdx,
    qIdx,
    answered,
    inputEnabled,
    currentQuestion,
    sendChip,
    sendText,
    answerOption,
    raiseHand,
    explainDifferently,
    segmentControls,
  }
}

export type Classroom = ReturnType<typeof useClassroom>
