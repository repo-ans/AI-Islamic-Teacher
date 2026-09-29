import { DEMO_MODE } from './env'

/**
 * App clock. In demo mode an offset can be added ("simulate tomorrow") so the
 * one-lesson-per-day unlock can be tested without waiting.
 */
const OFFSET_KEY = 'ilm-ai-day-offset'

export function dayOffset(): number {
  if (!DEMO_MODE) return 0
  try {
    return Number(localStorage.getItem(OFFSET_KEY) || 0)
  } catch {
    return 0
  }
}

export function setDayOffset(days: number) {
  try {
    localStorage.setItem(OFFSET_KEY, String(days))
  } catch {
    /* ignore */
  }
}

export function now(): Date {
  return new Date(Date.now() + dayOffset() * 86_400_000)
}

/** Local calendar day as yyyy-mm-dd. */
export function dayKey(d: Date | string = now()): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function hijriDate(d: Date = now()) {
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
  } catch {
    return ''
  }
}

export function greetingForHour(d: Date = now()) {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatDay(d: Date | string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat('en-GB', opts).format(typeof d === 'string' ? new Date(d) : d)
}
