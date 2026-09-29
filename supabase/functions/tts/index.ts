/**
 * tts — lesson narration with ElevenLabs or Azure Speech.
 *
 * POST { text, lang }                → audio/mpeg stream (any signed-in user)
 * POST { text, lang, segment_id }    → admin only: stores the MP3 in the
 *                                       `lesson-audio` bucket, saves it on the
 *                                       segment, returns { audio_url }
 *
 * Secrets: TTS_PROVIDER (elevenlabs | azure), ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID,
 * ELEVENLABS_MODEL, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, AZURE_TTS_VOICE
 */
import { adminClient, corsHeaders, HttpError, isAdmin, json, requireUser } from '../_shared/http.ts'

const MAX_CHARS = 4000

const AZURE_LOCALE: Record<string, string> = {
  en: 'en-US', bn: 'bn-BD', ar: 'ar-SA', ur: 'ur-PK', hi: 'hi-IN', id: 'id-ID', ms: 'ms-MY', tr: 'tr-TR', fr: 'fr-FR', es: 'es-ES', de: 'de-DE',
}

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!)

async function elevenlabs(text: string): Promise<ArrayBuffer> {
  const key = Deno.env.get('ELEVENLABS_API_KEY')
  if (!key) throw new HttpError(500, 'ELEVENLABS_API_KEY is not set')
  const voice = Deno.env.get('ELEVENLABS_VOICE_ID') ?? 'JBFqnCBsd6RMkjVDRZzb'
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: Deno.env.get('ELEVENLABS_MODEL') ?? 'eleven_multilingual_v2',
      voice_settings: { stability: 0.55, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok) {
    console.error('ElevenLabs', res.status, await res.text())
    throw new HttpError(502, `ElevenLabs error (${res.status})`)
  }
  return res.arrayBuffer()
}

async function azure(text: string, lang: string): Promise<ArrayBuffer> {
  const key = Deno.env.get('AZURE_SPEECH_KEY')
  const region = Deno.env.get('AZURE_SPEECH_REGION')
  if (!key || !region) throw new HttpError(500, 'AZURE_SPEECH_KEY / AZURE_SPEECH_REGION are not set')
  // Multilingual neural voices read most languages naturally.
  const voice = Deno.env.get('AZURE_TTS_VOICE') ?? 'en-US-AvaMultilingualNeural'
  const locale = AZURE_LOCALE[lang] ?? 'en-US'
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const admin = adminClient()
    const user = await requireUser(req, admin)
    const { text, lang = 'en', segment_id } = (await req.json()) as { text?: string; lang?: string; segment_id?: string }
    const clean = (text ?? '').trim().slice(0, MAX_CHARS)
    if (!clean) throw new HttpError(400, 'text is required')

    const provider = Deno.env.get('TTS_PROVIDER') ?? (Deno.env.get('ELEVENLABS_API_KEY') ? 'elevenlabs' : 'azure')
    const audio = provider === 'elevenlabs' ? await elevenlabs(clean) : await azure(clean, lang)

    if (!segment_id) {
      return new Response(audio, {
        headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=86400' },
      })
    }

    if (!(await isAdmin(admin, user.id))) throw new HttpError(403, 'Only admins can store lesson audio')
    const path = `${segment_id}-${Date.now()}.mp3`
    const { error: upErr } = await admin.storage.from('lesson-audio').upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) throw new HttpError(500, upErr.message)
    const { data } = admin.storage.from('lesson-audio').getPublicUrl(path)
    const { error: dbErr } = await admin.from('lesson_segments').update({ audio_url: data.publicUrl }).eq('id', segment_id)
    if (dbErr) throw new HttpError(500, dbErr.message)
    return json({ audio_url: data.publicUrl })
  } catch (e) {
    console.error(e)
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, e instanceof HttpError ? e.status : 500)
  }
})
