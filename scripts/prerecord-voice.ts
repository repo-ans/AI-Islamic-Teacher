/**
 * Pre-records the teacher's voice (every lesson part, greeting, check-in, quiz
 * question and result) in both voices — female (Jessica) and male (Will) —
 * through the `tts` function's shared cache. Already-cached clips cost nothing.
 *
 *   npx tsx scripts/prerecord-voice.ts            → shows ElevenLabs balance and what is needed
 *   npx tsx scripts/prerecord-voice.ts --run      → records everything that isn't cached yet
 *   add --lang en                                 → only one language (e.g. skip the Bangla lines)
 *
 * Uses a temporary admin account (deleted afterwards). Needs VITE_SUPABASE_URL,
 * VITE_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.
 */
import { teacherLineScript } from '../src/lib/teacher-lines'

try {
  process.loadEnvFile('.env')
} catch {
  /* rely on the shell environment */
}
const URL = process.env.VITE_SUPABASE_URL!
const ANON = process.env.VITE_SUPABASE_ANON_KEY!
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!
const run = process.argv.includes('--run')
const onlyLang = process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : null
const sr = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' }

async function main() {
  const lessons = (await (
    await fetch(
      `${URL}/rest/v1/lessons?select=title,order_index,lesson_segments(title,content,audio_url,order_index),quiz_questions(type,prompt,order_index)&published=eq.true`,
      { headers: sr },
    )
  ).json()) as Array<{
    title: string
    lesson_segments: Array<{ title: string; content: string; audio_url: string | null; order_index: number }>
    quiz_questions: Array<{ type: string; prompt: string; order_index: number }>
  }>
  const script = teacherLineScript(
    lessons.map((l) => ({
      title: l.title,
      segments: [...l.lesson_segments].sort((a, b) => a.order_index - b.order_index),
      questions: [...l.quiz_questions].sort((a, b) => a.order_index - b.order_index),
    })),
  )
  const clips = script
    .filter((c) => !onlyLang || c.lang === onlyLang)
    .flatMap((c) => (['female', 'male'] as const).map((gender) => ({ ...c, gender })))
  const chars = clips.reduce((n, c) => n + c.text.length, 0)

  // Temporary admin for the tts calls.
  const email = `prerecord-${Date.now()}@example.com`
  const password = `Pre!${Date.now()}x`
  const user = await (await fetch(`${URL}/auth/v1/admin/users`, { method: 'POST', headers: sr, body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  try {
    await new Promise((r) => setTimeout(r, 1000))
    await fetch(`${URL}/rest/v1/profiles?id=eq.${user.id}`, { method: 'PATCH', headers: sr, body: JSON.stringify({ role: 'admin' }) })
    const token = (
      await (await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
    ).access_token
    const tts = (body: object) =>
      fetch(`${URL}/functions/v1/tts`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(async (r) => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) }))

    const quota = await tts({ action: 'quota' })
    console.log(`ElevenLabs: ${JSON.stringify(quota.body)}`)
    console.log(`Needed (if nothing is cached yet): ${clips.length} clips, ~${chars.toLocaleString()} characters (${script.length} sentences × 2 voices)`)
    if (!run) return

    let done = 0
    let fresh = 0
    let failed = 0
    const queue = [...clips]
    const worker = async () => {
      for (let c = queue.shift(); c; c = queue.shift()) {
        const r = await tts({ text: c.text, lang: c.lang, gender: c.gender })
        done++
        if (!r.ok) {
          failed++
          console.log(`✗ [${c.gender}] ${c.text.slice(0, 50)}… → ${r.status} ${r.body.error ?? ''}`)
          if (r.status === 502) queue.length = 0 // provider error (e.g. out of credits) — stop
        } else if (!r.body.cached) fresh++
        if (done % 25 === 0) console.log(`  ${done}/${clips.length} (new: ${fresh}, failed: ${failed})`)
      }
    }
    await Promise.all([worker(), worker(), worker()])
    console.log(`Done: ${done - failed}/${clips.length} ready (${fresh} newly recorded, ${failed} failed)`)
    console.log(`ElevenLabs after: ${JSON.stringify((await tts({ action: 'quota' })).body)}`)
  } finally {
    await fetch(`${URL}/auth/v1/admin/users/${user.id}`, { method: 'DELETE', headers: sr })
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
