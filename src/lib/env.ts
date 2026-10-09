export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

/** Demo mode keeps all data in localStorage so the app runs without a backend. */
export const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === 'true' || !SUPABASE_URL || !SUPABASE_ANON_KEY

/**
 * The `tts` edge function (ElevenLabs / Azure) is deployed: admins can narrate
 * segments once and store the MP3, which every student then replays for free.
 */
export const TTS_ENABLED = !DEMO_MODE && import.meta.env.VITE_TTS_ENABLED === 'true'

/**
 * Also synthesise segments that have no stored audio live, per student.
 * Off by default: it bills the TTS provider for every play.
 */
export const TTS_LIVE = TTS_ENABLED && import.meta.env.VITE_TTS_LIVE === 'true'
