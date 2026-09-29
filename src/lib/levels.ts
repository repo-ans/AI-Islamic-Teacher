import type { Level } from './types'

export const LEVELS: Array<{ id: Level; label: string; blurb: string; emoji: string }> = [
  { id: 'child', label: 'Child', blurb: 'Ages 6–12 · short sentences, stories and simple words', emoji: '🧒' },
  { id: 'teen', label: 'Teen', blurb: 'Ages 13–17 · relatable examples and clear reasoning', emoji: '🎒' },
  { id: 'adult', label: 'Adult Muslim', blurb: 'Deeper explanations with more references', emoji: '📚' },
  { id: 'new_muslim', label: 'New Muslim', blurb: 'Gentle pace, every Arabic term explained', emoji: '🌱' },
  { id: 'non_muslim', label: 'Exploring Islam', blurb: 'Not Muslim — curious to learn, no assumptions', emoji: '🧭' },
]

export const levelLabel = (l: Level | null | undefined) => LEVELS.find((x) => x.id === l)?.label ?? 'Learner'

export function suggestLevel(age: number | null): Level | null {
  if (!age) return null
  if (age <= 12) return 'child'
  if (age <= 17) return 'teen'
  return null
}

export const LANGUAGES: Array<{ code: string; label: string; speech: string }> = [
  { code: 'en', label: 'English', speech: 'en-US' },
  { code: 'bn', label: 'বাংলা (Bangla)', speech: 'bn-BD' },
  { code: 'ar', label: 'العربية (Arabic)', speech: 'ar-SA' },
  { code: 'ur', label: 'اردو (Urdu)', speech: 'ur-PK' },
  { code: 'hi', label: 'हिन्दी (Hindi)', speech: 'hi-IN' },
  { code: 'id', label: 'Bahasa Indonesia', speech: 'id-ID' },
  { code: 'ms', label: 'Bahasa Melayu', speech: 'ms-MY' },
  { code: 'tr', label: 'Türkçe', speech: 'tr-TR' },
  { code: 'fr', label: 'Français', speech: 'fr-FR' },
  { code: 'es', label: 'Español', speech: 'es-ES' },
  { code: 'de', label: 'Deutsch', speech: 'de-DE' },
]

export const languageLabel = (code: string) => LANGUAGES.find((l) => l.code === code)?.label ?? code
export const speechLang = (code: string) => LANGUAGES.find((l) => l.code === code)?.speech ?? 'en-US'

export const COUNTRIES = [
  'Bangladesh', 'India', 'Pakistan', 'Indonesia', 'Malaysia', 'Saudi Arabia', 'United Arab Emirates', 'Qatar',
  'Kuwait', 'Egypt', 'Turkey', 'Morocco', 'Nigeria', 'United Kingdom', 'United States', 'Canada', 'Australia',
  'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'South Africa', 'Singapore', 'Other',
]
