/**
 * Demo-mode repository: everything lives in localStorage so the app can be
 * explored without Supabase. Passwords are stored in plain text — demo only.
 */
import { buildSeedRows } from '../seed-rows'
import type {
  ActivityDay,
  AuthUser,
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
  MissedQuestion,
  Module,
  Profile,
  QuestionHistory,
  QuizAttempt,
  QuizQuestion,
  Reference,
  Reflection,
  Segment,
} from '../types'
import { now } from '../clock'
import { uid } from '../utils'
import type { Repo } from './types'

const KEY = 'ilm-ai-demo-db-v1'
// Uses the app clock so "simulate tomorrow" in Settings also affects saved timestamps.
const stamp = () => now().toISOString()

interface DemoDb {
  users: Array<{ id: string; email: string; password: string }>
  session: string | null
  profiles: Profile[]
  courses: Course[]
  modules: Module[]
  lessons: Lesson[]
  segments: Segment[]
  references: Array<Reference & { id: string; lesson_id: string }>
  questions: QuizQuestion[]
  enrollments: Enrollment[]
  progress: LessonProgress[]
  attempts: QuizAttempt[]
  missed: MissedQuestion[]
  reflections: Reflection[]
  history: QuestionHistory[]
  activity: ActivityDay[]
}

function freshDb(): DemoDb {
  return {
    users: [],
    session: null,
    profiles: [],
    ...buildSeedRows(),
    enrollments: [],
    progress: [],
    attempts: [],
    missed: [],
    reflections: [],
    history: [],
    activity: [],
  }
}

let cache: DemoDb | null = null

function db(): DemoDb {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as DemoDb) : freshDb()
  } catch {
    cache = freshDb()
  }
  return cache
}

function commit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db()))
  } catch {
    /* storage full or blocked — keep in memory */
  }
}

export function resetDemoDb() {
  const session = db().session
  const users = db().users
  const profiles = db().profiles.map((p) => ({ ...p, onboarded: false }))
  cache = { ...freshDb(), session, users, profiles }
  commit()
}

const listeners = new Set<(u: AuthUser | null) => void>()
const currentUser = (): AuthUser | null => {
  const u = db().users.find((x) => x.id === db().session)
  return u ? { id: u.id, email: u.email } : null
}
const emit = () => listeners.forEach((cb) => cb(currentUser()))
const tick = () => new Promise((r) => setTimeout(r, 120))

function createUser(email: string, password: string, fullName: string) {
  const id = uid()
  db().users.push({ id, email: email.toLowerCase(), password })
  db().profiles.push({
    id,
    email: email.toLowerCase(),
    full_name: fullName,
    age: null,
    level: null,
    language: 'en',
    country: null,
    // Demo users get admin access so the curriculum portal can be explored.
    role: 'admin',
    onboarded: false,
    created_at: stamp(),
  })
  return id
}

export const localRepo: Repo = {
  async getUser() {
    return currentUser()
  },
  onAuthChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
  async signIn(email, password) {
    await tick()
    const u = db().users.find((x) => x.email === email.toLowerCase())
    if (!u || u.password !== password) throw new Error('Invalid email or password')
    db().session = u.id
    commit()
    emit()
  },
  async signUp(email, password, fullName) {
    await tick()
    if (db().users.some((x) => x.email === email.toLowerCase())) throw new Error('An account with this email already exists')
    db().session = createUser(email, password, fullName)
    commit()
    emit()
    return { needsConfirmation: false }
  },
  async signInWithGoogle() {
    await tick()
    const email = 'google.student@demo.local'
    const existing = db().users.find((x) => x.email === email)
    db().session = existing ? existing.id : createUser(email, uid(), 'Google Student')
    commit()
    emit()
  },
  async sendPasswordReset() {
    await tick()
  },
  async updatePassword(password) {
    const u = db().users.find((x) => x.id === db().session)
    if (u) u.password = password
    commit()
  },
  async signOut() {
    db().session = null
    commit()
    emit()
  },

  async getProfile(userId) {
    return db().profiles.find((p) => p.id === userId) ?? null
  },
  async updateProfile(userId, patch) {
    const p = db().profiles.find((x) => x.id === userId)
    if (!p) throw new Error('Profile not found')
    Object.assign(p, patch)
    commit()
    return { ...p }
  },

  async getCatalog(includeUnpublished = false) {
    const d = db()
    const courses = d.courses.filter((c) => includeUnpublished || c.published).sort((a, b) => a.order_index - b.order_index)
    const ids = new Set(courses.map((c) => c.id))
    return {
      courses,
      modules: d.modules.filter((m) => ids.has(m.course_id)).sort((a, b) => a.order_index - b.order_index),
      lessons: d.lessons
        .filter((l) => ids.has(l.course_id) && (includeUnpublished || l.published))
        .sort((a, b) => a.order_index - b.order_index),
    }
  },
  async getLessonContent(lessonId) {
    const d = db()
    const lesson = d.lessons.find((l) => l.id === lessonId)
    if (!lesson) return null
    return {
      lesson,
      segments: d.segments.filter((s) => s.lesson_id === lessonId).sort((a, b) => a.order_index - b.order_index),
      references: d.references.filter((r) => r.lesson_id === lessonId),
      questions: d.questions.filter((q) => q.lesson_id === lessonId).sort((a, b) => a.order_index - b.order_index),
    }
  },
  async getModuleQuestions(moduleId) {
    const d = db()
    const lessonIds = new Set(d.lessons.filter((l) => l.module_id === moduleId).map((l) => l.id))
    return d.questions.filter((q) => lessonIds.has(q.lesson_id))
  },

  async getLearnerState(userId) {
    const d = db()
    const mine = <T extends { user_id: string }>(rows: T[]) => rows.filter((r) => r.user_id === userId)
    return {
      enrollments: mine(d.enrollments),
      progress: mine(d.progress),
      attempts: mine(d.attempts),
      missed: mine(d.missed),
      reflections: mine(d.reflections),
      questions: mine(d.history),
      activity: mine(d.activity),
    }
  },
  async enroll(userId, courseId) {
    if (!db().enrollments.some((e) => e.user_id === userId && e.course_id === courseId)) {
      db().enrollments.push({ user_id: userId, course_id: courseId, created_at: stamp() })
      commit()
    }
  },
  async startLesson(userId, lesson) {
    if (!db().progress.some((p) => p.user_id === userId && p.lesson_id === lesson.id)) {
      db().progress.push({
        user_id: userId,
        lesson_id: lesson.id,
        course_id: lesson.course_id,
        status: 'in_progress',
        started_at: stamp(),
        completed_at: null,
        score: null,
        total: null,
      })
      commit()
    }
  },
  async completeLesson(userId, lesson, score, total) {
    await this.startLesson(userId, lesson)
    const p = db().progress.find((x) => x.user_id === userId && x.lesson_id === lesson.id)!
    if (p.status !== 'completed') {
      p.status = 'completed'
      p.completed_at = stamp()
    }
    p.score = score
    p.total = total
    commit()
  },
  async saveQuizAttempt(a) {
    db().attempts.push({ ...a, id: uid(), created_at: stamp() })
    commit()
  },
  async addMissed(items) {
    for (const m of items) {
      const existing = db().missed.find((x) => x.user_id === m.user_id && x.question_id === m.question_id)
      if (existing) Object.assign(existing, m, { created_at: stamp(), reviewed_at: null })
      else db().missed.push({ ...m, id: uid(), created_at: stamp(), reviewed_at: null })
    }
    commit()
  },
  async markReviewed(ids) {
    const set = new Set(ids)
    db().missed.forEach((m) => {
      if (set.has(m.id)) m.reviewed_at = stamp()
    })
    commit()
  },
  async saveReflection(r) {
    db().reflections.push({ ...r, id: uid(), created_at: stamp() })
    commit()
  },
  async saveQuestion(q) {
    db().history.push({ ...q, id: uid(), created_at: stamp() })
    commit()
  },
  async logActivity(userId, day, minutes, lessonsCompleted) {
    const row = db().activity.find((a) => a.user_id === userId && a.day === day)
    if (row) {
      row.minutes += minutes
      row.lessons_completed += lessonsCompleted
    } else {
      db().activity.push({ user_id: userId, day, minutes, lessons_completed: lessonsCompleted })
    }
    commit()
  },

  async saveCourse(c) {
    const d = db()
    const existing = c.id ? d.courses.find((x) => x.id === c.id) : undefined
    if (existing) {
      Object.assign(existing, c)
      commit()
      return { ...existing }
    }
    const row = { ...c, id: uid() } as Course
    d.courses.push(row)
    commit()
    return row
  },
  async deleteCourse(id) {
    const d = db()
    const lessonIds = new Set(d.lessons.filter((l) => l.course_id === id).map((l) => l.id))
    d.courses = d.courses.filter((c) => c.id !== id)
    d.modules = d.modules.filter((m) => m.course_id !== id)
    d.lessons = d.lessons.filter((l) => l.course_id !== id)
    d.segments = d.segments.filter((s) => !lessonIds.has(s.lesson_id))
    d.references = d.references.filter((r) => !lessonIds.has(r.lesson_id))
    d.questions = d.questions.filter((q) => !lessonIds.has(q.lesson_id))
    commit()
  },
  async saveModule(m) {
    const d = db()
    const existing = m.id ? d.modules.find((x) => x.id === m.id) : undefined
    if (existing) {
      Object.assign(existing, m)
      commit()
      return { ...existing }
    }
    const row = { ...m, id: uid() } as Module
    d.modules.push(row)
    commit()
    return row
  },
  async deleteModule(id) {
    const d = db()
    for (const l of d.lessons.filter((x) => x.module_id === id)) await this.deleteLesson(l.id)
    d.modules = d.modules.filter((m) => m.id !== id)
    commit()
  },
  async saveLesson(draft) {
    const d = db()
    const id = draft.lesson.id ?? uid()
    const lesson = { ...draft.lesson, id } as Lesson
    const idx = d.lessons.findIndex((l) => l.id === id)
    if (idx >= 0) d.lessons[idx] = lesson
    else d.lessons.push(lesson)

    d.segments = d.segments.filter((s) => s.lesson_id !== id)
    d.references = d.references.filter((r) => r.lesson_id !== id)
    d.questions = d.questions.filter((q) => q.lesson_id !== id)
    draft.segments.forEach((s, i) => d.segments.push({ ...s, id: s.id ?? uid(), lesson_id: id, order_index: i }))
    draft.references.forEach((r) => d.references.push({ ...r, id: r.id ?? uid(), lesson_id: id }))
    draft.questions.forEach((q, i) => d.questions.push({ ...q, id: q.id ?? uid(), lesson_id: id, order_index: i }))
    commit()
    return id
  },
  async deleteLesson(id) {
    const d = db()
    d.lessons = d.lessons.filter((l) => l.id !== id)
    d.segments = d.segments.filter((s) => s.lesson_id !== id)
    d.references = d.references.filter((r) => r.lesson_id !== id)
    d.questions = d.questions.filter((q) => q.lesson_id !== id)
    commit()
  },
  async setSegmentAudio(segmentId, audioUrl) {
    const s = db().segments.find((x) => x.id === segmentId)
    if (s) s.audio_url = audioUrl
    commit()
  },
}
