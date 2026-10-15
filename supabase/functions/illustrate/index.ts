/**
 * illustrate — admin only: creates an illustration for a lesson segment.
 *
 * POST { segment_id } → { image_url }
 *
 * 1. A text model turns the segment into a visual scene with NO people, faces
 *    or depictions of prophets/angels (aniconic: landscapes, architecture, objects).
 * 2. An image model draws it; the file is stored in `lesson-images` and saved
 *    on the segment, so it is generated once and shown to every student.
 *
 * Secrets: OPENAI_API_KEY, OPENAI_IMAGE_MODEL (default gpt-image-1.5), OPENAI_IMAGE_QUALITY (default medium)
 */
import { adminClient, corsHeaders, HttpError, isAdmin, json, requireUser } from '../_shared/http.ts'
import { chatJSON } from '../_shared/openai.ts'

const IMAGE_MODEL = Deno.env.get('OPENAI_IMAGE_MODEL') ?? 'gpt-image-1.5'
const QUALITY = Deno.env.get('OPENAI_IMAGE_QUALITY') ?? 'medium'

const STYLE =
  'Soft modern flat illustration for an Islamic learning app: warm desert and dusk tones with gentle indigo and lime accents, ' +
  'subtle grain, calm and respectful, wide composition, plenty of clean space.'

const RULES = `STRICT CONTENT RULES (must all hold):
- No humans at all: no people, faces, hands, figures, silhouettes or crowds.
- No faces of any creature. Animals only if essential, as small distant silhouettes without faces.
- Never depict any prophet, companion, angel or God, even symbolically as light-figures.
- No text, letters, calligraphy or numbers anywhere in the image.
- Show the topic through places, architecture, landscapes, sky, light and objects (e.g. desert, the Ka'bah, a cave on a mountain, a prayer mat, water, a lantern, an open book).`

async function scenePrompt(title: string, content: string, lessonTitle: string) {
  const out = await chatJSON<{ scene?: string }>(
    `You write prompts for an image model that illustrates Islamic lessons. ${RULES}
Respond with a single JSON object only.`,
    `Lesson: ${lessonTitle}
Segment: ${title}
Text: """${content.slice(0, 2500)}"""

Describe ONE scene (2–3 sentences) that captures this segment while obeying every rule above.
Return JSON: {"scene":"..."}`,
  )
  if (!out.scene) throw new HttpError(502, 'Could not describe a scene')
  return out.scene
}

async function drawImage(scene: string): Promise<Uint8Array> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) throw new HttpError(500, 'OPENAI_API_KEY is not set')
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: `${scene}\n\n${STYLE}\n\n${RULES}`,
      size: '1536x1024',
      quality: QUALITY,
      output_format: 'webp',
      output_compression: 80,
      n: 1,
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    console.error('OpenAI image error', res.status, detail)
    throw new HttpError(502, `Image generation failed (${res.status})${res.status === 403 ? ' — your OpenAI organisation may need verification for image models' : ''}`)
  }
  const body = await res.json()
  const b64: string | undefined = body.data?.[0]?.b64_json
  if (!b64) throw new HttpError(502, 'Image model returned no image')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const admin = adminClient()
    const user = await requireUser(req, admin)
    if (!(await isAdmin(admin, user.id))) throw new HttpError(403, 'Only admins can create illustrations')

    const { segment_id } = (await req.json()) as { segment_id?: string }
    if (!segment_id) throw new HttpError(400, 'segment_id is required')

    const { data: seg, error } = await admin
      .from('lesson_segments')
      .select('id, title, content, lessons(title)')
      .eq('id', segment_id)
      .maybeSingle()
    if (error) throw new HttpError(500, error.message)
    if (!seg) throw new HttpError(404, 'Segment not found — save the lesson first')

    const lessonTitle = (seg.lessons as unknown as { title?: string } | null)?.title ?? ''
    const started = Date.now()
    const scene = await scenePrompt(seg.title, seg.content, lessonTitle)
    const image = await drawImage(scene)

    const path = `${segment_id}-${Date.now()}.webp`
    const storage = admin.storage.from('lesson-images')
    const { error: upErr } = await storage.upload(path, image, { contentType: 'image/webp', upsert: true })
    if (upErr) throw new HttpError(500, upErr.message)
    const url = storage.getPublicUrl(path).data.publicUrl
    const { error: dbErr } = await admin.from('lesson_segments').update({ image_url: url }).eq('id', segment_id)
    if (dbErr) throw new HttpError(500, dbErr.message)

    await admin.from('ai_logs').insert({ user_id: user.id, action: 'illustrate', model: IMAGE_MODEL, latency_ms: Date.now() - started, ok: true })
    return json({ image_url: url, scene })
  } catch (e) {
    console.error(e)
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, e instanceof HttpError ? e.status : 500)
  }
})
