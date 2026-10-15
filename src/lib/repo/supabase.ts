import type { PostgrestError } from '@supabase/supabase-js'
import { requireSupabase } from '../supabase'
import type { Course, LearnerState, Lesson, LessonReview, Module, Profile, QuizQuestion, Reference, Segment } from '../types'
import type { Repo } from './types'

const sb = () => requireSupabase()

function check<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

export const supabaseRepo: Repo = {
  async getUser() {
    const { data } = await sb().auth.getSession()
    const u = data.session?.user
    return u ? { id: u.id, email: u.email ?? null } : null
  },
  onAuthChange(cb) {
    const { data } = sb().auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      cb(u ? { id: u.id, email: u.email ?? null } : null)
    })
    return () => data.subscription.unsubscribe()
  },
  async signIn(email, password) {
    const { error } = await sb().auth.signInWithPassword({ email, password })
    if (error) throw error
  },
  async signUp(email, password, fullName) {
    const { data, error } = await sb().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${location.origin}/onboarding` },
    })
    if (error) throw error
    return { needsConfirmation: !data.session }
  },
  async signInWithGoogle() {
    const { error } = await sb().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/` },
    })
    if (error) throw error
  },
  async sendPasswordReset(email) {
    const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/update-password` })
    if (error) throw error
  },
  async updatePassword(password) {
    const { error } = await sb().auth.updateUser({ password })
    if (error) throw error
  },
  async signOut() {
    await sb().auth.signOut()
  },

  async getProfile(userId) {
    return check(await sb().from('profiles').select('*').eq('id', userId).maybeSingle()) as Profile | null
  },
  async updateProfile(userId, patch) {
    return check(await sb().from('profiles').update(patch).eq('id', userId).select('*').single()) as Profile
  },

  async getCatalog(audience = 'student') {
    let courses = sb().from('courses').select('*').order('order_index')
    let lessons = sb()
      .from('lessons')
      .select(
        'id,course_id,module_id,title,description,objectives,est_minutes,order_index,published,validated_at,validated_by,validated_by_name,validated_by_title',
      )
      .order('order_index')
    if (audience !== 'admin') {
      courses = courses.eq('published', true)
      lessons = lessons.eq('published', true)
    }
    // RLS already hides unvalidated lessons from students; staff browsing as learners get the same view.
    if (audience === 'student') lessons = lessons.not('validated_at', 'is', null)
    const [c, m, l] = await Promise.all([courses, sb().from('modules').select('*').order('order_index'), lessons])
    return {
      courses: check(c) as Course[],
      modules: check(m) as Module[],
      lessons: check(l) as Lesson[],
    }
  },
  async getLessonContent(lessonId) {
    const [l, s, r, q] = await Promise.all([
      sb().from('lessons').select('*').eq('id', lessonId).maybeSingle(),
      sb().from('lesson_segments').select('*').eq('lesson_id', lessonId).order('order_index'),
      sb().from('lesson_references').select('*').eq('lesson_id', lessonId),
      sb().from('quiz_questions').select('*').eq('lesson_id', lessonId).order('order_index'),
    ])
    const lesson = check(l) as Lesson | null
    if (!lesson) return null
    return {
      lesson,
      segments: check(s) as Segment[],
      references: check(r) as Reference[],
      questions: check(q) as QuizQuestion[],
    }
  },
  async getModuleQuestions(moduleId) {
    const lessons = check(await sb().from('lessons').select('id').eq('module_id', moduleId)) as Array<{ id: string }>
    if (!lessons.length) return []
    return check(
      await sb()
        .from('quiz_questions')
        .select('*')
        .in('lesson_id', lessons.map((l) => l.id)),
    ) as QuizQuestion[]
  },

  async getLearnerState(userId) {
    const q = (table: string, order = 'created_at') =>
      sb().from(table).select('*').eq('user_id', userId).order(order, { ascending: true })
    const [e, p, a, m, r, h, act] = await Promise.all([
      q('enrollments'),
      q('lesson_progress', 'started_at'),
      q('quiz_attempts'),
      q('missed_questions'),
      q('reflections'),
      q('question_history'),
      q('activity_days', 'day'),
    ])
    return {
      enrollments: check(e) ?? [],
      progress: check(p) ?? [],
      attempts: check(a) ?? [],
      missed: check(m) ?? [],
      reflections: check(r) ?? [],
      questions: check(h) ?? [],
      activity: check(act) ?? [],
    } as LearnerState
  },
  async enroll(userId, courseId) {
    check(
      await sb()
        .from('enrollments')
        .upsert({ user_id: userId, course_id: courseId }, { onConflict: 'user_id,course_id', ignoreDuplicates: true }),
    )
  },
  async startLesson(userId, lesson) {
    check(
      await sb()
        .from('lesson_progress')
        .upsert(
          { user_id: userId, lesson_id: lesson.id, course_id: lesson.course_id, status: 'in_progress' },
          { onConflict: 'user_id,lesson_id', ignoreDuplicates: true },
        ),
    )
  },
  async completeLesson(userId, lesson, score, total) {
    await this.startLesson(userId, lesson)
    // `complete_lesson` keeps the first completion time so the daily unlock can't be gamed by replaying.
    check(await sb().rpc('complete_lesson', { p_lesson_id: lesson.id, p_score: score, p_total: total }))
  },
  async saveQuizAttempt(a) {
    check(await sb().from('quiz_attempts').insert(a))
  },
  async addMissed(items) {
    if (!items.length) return
    // One row per (user, question): missing it again re-opens it for review.
    const now = new Date().toISOString()
    check(
      await sb()
        .from('missed_questions')
        .upsert(
          items.map((m) => ({ ...m, reviewed_at: null, created_at: now })),
          { onConflict: 'user_id,question_id' },
        ),
    )
  },
  async markReviewed(ids) {
    if (!ids.length) return
    check(await sb().from('missed_questions').update({ reviewed_at: new Date().toISOString() }).in('id', ids))
  },
  async saveReflection(r) {
    check(await sb().from('reflections').insert(r))
  },
  async saveQuestion(q) {
    check(await sb().from('question_history').insert(q))
  },
  async logActivity(_userId, day, minutes, lessonsCompleted) {
    check(await sb().rpc('log_activity', { p_day: day, p_minutes: minutes, p_lessons: lessonsCompleted }))
  },

  async saveCourse(c) {
    return check(await sb().from('courses').upsert(c).select('*').single()) as Course
  },
  async deleteCourse(id) {
    check(await sb().from('courses').delete().eq('id', id))
  },
  async saveModule(m) {
    return check(await sb().from('modules').upsert(m).select('*').single()) as Module
  },
  async deleteModule(id) {
    check(await sb().from('modules').delete().eq('id', id))
  },
  async saveLesson(draft) {
    // Runs as one transaction in Postgres (see `save_lesson` in the migration).
    const id = check(
      await sb().rpc('save_lesson', {
        p_lesson: draft.lesson,
        p_segments: draft.segments,
        p_references: draft.references,
        p_questions: draft.questions,
      }),
    )
    return id as string
  },
  async deleteLesson(id) {
    check(await sb().from('lessons').delete().eq('id', id))
  },
  async setSegmentAudio(segmentId, audioUrl) {
    check(await sb().from('lesson_segments').update({ audio_url: audioUrl }).eq('id', segmentId))
  },

  async validateLesson(lessonId) {
    check(await sb().rpc('validate_lesson', { p_lesson_id: lessonId }))
  },
  async listReviews(lessonId) {
    let q = sb().from('lesson_reviews').select('*').order('created_at', { ascending: false })
    if (lessonId) q = q.eq('lesson_id', lessonId)
    return check(await q) as LessonReview[]
  },
  async requestImprovement(lessonId, location, comment) {
    // teacher_id / teacher_name are stamped by a database trigger.
    check(await sb().from('lesson_reviews').insert({ lesson_id: lessonId, location, comment }))
  },
  async resolveReview(reviewId) {
    check(await sb().from('lesson_reviews').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', reviewId))
  },
  async setUserRole(email, role) {
    return check(await sb().rpc('set_user_role', { p_email: email, p_role: role })) as Profile
  },
  async listStaff() {
    return check(await sb().from('profiles').select('*').in('role', ['teacher', 'admin']).order('full_name')) as Profile[]
  },
}
