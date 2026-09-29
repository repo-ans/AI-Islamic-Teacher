import type { Reference, SourceType } from './types'

export const SOURCE_LABEL: Record<SourceType, string> = {
  quran: 'Quran',
  hadith: 'Hadith',
  tafsir: 'Tafsir',
  book: 'Scholarly work',
}

/** Extracts surah/ayah range from "Quran 2:255", "Quran 96:1-5" or a quran.com URL. */
export function parseQuranRef(ref: Pick<Reference, 'citation' | 'url'>): { surah: number; from: number; to: number } | null {
  const m = ref.citation.match(/(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/)
  if (m) {
    const surah = +m[1]
    const from = +m[2]
    const to = m[3] ? +m[3] : from
    if (surah >= 1 && surah <= 114) return { surah, from, to: Math.max(from, to) }
  }
  const u = ref.url?.match(/quran\.com\/(\d{1,3})(?:\/(\d{1,3})(?:-(\d{1,3}))?)?/)
  if (u && u[2]) return { surah: +u[1], from: +u[2], to: u[3] ? +u[3] : +u[2] }
  return null
}

export interface Verse {
  key: string
  arabic: string
  translation: string
  surahName: string
}

const verseCache = new Map<string, Promise<Verse[]>>()

/** Fetches verified Arabic + Sahih International text (max 7 verses) from the public Quran API. */
export function fetchVerses(surah: number, from: number, to: number): Promise<Verse[]> {
  const last = Math.min(to, from + 6)
  const cacheKey = `${surah}:${from}-${last}`
  const hit = verseCache.get(cacheKey)
  if (hit) return hit

  const p = Promise.all(
    Array.from({ length: last - from + 1 }, async (_, i) => {
      const key = `${surah}:${from + i}`
      const res = await fetch(`https://api.alquran.cloud/v1/ayah/${key}/editions/quran-uthmani,en.sahih`)
      if (!res.ok) throw new Error('Quran API unavailable')
      const json = (await res.json()) as { data: Array<{ text: string; surah: { englishName: string } }> }
      let arabic = json.data[0].text
      // The API prefixes the first verse of each surah (except Al-Fatihah) with the Basmala.
      if (from + i === 1 && surah !== 1 && arabic.startsWith('بِسْمِ')) arabic = arabic.split(' ').slice(4).join(' ')
      return { key, arabic, translation: json.data[1].text, surahName: json.data[0].surah.englishName }
    }),
  )
  verseCache.set(cacheKey, p)
  p.catch(() => verseCache.delete(cacheKey))
  return p
}
