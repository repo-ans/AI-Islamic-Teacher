import { CURRICULUM, type SeedCourse } from './curriculum'
import type { Course, Lesson, Module, QuizQuestion, Reference, Segment } from './types'
import { uid } from './utils'

export interface SeedRows {
  courses: Course[]
  modules: Module[]
  lessons: Lesson[]
  segments: Segment[]
  references: Array<Reference & { id: string; lesson_id: string }>
  questions: QuizQuestion[]
}

/** Flattens the nested curriculum into table rows with fresh ids. */
export function buildSeedRows(curriculum: SeedCourse[] = CURRICULUM): SeedRows {
  const rows: SeedRows = { courses: [], modules: [], lessons: [], segments: [], references: [], questions: [] }

  curriculum.forEach((c, ci) => {
    const course: Course = {
      id: uid(),
      slug: c.slug,
      title: c.title,
      description: c.description,
      category: c.category,
      color: c.color,
      order_index: ci,
      published: true,
    }
    rows.courses.push(course)

    c.modules.forEach((m, mi) => {
      const mod: Module = { id: uid(), course_id: course.id, title: m.title, description: m.description, order_index: mi }
      rows.modules.push(mod)

      m.lessons.forEach((l, li) => {
        const lesson: Lesson = {
          id: uid(),
          course_id: course.id,
          module_id: mod.id,
          title: l.title,
          description: l.description,
          objectives: l.objectives,
          est_minutes: l.est_minutes,
          order_index: li,
          published: true,
        }
        rows.lessons.push(lesson)
        l.segments.forEach((s, si) =>
          rows.segments.push({
            id: uid(),
            lesson_id: lesson.id,
            order_index: si,
            kind: s.kind,
            title: s.title,
            content: s.content,
            audio_url: null,
            checkpoint: s.checkpoint ?? false,
          }),
        )
        l.references.forEach((r) =>
          rows.references.push({
            id: uid(),
            lesson_id: lesson.id,
            source_type: r.source_type,
            citation: r.citation,
            text: r.text,
            arabic: r.arabic ?? null,
            url: r.url ?? null,
          }),
        )
        l.questions.forEach((q, qi) =>
          rows.questions.push({
            id: uid(),
            lesson_id: lesson.id,
            order_index: qi,
            type: q.type,
            prompt: q.prompt,
            options: q.options ?? [],
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            topic: q.topic,
          }),
        )
      })
    })
  })
  return rows
}
