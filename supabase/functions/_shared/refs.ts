export interface Reference {
  source_type: 'quran' | 'hadith' | 'tafsir' | 'book'
  citation: string
  text: string
  arabic?: string | null
  url?: string | null
  verified?: boolean
}

const COLLECTIONS: Record<string, string> = {
  bukhari: 'Sahih al-Bukhari',
  muslim: 'Sahih Muslim',
  abudawud: 'Sunan Abi Dawud',
  tirmidhi: "Jami' at-Tirmidhi",
  nasai: "Sunan an-Nasa'i",
  ibnmajah: 'Sunan Ibn Majah',
  malik: 'Muwatta Malik',
  ahmad: 'Musnad Ahmad',
  riyadussalihin: 'Riyad as-Salihin',
  nawawi40: "An-Nawawi's Forty Hadith",
}

/** The API prefixes the first verse of every surah (except 1 and 9) with the Basmala. */
const stripBasmala = (arabic: string, surah: number, ayah: number) =>
  ayah === 1 && surah !== 1 && arabic.startsWith('بِسْمِ') ? arabic.split(' ').slice(4).join(' ') : arabic

const int = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}
const str = (v: unknown, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/**
 * Fetches the real Arabic + Sahih International text for a verse range.
 * Returns null if the verse does not exist (→ the AI hallucinated it).
 */
async function verifyQuran(surah: number, from: number, to: number) {
  const last = Math.min(to, from + 4)
  try {
    const verses = await Promise.all(
      Array.from({ length: last - from + 1 }, async (_, i) => {
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${from + i}/editions/quran-uthmani,en.sahih`)
        if (res.status === 404) return 'missing' as const
        if (!res.ok) throw new Error(String(res.status))
        const body = await res.json()
        return { arabic: stripBasmala(body.data[0].text as string, surah, from + i), english: body.data[1].text as string }
      }),
    )
    if (verses.some((v) => v === 'missing')) return null
    const ok = verses as Array<{ arabic: string; english: string }>
    return { arabic: ok[0].arabic, text: ok.map((v) => v.english).join(' ') + (to > last ? ' …' : '') }
  } catch {
    return 'unavailable' as const
  }
}

/** Validates model-produced references, builds canonical links and verifies Quran citations. */
export async function normalizeRefs(raw: unknown): Promise<Reference[]> {
  if (!Array.isArray(raw)) return []
  const out = await Promise.all(
    raw.slice(0, 4).map(async (r: Record<string, unknown>): Promise<Reference | null> => {
      const type = r?.source_type
      if (type === 'quran') {
        const surah = int(r.surah)
        const from = int(r.ayah_start ?? r.ayah)
        if (!surah || surah > 114 || !from) return null
        const to = Math.max(from, Math.min(int(r.ayah_end) ?? from, from + 10))
        const range = to > from ? `${from}-${to}` : `${from}`
        const verified = await verifyQuran(surah, from, to)
        if (verified === null) return null // verse doesn't exist — drop it
        const base = { source_type: 'quran' as const, citation: `Quran ${surah}:${range}`, url: `https://quran.com/${surah}/${range}` }
        return verified === 'unavailable'
          ? { ...base, text: str(r.text), verified: false }
          : { ...base, text: verified.text, arabic: verified.arabic, verified: true }
      }
      if (type === 'hadith') {
        const key = str(r.collection, 40).toLowerCase().replace(/[^a-z0-9]/g, '')
        const number = int(r.number)
        const name = COLLECTIONS[key]
        return {
          source_type: 'hadith',
          citation: name && number ? `${name} ${number}` : str(r.citation, 120) || 'Hadith',
          text: str(r.text),
          url: name && number ? `https://sunnah.com/${key}:${number}` : null,
        }
      }
      if (type === 'tafsir' || type === 'book') {
        const citation = str(r.citation, 160)
        if (!citation) return null
        return { source_type: type, citation, text: str(r.text), url: null }
      }
      return null
    }),
  )
  return out.filter((r): r is Reference => r !== null)
}
