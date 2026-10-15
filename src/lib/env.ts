export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

/** Demo mode keeps all data in localStorage so the app runs without a backend. */
export const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === 'true' || !SUPABASE_URL || !SUPABASE_ANON_KEY

/**
 * The `tts` edge function (ElevenLabs / Azure) is deployed: the whole teacher
 * speaks in that voice. Audio is cached server-side, so each sentence is billed once.
 */
export const TTS_ENABLED = !DEMO_MODE && import.meta.env.VITE_TTS_ENABLED === 'true'
