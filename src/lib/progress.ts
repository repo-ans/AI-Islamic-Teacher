import { addDays, dayKey, now, startOfDay } from './clock'
import type { ActivityDay, Catalog, Course, Lesson, LearnerState, LessonProgress, MissedQuestion, Module } from './types'
import { pct } from './utils'

export type LessonStatus = 'completed' | 'in_progress' | 'available' | 'tomorrow' | 'locked'

export interface LessonWithStatus {
  lesson: Lesson
  module: Module | undefined
  course: Course
  status: LessonStatus
  /** When a "tomorrow" lesson opens. */
  unlockAt?: Date
  index: number
}

/** Lessons of a course in teaching order (module order, then lesson order). */
export function orderedLessons(catalog: Catalog, courseId: string): Lesson[] {
  const moduleOrder = new Map(catalog.modules.filter((m) => m.course_id === courseId).map((m) => [m.id, m.order_index]))
  return catalog.lessons
    .filter((l) => l.course_id === courseId)
    .sort((a, b) => (moduleOrder.get(a.module_id) ?? 0) - (moduleOrder.get(b.module_id) ?? 0) || a.order_index - b.order_index)
}

/**
 * One lesson per day: lesson N opens once lesson N-1 is completed AND a new
 * calendar day has started since that completion.
 */
export function courseLessons(catalog: Catalog, progress: LessonProgress[], courseId: string, at = now()): LessonWithStatus[] {
  const course = catalog.courses.find((c) => c.id === courseId)
  if (!course) return []
  const byLesson = new Map(progress.map((p) => [p.lesson_id, p]))
  const today = dayKey(at)

  return orderedLessons(catalog, courseId).map((lesson, index, all) => {
    const module = catalog.modules.find((m) => m.id === lesson.module_id)
    const p = byLesson.get(lesson.id)
    const base = { lesson, module, course, index }
    if (p?.status === 'completed') return { ...base, status: 'completed' as const }
    if (index === 0) return { ...base, status: p ? ('in_progress' as const) : ('available' as const) }

    const prev = byLesson.get(all[index - 1].id)
    if (prev?.status === 'completed' && prev.completed_at) {
      if (dayKey(prev.completed_at) < today) return { ...base, status: p ? ('in_progress' as const) : ('available' as const) }
      return { ...base, status: 'tomorrow' as const, unlockAt: startOfDay(addDays(new Date(prev.completed_at), 1)) }
    }
    return { ...base, status: 'locked' as const }
  })
}

export function isOpen(s: LessonStatus) {
  return s === 'available' || s === 'in_progress' || s === 'completed'
}

export function courseProgress(catalog: Catalog, progress: LessonProgress[], courseId: string) {
  const lessons = orderedLessons(catalog, courseId)
  const done = lessons.filter((l) => progress.some((p) => p.lesson_id === l.id && p.status === 'completed')).length
  return { done, total: lessons.length, pct: pct(done, lessons.length) }
}

export function enrolledCourses(catalog: Catalog, state: LearnerState): Course[] {
  const ids = new Set(state.enrollments.map((e) => e.course_id))
  return catalog.courses.filter((c) => ids.has(c.id))
}

/** The next lesson to study across enrolled courses (today's lesson first). */
export function nextUp(catalog: Catalog, state: LearnerState, at = now()): LessonWithStatus | null {
  let tomorrow: LessonWithStatus | null = null
  for (const c of enrolledCourses(catalog, state)) {
    const lessons = courseLessons(catalog, state.progress, c.id, at)
    const open = lessons.find((l) => l.status === 'in_progress' || l.status === 'available')
    if (open) return open
    tomorrow ??= lessons.find((l) => l.status === 'tomorrow') ?? null
  }
  return tomorrow
}

/** Consecutive active days ending today (or yesterday, if today isn't done yet). */
export function streak(activity: ActivityDay[], at = now()): number {
  const days = new Set(activity.filter((a) => a.minutes > 0 || a.lessons_completed > 0).map((a) => a.day))
  let cursor = startOfDay(at)
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1)
  let n = 0
  while (days.has(dayKey(cursor))) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}

export function bestStreak(activity: ActivityDay[]): number {
  const days = [...new Set(activity.map((a) => a.day))].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of days) {
    run = prev && dayKey(addDays(new Date(`${prev}T12:00:00`), 1)) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/** Last `n` days, oldest first, flagged active or not. */
export function recentDays(activity: ActivityDay[], n: number, at = now()) {
  const active = new Set(activity.filter((a) => a.minutes > 0 || a.lessons_completed > 0).map((a) => a.day))
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(startOfDay(at), i - n + 1)
    return { day: dayKey(d), active: active.has(dayKey(d)) }
  })
}

/** Monday → Sunday of the current week with minutes / lessons per day. */
export function weekAtAGlance(activity: ActivityDay[], at = now()) {
  const today = startOfDay(at)
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  const byDay = new Map(activity.map((a) => [a.day, a]))
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i)
    const row = byDay.get(dayKey(d))
    return {
      date: d,
      key: dayKey(d),
      isToday: dayKey(d) === dayKey(today),
      minutes: row?.minutes ?? 0,
      lessons: row?.lessons_completed ?? 0,
    }
  })
}

export function minutesThisWeek(activity: ActivityDay[], at = now()) {
  return weekAtAGlance(activity, at).reduce((s, d) => s + d.minutes, 0)
}

export function quizAverage(state: LearnerState): number | null {
  const scored = state.attempts.filter((a) => a.total > 0)
  if (!scored.length) return null
  return Math.round(scored.reduce((s, a) => s + (a.score / a.total) * 100, 0) / scored.length)
}

export interface WeakTopic {
  topic: string
  items: MissedQuestion[]
  courseId: string
  lessonId: string
}

export function weakTopics(state: LearnerState): WeakTopic[] {
  const groups = new Map<string, WeakTopic>()
  for (const m of state.missed.filter((x) => !x.reviewed_at)) {
    const key = `${m.course_id}:${m.topic || m.prompt}`
    const g = groups.get(key) ?? { topic: m.topic || m.prompt, items: [], courseId: m.course_id, lessonId: m.lesson_id }
    g.items.push(m)
    groups.set(key, g)
  }
  return [...groups.values()].sort((a, b) => b.items.length - a.items.length)
}

/** Questions missed before today in this course — reviewed at the start of the next lesson. */
export function reviewQueue(state: LearnerState, courseId: string, at = now()): MissedQuestion[] {
  const today = dayKey(at)
  return state.missed
    .filter((m) => !m.reviewed_at && m.course_id === courseId && dayKey(m.created_at) < today)
    .slice(-3)
}

export function lessonsCompleted(state: LearnerState) {
  return state.progress.filter((p) => p.status === 'completed').length
}

export function moduleComplete(catalog: Catalog, progress: LessonProgress[], moduleId: string) {
  const lessons = catalog.lessons.filter((l) => l.module_id === moduleId)
  return lessons.length > 0 && lessons.every((l) => progress.some((p) => p.lesson_id === l.id && p.status === 'completed'))
}
