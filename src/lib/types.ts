export type Level = 'child' | 'teen' | 'adult' | 'new_muslim' | 'non_muslim'
export type Role = 'student' | 'admin'

export interface Profile {
  id: string
  email: string | null
  full_name: string
  age: number | null
  level: Level | null
  language: string
  country: string | null
  role: Role
  onboarded: boolean
  created_at: string
}

export type CourseColor = 'brand' | 'lime' | 'amber' | 'ink'

export interface Course {
  id: string
  slug: string
  title: string
  description: string
  category: string
  color: CourseColor
  order_index: number
  published: boolean
}

export interface Module {
  id: string
  course_id: string
  title: string
  description: string
  order_index: number
}

export interface Lesson {
  id: string
  course_id: string
  module_id: string
  title: string
  description: string
  objectives: string[]
  est_minutes: number
  order_index: number
  published: boolean
}

export type SegmentKind = 'intro' | 'teaching' | 'example' | 'story' | 'summary'

export interface Segment {
  id: string
  lesson_id: string
  order_index: number
  kind: SegmentKind
  title: string
  content: string
  audio_url: string | null
  checkpoint: boolean
}

export type SourceType = 'quran' | 'hadith' | 'tafsir' | 'book'

export interface Reference {
  id?: string
  lesson_id?: string
  source_type: SourceType
  citation: string
  text: string
  arabic?: string | null
  url?: string | null
  /** true when the text was checked against a live source (e.g. the Quran API) */
  verified?: boolean
}

export type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'reflection'

export interface QuizQuestion {
  id: string
  lesson_id: string
  order_index: number
  type: QuestionType
  prompt: string
  options: string[]
  correct_answer: string
  explanation: string
  topic: string
}

export interface Catalog {
  courses: Course[]
  modules: Module[]
  lessons: Lesson[]
}

export interface LessonContent {
  lesson: Lesson
  segments: Segment[]
  references: Reference[]
  questions: QuizQuestion[]
}

export interface Enrollment {
  user_id: string
  course_id: string
  created_at: string
}

export interface LessonProgress {
  user_id: string
  lesson_id: string
  course_id: string
  status: 'in_progress' | 'completed'
  started_at: string
  completed_at: string | null
  score: number | null
  total: number | null
}

export interface QuizAnswerRecord {
  question_id: string
  answer: string
  correct: boolean | null
  feedback?: string
}

export interface QuizAttempt {
  id: string
  user_id: string
  lesson_id: string | null
  module_id: string | null
  kind: 'lesson' | 'assessment'
  answers: QuizAnswerRecord[]
  score: number
  total: number
  feedback: string
  created_at: string
}

export interface MissedQuestion {
  id: string
  user_id: string
  course_id: string
  lesson_id: string
  question_id: string
  topic: string
  prompt: string
  correct_answer: string
  explanation: string
  reviewed_at: string | null
  created_at: string
}

export interface Reflection {
  id: string
  user_id: string
  lesson_id: string
  content: string
  ai_feedback: string
  created_at: string
}

export interface QuestionHistory {
  id: string
  user_id: string
  lesson_id: string | null
  question: string
  answer: string
  references: Reference[]
  created_at: string
}

export interface ActivityDay {
  user_id: string
  day: string // yyyy-mm-dd in the learner's local time
  minutes: number
  lessons_completed: number
}

export interface LearnerState {
  enrollments: Enrollment[]
  progress: LessonProgress[]
  attempts: QuizAttempt[]
  missed: MissedQuestion[]
  reflections: Reflection[]
  questions: QuestionHistory[]
  activity: ActivityDay[]
}

export interface AuthUser {
  id: string
  email: string | null
}

/** A lesson as authored in the admin editor or the seed file, before ids exist. */
export interface DraftLesson {
  lesson: Omit<Lesson, 'id'> & { id?: string }
  segments: Array<Omit<Segment, 'id' | 'lesson_id'> & { id?: string }>
  references: Reference[]
  questions: Array<Omit<QuizQuestion, 'id' | 'lesson_id'> & { id?: string }>
}
