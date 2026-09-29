import type {
  AuthUser,
  Catalog,
  Course,
  DraftLesson,
  Lesson,
  LearnerState,
  LessonContent,
  MissedQuestion,
  Module,
  Profile,
  QuestionHistory,
  QuizAttempt,
  QuizQuestion,
  Reflection,
} from '../types'

export type NewMissed = Omit<MissedQuestion, 'id' | 'created_at' | 'reviewed_at'>

export interface Repo {
  // ── auth
  getUser(): Promise<AuthUser | null>
  onAuthChange(cb: (user: AuthUser | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string, fullName: string): Promise<{ needsConfirmation: boolean }>
  signInWithGoogle(): Promise<void>
  sendPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  signOut(): Promise<void>

  // ── profile
  getProfile(userId: string): Promise<Profile | null>
  updateProfile(userId: string, patch: Partial<Omit<Profile, 'id' | 'role' | 'created_at'>>): Promise<Profile>

  // ── curriculum
  getCatalog(includeUnpublished?: boolean): Promise<Catalog>
  getLessonContent(lessonId: string): Promise<LessonContent | null>
  getModuleQuestions(moduleId: string): Promise<QuizQuestion[]>

  // ── learner data
  getLearnerState(userId: string): Promise<LearnerState>
  enroll(userId: string, courseId: string): Promise<void>
  startLesson(userId: string, lesson: Lesson): Promise<void>
  completeLesson(userId: string, lesson: Lesson, score: number, total: number): Promise<void>
  saveQuizAttempt(a: Omit<QuizAttempt, 'id' | 'created_at'>): Promise<void>
  addMissed(items: NewMissed[]): Promise<void>
  markReviewed(ids: string[]): Promise<void>
  saveReflection(r: Omit<Reflection, 'id' | 'created_at'>): Promise<void>
  saveQuestion(q: Omit<QuestionHistory, 'id' | 'created_at'>): Promise<void>
  logActivity(userId: string, day: string, minutes: number, lessonsCompleted: number): Promise<void>

  // ── admin curriculum portal
  saveCourse(c: Omit<Course, 'id'> & { id?: string }): Promise<Course>
  deleteCourse(id: string): Promise<void>
  saveModule(m: Omit<Module, 'id'> & { id?: string }): Promise<Module>
  deleteModule(id: string): Promise<void>
  saveLesson(d: DraftLesson): Promise<string>
  deleteLesson(id: string): Promise<void>
  setSegmentAudio(segmentId: string, audioUrl: string | null): Promise<void>
}
