/**
 * Arabic pronunciation for the teacher's voice.
 *
 * Lessons are written with English transliterations ("Ka'bah", "Bismillah").
 * An English voice reads those with an English accent, so before synthesis
 * each known term is replaced with fully-vowelled Arabic script, which the
 * voice model pronounces the Arabic way. Only the *spoken* text changes —
 * what students read on screen stays the same.
 *
 * Add new terms here; longer phrases are matched before shorter ones.
 */
const TERMS: Array<[string | string[], string]> = [
  // ── phrases
  ['ﷺ', 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ'],
  [['Assalamu alaikum', 'As-salamu alaykum', 'Assalamu alaykum'], 'السَّلَامُ عَلَيْكُمْ'],
  [['Bismillah ar-Rahman ar-Rahim'], 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'],
  ['Bismillah', 'بِسْمِ اللَّهِ'],
  ['Alhamdulillah', 'الْحَمْدُ لِلَّهِ'],
  [['MashaAllah', "Masha'Allah", 'Masha Allah'], 'مَا شَاءَ اللَّهُ'],
  [['in shaa Allah', 'in sha Allah', 'InshaAllah', "in sha'Allah"], 'إِنْ شَاءَ اللَّهُ'],
  [['SubhanAllah', 'Subhan Allah'], 'سُبْحَانَ اللَّهِ'],
  [['JazakAllahu khairan', 'JazakAllah khair', 'JazakAllahu khayran'], 'جَزَاكَ اللَّهُ خَيْرًا'],
  ['Allahu Akbar', 'اللَّهُ أَكْبَرُ'],
  ['Ayat al-Kursi', 'آيَةَ الْكُرْسِيِّ'],
  ['Tawhid ar-Rububiyyah', 'تَوْحِيدَ الرُّبُوبِيَّةِ'],
  ['Tawhid al-Uluhiyyah', 'تَوْحِيدَ الْأُلُوهِيَّةِ'],
  ["Tawhid al-Asma' was-Sifat", 'تَوْحِيدَ الْأَسْمَاءِ وَالصِّفَاتِ'],
  ["Al-Isra' wal-Mi'raj", 'الْإِسْرَاءُ وَالْمِعْرَاجُ'],
  ["Iqra'", 'اقْرَأْ'],

  // ── surahs
  ['Al-Ikhlas', 'الْإِخْلَاصِ'],
  ['Al-Fil', 'الْفِيلِ'],
  ["Al-Ma'idah", 'الْمَائِدَةِ'],
  ["Al-'Alaq", 'الْعَلَقِ'],
  ['Al-Fatihah', 'الْفَاتِحَةِ'],
  [['Ya-Sin', 'Yasin'], 'يس'],

  // ── names
  ['Allah', 'اللَّه'],
  ['Muhammad', 'مُحَمَّد'],
  ['Ibrahim', 'إِبْرَاهِيم'],
  ["Isma'il", 'إِسْمَاعِيل'],
  ['Musa', 'مُوسَى'],
  ["'Isa", 'عِيسَى'],
  ['Nuh', 'نُوح'],
  ['Jibril', 'جِبْرِيل'],
  ["Mika'il", 'مِيكَائِيل'],
  ['Israfil', 'إِسْرَافِيل'],
  ['Munkar', 'مُنْكَر'],
  ['Nakir', 'نَكِير'],
  ['Quraysh', 'قُرَيْش'],
  ['Banu Hashim', 'بَنُو هَاشِم'],
  ['Abd al-Muttalib', 'عَبْدُ الْمُطَّلِب'],
  ['Abdullah', 'عَبْدُ اللَّه'],
  ['Aminah', 'آمِنَة'],
  ['Abu Talib', 'أَبُو طَالِب'],
  ['Abu Lahab', 'أَبُو لَهَب'],
  ["Halimah as-Sa'diyyah", 'حَلِيمَةُ السَّعْدِيَّة'],
  ['Abrahah', 'أَبْرَهَة'],
  ['Khadijah bint Khuwaylid', 'خَدِيجَةُ بِنْتُ خُوَيْلِد'],
  ['Khadijah', 'خَدِيجَة'],
  ['Waraqah ibn Nawfal', 'وَرَقَةُ بْنُ نَوْفَل'],
  ['Umar', 'عُمَر'],
  ["'Uthman", 'عُثْمَان'],
  ['Abu Bakr', 'أَبُو بَكْر'],
  ['Al-Amin', 'الْأَمِين'],
  ['As-Sadiq', 'الصَّادِق'],

  // ── places
  ["Ka'bah", 'الْكَعْبَة'],
  ['Makkah', 'مَكَّة'],
  ['Madinah', 'الْمَدِينَة'],
  ['Hira', 'حِرَاء'],

  // ── terms
  ['Quran', 'الْقُرْآن'],
  ['Surah', 'سُورَة'],
  ['Tawhid', 'التَّوْحِيد'],
  ['Rububiyyah', 'الرُّبُوبِيَّة'],
  ['Uluhiyyah', 'الْأُلُوهِيَّة'],
  ['shirk', 'الشِّرْك'],
  ['Islam', 'الْإِسْلَام'],
  ['Iman', 'الْإِيمَان'],
  ['Ihsan', 'الْإِحْسَان'],
  ['Qadar', 'الْقَدَر'],
  ['Jahiliyyah', 'الْجَاهِلِيَّة'],
  ['Sunnah', 'السُّنَّة'],
  ['shahadah', 'الشَّهَادَة'],
  ['Salah', 'الصَّلَاة'],
  ['Zakah', 'الزَّكَاة'],
  ['Hajj', 'الْحَجّ'],
  ['Ramadan', 'رَمَضَان'],
  ['wudu', 'الْوُضُوء'],
  ["du'a", 'الدُّعَاء'],
  ["Mi'raj", 'الْمِعْرَاج'],
  ["rak'ahs", 'رَكَعَات'],
  ["rak'ah", 'رَكْعَة'],
  ['Fajr', 'الْفَجْر'],
  ['Dhuhr', 'الظُّهْر'],
  ['Asr', 'الْعَصْر'],
  ['Maghrib', 'الْمَغْرِب'],
  ['Isha', 'الْعِشَاء'],
  ['Ustadh', 'أُسْتَاذ'],

  // ── Bangla transliterations of Arabic phrases (for the Bangla teacher lines)
  [['আসসালামু আলাইকুম', 'আস্সালামু আলাইকুম'], 'السَّلَامُ عَلَيْكُمْ'],
  ['বিসমিল্লাহ', 'بِسْمِ اللَّهِ'],
  ['আলহামদুলিল্লাহ', 'الْحَمْدُ لِلَّهِ'],
  ['মাশাআল্লাহ', 'مَا شَاءَ اللَّهُ'],
  [['ইনশাআল্লাহ', 'ইন শা আল্লাহ'], 'إِنْ شَاءَ اللَّهُ'],
  ['জাযাকাল্লাহু খাইরান', 'جَزَاكَ اللَّهُ خَيْرًا'],
  ['আল্লাহ', 'اللَّه'],
]

const APOSTROPHES = "['’‘ʿʾ`]"
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Each spelling as a whole-word, case-insensitive pattern, longest first. */
const RULES: Array<[RegExp, string]> = TERMS.flatMap(([spellings, arabic]) =>
  (Array.isArray(spellings) ? spellings : [spellings]).map((s) => [s, arabic] as const),
)
  .sort((a, b) => b[0].length - a[0].length)
  .map(([spelling, arabic]) => {
    const body = escape(spelling).replace(/'/g, `${APOSTROPHES}?`).replace(/[ -]/g, '[\\s-]?')
    return [new RegExp(`(?<![\\p{L}\\p{M}])${body}(?![\\p{L}\\p{M}])`, 'giu'), arabic] as [RegExp, string]
  })

const ARABIC_SCRIPT = /[؀-ۿ]/

/** Replaces transliterated Arabic with Arabic script for natural pronunciation. */
export function arabicPronunciation(text: string): string {
  let out = text
  for (const [re, arabic] of RULES) out = out.replace(re, ` ${arabic} `)
  // "the الْكَعْبَة" → drop the English article before an Arabic word that already has one.
  out = out.replace(/\bthe\s+(?=ال)/gi, '')
  return out.replace(/\s+([,.!?;:])/g, '$1').replace(/\s{2,}/g, ' ').trim()
}

export const hasArabic = (text: string) => ARABIC_SCRIPT.test(text)
