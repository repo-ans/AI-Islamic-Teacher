/**
 * tts — the teacher's voice (ElevenLabs or Azure Speech).
 *
 * POST { text, lang }               → { audio_url }  any signed-in user
 *    Every sentence is synthesised once and cached in the `lesson-audio`
 *    bucket (keyed by voice + model + text), so repeated lines — greetings,
 *    check-ins, quiz questions — are free after the first student hears them.
 *    Only new text (e.g. live AI answers) costs credits, capped per student/day.
 * POST { text, lang, segment_id }   → { audio_url }  admin only: narrates a
 *    lesson segment and saves the URL on the segment.
 *
 * Arabic terms in the text ("Bismillah", "Ka'bah", "ﷺ") are spoken from Arabic
 * script so they sound Arabic, not English (see _shared/arabic-terms.ts).
 *
 * Secrets: TTS_PROVIDER (elevenlabs | azure), ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID,
 * ELEVENLABS_MODEL, ELEVENLABS_MODEL_OTHER, ELEVENLABS_MODEL_MIXED, AZURE_SPEECH_KEY,
 * AZURE_SPEECH_REGION, AZURE_TTS_VOICE, TTS_DAILY_LIMIT
 */
import { arabicPronunciation, hasArabic } from '../_shared/arabic-terms.ts'
import { adminClient, corsHeaders, HttpError, isAdmin, json, requireUser } from '../_shared/http.ts'

const MAX_SEGMENT_CHARS = 4000
const MAX_LINE_CHARS = 3000 // whole lesson segments are spoken through the cache too
const BUCKET = 'lesson-audio'

const AZURE_LOCALE: Record<string, string> = {
  en: 'en-US', bn: 'bn-BD', ar: 'ar-SA', ur: 'ur-PK', hi: 'hi-IN', id: 'id-ID', ms: 'ms-MY', tr: 'tr-TR', fr: 'fr-FR', es: 'es-ES', de: 'de-DE',
}

// Languages eleven_multilingual_v2 speaks; anything else (e.g. Bangla, Urdu) goes to eleven_v3.
const V2_LANGS = new Set(['en', 'ar', 'hi', 'id', 'ms', 'tr', 'fr', 'es', 'de'])

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!)

const provider = () => Deno.env.get('TTS_PROVIDER') ?? (Deno.env.get('ELEVENLABS_API_KEY') ? 'elevenlabs' : 'azure')

/**
 * Picks voice and model. English with Arabic terms stays on multilingual_v2
 * (it read the Arabic script best in listening tests); languages v2 can't
 * speak, such as Bangla, use eleven_v3. Admins may override both to compare samples.
 */
// The teacher's voice matches the student: female → Jessica, male → Will.
const VOICE_BY_GENDER = {
  female: () => Deno.env.get('ELEVENLABS_VOICE_FEMALE') ?? 'cgSgspJ2msm6clMCkdW9', // Jessica
  male: () => Deno.env.get('ELEVENLABS_VOICE_MALE') ?? 'bIHbv24MWmeRgasZH58o', // Will
}

function voiceConfig(lang: string, spoken: string, override: { model?: string; voice?: string } = {}, gender?: string) {
  if (provider() === 'elevenlabs') {
    const v2 = Deno.env.get('ELEVENLABS_MODEL') ?? 'eleven_multilingual_v2'
    const mixed = lang !== 'ar' && hasArabic(spoken)
    const model =
      override.model ??
      (!V2_LANGS.has(lang)
        ? (Deno.env.get('ELEVENLABS_MODEL_OTHER') ?? 'eleven_v3') // e.g. Bangla — v2 can't speak it
        : mixed
          ? (Deno.env.get('ELEVENLABS_MODEL_MIXED') ?? v2)
          : v2)
    const voice = override.voice ?? (gender === 'male' ? VOICE_BY_GENDER.male() : VOICE_BY_GENDER.female())
    return { provider: 'elevenlabs', voice, model }
  }
  return { provider: 'azure', voice: Deno.env.get('AZURE_TTS_VOICE') ?? 'en-US-AvaMultilingualNeural', model: AZURE_LOCALE[lang] ?? 'en-US' }
}

async function elevenlabs(text: string, voice: string, model: string): Promise<ArrayBuffer> {
  const key = Deno.env.get('ELEVENLABS_API_KEY')
  if (!key) throw new HttpError(500, 'ELEVENLABS_API_KEY is not set')
  // A warm, lively, slightly slower delivery suits young learners.
  // eleven_v3 only accepts stability 0 / 0.5 / 1.
  const voice_settings =
    model === 'eleven_v3'
      ? { stability: 0.5 }
      : {
          stability: Number(Deno.env.get('ELEVENLABS_STABILITY') ?? 0.4),
          similarity_boost: 0.75,
          style: Number(Deno.env.get('ELEVENLABS_STYLE') ?? 0.35),
          use_speaker_boost: true,
          speed: Number(Deno.env.get('ELEVENLABS_SPEED') ?? 0.93),
        }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model, voice_settings }),
  })
  if (!res.ok) {
    console.error('ElevenLabs', res.status, await res.text())
    throw new HttpError(502, `ElevenLabs error (${res.status})`)
  }
  return res.arrayBuffer()
}

async function azure(text: string, voice: string, locale: string): Promise<ArrayBuffer> {
  const key = Deno.env.get('AZURE_SPEECH_KEY')
  const region = Deno.env.get('AZURE_SPEECH_REGION')
  if (!key || !region) throw new HttpError(500, 'AZURE_SPEECH_KEY / AZURE_SPEECH_REGION are not set')
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${voice}"><lang xml:lang="${locale}">${escapeXml(text)}</lang></voice></speak>`
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
      'User-Agent': 'ilm-ai',
    },
    body: ssml,
  })
  if (!res.ok) {
    console.error('Azure TTS', res.status, await res.text())
    throw new HttpError(502, `Azure Speech error (${res.status})`)
  }
  return res.arrayBuffer()
}

function synthesize(text: string, cfg: ReturnType<typeof voiceConfig>) {
  return cfg.provider === 'elevenlabs' ? elevenlabs(text, cfg.voice, cfg.model) : azure(text, cfg.voice, cfg.model)
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const admin = adminClient()
    const user = await requireUser(req, admin)
    const { text, lang = 'en', segment_id, model, voice, action, gender } = (await req.json()) as {
      text?: string
      lang?: string
      segment_id?: string
      model?: string
      voice?: string
      action?: string
      gender?: string
    }
    const userIsAdmin = await isAdmin(admin, user.id)
    const modelOverride = userIsAdmin ? { model: model || undefined, voice: voice || undefined } : {}

    // ── Admin: list the ElevenLabs voices available on the account (for choosing the teacher's voice).
    // ── Admin: remaining ElevenLabs credits this billing period.
    if (action === 'quota') {
      if (!userIsAdmin) throw new HttpError(403, 'Only admins can view the voice quota')
      const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') ?? '' },
      })
      if (!res.ok) throw new HttpError(502, `ElevenLabs error (${res.status})`)
      const sub = await res.json()
      return json({
        tier: sub.tier,
        used: sub.character_count,
        limit: sub.character_limit,
        remaining: sub.character_limit - sub.character_count,
        resets_at: sub.next_character_count_reset_unix ? new Date(sub.next_character_count_reset_unix * 1000).toISOString() : null,
      })
    }

    if (action === 'voices') {
      if (!userIsAdmin) throw new HttpError(403, 'Only admins can list voices')
      const res = await fetch('https://api.elevenlabs.io/v2/voices?page_size=100', {
        headers: { 'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') ?? '' },
      })
      if (!res.ok) throw new HttpError(502, `ElevenLabs error (${res.status})`)
      const body = await res.json()
      return json({
        current: Deno.env.get('ELEVENLABS_VOICE_ID') ?? 'JBFqnCBsd6RMkjVDRZzb',
        voices: (body.voices ?? []).map((v: Record<string, unknown>) => ({
          id: v.voice_id,
          name: v.name,
          category: v.category,
          labels: v.labels,
          description: v.description,
          preview_url: v.preview_url,
        })),
      })
    }
    const storage = admin.storage.from(BUCKET)

    // ── Admin: narrate a lesson segment and store it on the segment.
    if (segment_id) {
      if (!userIsAdmin) throw new HttpError(403, 'Only admins can narrate lesson segments')
      const clean = arabicPronunciation((text ?? '').trim().slice(0, MAX_SEGMENT_CHARS))
      if (!clean) throw new HttpError(400, 'text is required')
      const audio = await synthesize(clean, voiceConfig(lang, clean, modelOverride, gender))
      const path = `${segment_id}-${Date.now()}.mp3`
      const { error: upErr } = await storage.upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
      if (upErr) throw new HttpError(500, upErr.message)
      const url = storage.getPublicUrl(path).data.publicUrl
      const { error: dbErr } = await admin.from('lesson_segments').update({ audio_url: url }).eq('id', segment_id)
      if (dbErr) throw new HttpError(500, dbErr.message)
      return json({ audio_url: url })
    }

    // ── Teacher lines: shared cache, then synthesise.
    const clean = arabicPronunciation((text ?? '').trim().slice(0, MAX_LINE_CHARS))
    if (!clean) throw new HttpError(400, 'text is required')
    const cfg = voiceConfig(lang, clean, modelOverride, gender)
    const hash = await sha256(`${cfg.provider}|${cfg.voice}|${cfg.model}|${clean}`)
    const path = `cache/${hash}.mp3`

    const { data: hit } = await storage.list('cache', { search: hash, limit: 1 })
    if (hit?.length) return json({ audio_url: storage.getPublicUrl(path).data.publicUrl, cached: true })

    if (!userIsAdmin) {
      const limit = Number(Deno.env.get('TTS_DAILY_LIMIT') ?? 80)
      const since = new Date()
      since.setUTCHours(0, 0, 0, 0)
      const { count } = await admin
        .from('ai_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('action', 'tts')
        .gte('created_at', since.toISOString())
      if ((count ?? 0) >= limit) throw new HttpError(429, 'Daily voice limit reached')
    }

    const started = Date.now()
    const audio = await synthesize(clean, cfg)
    const { error: upErr } = await storage.upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) throw new HttpError(500, upErr.message)
    await admin.from('ai_logs').insert({ user_id: user.id, action: 'tts', model: cfg.model, latency_ms: Date.now() - started, ok: true })
    return json({ audio_url: storage.getPublicUrl(path).data.publicUrl, cached: false })
  } catch (e) {
    console.error(e)
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, e instanceof HttpError ? e.status : 500)
  }
})
