/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_TTS_ENABLED?: string
  readonly VITE_TTS_LIVE?: string
  readonly VITE_DEMO_MODE?: string
}
