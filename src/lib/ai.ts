/**
 * Client for the `ai-teacher` Supabase Edge Function (OpenAI runs server-side;
 * no key ever reaches the browser). In demo mode, or if the function fails,
 * a local rule-based teacher answers so lessons never get stuck.
 */
import { DEMO_MODE } from './env'
import * as fallback from './ai-fallback'
import { supabase } from './supabase'
import type { DraftLesson, Level, Profile, QuestionType, Reference } from './types'

export interface LearnerCtx {
  name: string
  age: number | null
  level: Level | null
  language: string
  country: string | null
}

export interface LessonCtx {
  title: string
  objectives: string[]
  /** Text of the segment currently being taught, if any. */
  segment?: string
  /** Full lesson narration — used by the local fallback for grounding. */
  transcript?: string
  references?: Reference[]
}

export interface Turn {
  role: 'teacher' | 'student'
  text: string
}

export type Stage = 'greeting' | 'checkpoint' | 'review' | 'feedback' | 'pre_quiz' | 'open_qa'
export type Intent = 'affirm' | 'decline' | 'confused' | 'question' | 'other'
export type ExplainMode = 'simple' | 'child' | 'analogy' | 'example' | 'summary' | 'translate'

export interface ConverseResult {
  intent: Intent
  reply: string
  references: Reference[]
}
export interface AnswerResult {
  answer: string
  references: Reference[]
}
export interface QuizItem {
  index: number
  type: QuestionType
  prompt: string
  options: string[]
  correct_answer: string
  student_answer: string
  topic: string
  /** Already graded locally (multiple choice / true-false); the AI only writes feedback. */
  auto_correct?: boolean | null
}
export interface QuizEvaluation {
  results: Array<{ index: number; correct: boolean | null; feedback: string }>
  summary: string
  improvement_areas: string[]
  recommendations: string[]
}

type WithOffline<T> = T & { offline?: boolean }

export const learnerCtx = (p: Profile): LearnerCtx => ({
  name: p.full_name,
  age: p.age,
  level: p.level,
  language: p.language,
  country: p.country,
})

async function invoke<T extends object>(
  action: string,
  payload: object,
  local: () => T | Promise<T>,
): Promise<WithOffline<T>> {
  if (DEMO_MODE || !supabase) return { ...(await local()), offline: true }
  try {
    const { data, error } = await supabase.functions.invoke('ai-teacher', { body: { action, ...payload } })
    if (error) throw error
    if (!data || (data as { error?: string }).error) throw new Error((data as { error?: string })?.error || 'Empty AI response')
    return data as T
  } catch (e) {
    console.warn(`[ai:${action}] falling back to offline teacher`, e)
    return { ...(await local()), offline: true }
  }
}

export const ai = {
  /** Interprets a free-text reply during the guided lesson (and answers it if it's a question). */
  converse(args: { learner: LearnerCtx; stage: Stage; message: string; history: Turn[]; lesson?: LessonCtx }) {
    return invoke<ConverseResult>('converse', args, () => fallback.converse(args))
  },
  answer(args: { learner: LearnerCtx; question: string; history: Turn[]; lesson?: LessonCtx }) {
    return invoke<AnswerResult>('answer', args, () => fallback.answer(args))
  },
  explain(args: { learner: LearnerCtx; mode: ExplainMode; text: string; lesson: LessonCtx }) {
    return invoke<{ explanation: string }>('explain', args, () => fallback.explain(args))
  },
  review(args: { learner: LearnerCtx; items: Array<{ prompt: string; correct_answer: string; explanation: string }> }) {
    return invoke<{ script: string }>('review', args, () => fallback.review(args))
  },
  evaluateQuiz(args: { learner: LearnerCtx; lesson: LessonCtx; items: QuizItem[] }) {
    return invoke<QuizEvaluation>('evaluate_quiz', args, () => fallback.evaluateQuiz(args))
  },
  generateLesson(args: { courseTitle: string; moduleTitle: string; title: string; notes: string; level: string }) {
    return invoke<Omit<DraftLesson, 'lesson'> & { lesson: Pick<DraftLesson['lesson'], 'title' | 'description' | 'objectives' | 'est_minutes'> }>(
      'generate_lesson',
      args,
      () => fallback.generateLesson(args),
    )
  },
}
