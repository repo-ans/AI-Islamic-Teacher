/**
 * Seeds the starter curriculum into Supabase.
 *   npm run seed            → inserts courses that don't exist yet (matched by slug)
 *   npm run seed -- --force → deletes and re-inserts the starter courses
 * Needs VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.
 */
import { createClient } from '@supabase/supabase-js'
import { buildSeedRows } from '../src/lib/seed-rows'

try {
  process.loadEnvFile('.env')
} catch {
  /* rely on the shell environment */
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL / VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })
const force = process.argv.includes('--force')

async function run() {
  const rows = buildSeedRows()
  const { data: existing, error } = await sb.from('courses').select('id,slug')
  if (error) throw error

  const existingSlugs = new Map((existing ?? []).map((c) => [c.slug as string, c.id as string]))
  if (force) {
    const ids = rows.courses.map((c) => existingSlugs.get(c.slug)).filter(Boolean) as string[]
    if (ids.length) {
      const { error: delErr } = await sb.from('courses').delete().in('id', ids)
      if (delErr) throw delErr
      console.log(`Removed ${ids.length} existing starter course(s)`)
    }
    existingSlugs.clear()
  }

  const courses = rows.courses.filter((c) => !existingSlugs.has(c.slug))
  if (!courses.length) {
    console.log('Starter courses already exist — nothing to do (use --force to re-seed).')
    return
  }
  const courseIds = new Set(courses.map((c) => c.id))
  const modules = rows.modules.filter((m) => courseIds.has(m.course_id))
  const lessons = rows.lessons.filter((l) => courseIds.has(l.course_id))
  const lessonIds = new Set(lessons.map((l) => l.id))

  const insert = async (table: string, data: object[]) => {
    if (!data.length) return
    const { error: e } = await sb.from(table).insert(data)
    if (e) throw new Error(`${table}: ${e.message}`)
    console.log(`  ✓ ${table.padEnd(18)} ${data.length}`)
  }

  console.log(`Seeding ${courses.map((c) => c.title).join(', ')}`)
  await insert('courses', courses)
  await insert('modules', modules)
  await insert('lessons', lessons)
  await insert('lesson_segments', rows.segments.filter((s) => lessonIds.has(s.lesson_id)))
  await insert('lesson_references', rows.references.filter((r) => lessonIds.has(r.lesson_id)))
  await insert('quiz_questions', rows.questions.filter((q) => lessonIds.has(q.lesson_id)))
  console.log('Done.')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
