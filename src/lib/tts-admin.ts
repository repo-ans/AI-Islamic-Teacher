import { SUPABASE_ANON_KEY, SUPABASE_URL, TTS_ENABLED } from './env'
import { supabase } from './supabase'

export const canGenerateAudio = TTS_ENABLED
export const canGenerateImages = !!supabase

/** Admin only: creates an illustration (no people/faces) for a saved segment and stores it on the segment. */
export async function generateSegmentImage(segmentId: string): Promise<string> {
  if (!supabase) throw new Error('Image generation needs Supabase')
  const { data, error } = await supabase.functions.invoke('illustrate', { body: { segment_id: segmentId } })
  const body = (data ?? {}) as { image_url?: string; error?: string }
  if (error || !body.image_url) {
    let message = body.error
    // Surface the function's own error message instead of the generic "non-2xx" one.
    const ctx = (error as { context?: Response } | null)?.context
    if (!message && ctx?.json) message = ((await ctx.json().catch(() => ({}))) as { error?: string }).error
    throw new Error(message || error?.message || 'Image generation failed')
  }
  return body.image_url
}

/**
 * Admin only: narrates a saved segment with ElevenLabs/Azure, stores the MP3 in
 * the `lesson-audio` bucket and saves its URL on the segment.
 */
export async function generateSegmentAudio(segmentId: string, text: string): Promise<string> {
  if (!supabase) throw new Error('Audio generation needs Supabase')
  const { data } = await supabase.auth.getSession()
  const res = await fetch(`${SUPABASE_URL}/functions/v1/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${data.session?.access_token}`,
    },
    body: JSON.stringify({ text, lang: 'en', segment_id: segmentId }),
  })
  const json = (await res.json().catch(() => ({}))) as { audio_url?: string; error?: string }
  if (!res.ok || !json.audio_url) throw new Error(json.error || `TTS failed (${res.status})`)
  return json.audio_url
}
