import { BookMarked, BookOpen, ExternalLink, ScrollText, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchVerses, parseQuranRef, SOURCE_LABEL, type Verse } from '../lib/refs'
import type { Reference, SourceType } from '../lib/types'
import { cn } from '../lib/utils'
import { Modal } from './Modal'
import { Pill, Spinner } from './ui'

const ICON: Record<SourceType, typeof BookOpen> = {
  quran: BookOpen,
  hadith: ScrollText,
  tafsir: BookMarked,
  book: BookMarked,
}

const CHIP_TONE: Record<SourceType, string> = {
  quran: 'bg-ok-soft text-ok',
  hadith: 'bg-brand-soft text-brand',
  tafsir: 'bg-warn-soft text-warn',
  book: 'bg-soft text-muted',
}

export function ReferenceChips({ refs, onOpen, className }: { refs: Reference[]; onOpen: (r: Reference) => void; className?: string }) {
  if (!refs.length) return null
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {refs.map((r, i) => {
        const Icon = ICON[r.source_type] ?? BookMarked
        return (
          <button
            key={`${r.citation}-${i}`}
            onClick={() => onOpen(r)}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition hover:ring-2 hover:ring-ink/10', CHIP_TONE[r.source_type])}
          >
            <Icon className="size-3.5" />
            {r.citation}
          </button>
        )
      })}
    </div>
  )
}

export function ReferenceList({ refs, onOpen }: { refs: Reference[]; onOpen: (r: Reference) => void }) {
  return (
    <ul className="space-y-2">
      {refs.map((r, i) => {
        const Icon = ICON[r.source_type] ?? BookMarked
        return (
          <li key={`${r.citation}-${i}`}>
            <button
              onClick={() => onOpen(r)}
              className="flex w-full items-start gap-3 rounded-2xl border border-dashed border-dash p-3 text-left transition hover:border-ink/30 hover:bg-soft"
            >
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', CHIP_TONE[r.source_type])}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{r.citation}</span>
                <span className="line-clamp-2 text-xs text-muted">{r.text}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function ReferenceDrawer({ reference, onClose }: { reference: Reference; onClose: () => void }) {
  const quran = reference.source_type === 'quran' ? parseQuranRef(reference) : null
  const [verses, setVerses] = useState<Verse[] | null>(null)
  const [loading, setLoading] = useState(!!quran)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!quran) return
    let alive = true
    fetchVerses(quran.surah, quran.from, quran.to)
      .then((v) => alive && setVerses(v))
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [reference.citation])

  const Icon = ICON[reference.source_type] ?? BookMarked
  const linkLabel = reference.url?.includes('quran.com')
    ? 'Read on quran.com'
    : reference.url?.includes('sunnah.com')
      ? 'Read on sunnah.com'
      : 'Open source'

  return (
    <Modal onClose={onClose} side>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn('grid size-10 place-items-center rounded-xl', CHIP_TONE[reference.source_type])}>
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{SOURCE_LABEL[reference.source_type]}</p>
            <h3 className="font-semibold">{reference.citation}</h3>
          </div>
        </div>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
          <X className="size-5" />
        </button>
      </div>

      {quran && (
        <div className="mt-5 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner className="size-4" /> Loading verified text…
            </div>
          )}
          {verses?.map((v) => (
            <div key={v.key} className="rounded-2xl bg-soft p-4">
              <p className="arabic text-right text-2xl text-ink">{v.arabic}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">
                <span className="mr-1.5 text-xs font-medium text-muted">{v.key}</span>
                {v.translation}
              </p>
            </div>
          ))}
          {verses && (
            <Pill tone="ok">
              <ShieldCheck className="size-3.5" /> Text verified from the Quran (Sahih International)
            </Pill>
          )}
          {quran.to - quran.from > 6 && verses && <p className="text-xs text-muted">Showing the first 7 verses.</p>}
        </div>
      )}

      {(!quran || failed || !verses) && !loading && (
        <div className="mt-5 space-y-3">
          {reference.arabic && <p className="arabic rounded-2xl bg-soft p-4 text-right text-2xl">{reference.arabic}</p>}
          <blockquote className="rounded-2xl border border-dashed border-dash p-4 text-sm leading-relaxed">{reference.text}</blockquote>
          {reference.source_type === 'hadith' && (
            <p className="text-xs text-muted">Hadith wording is paraphrased from the English translation. Use the link below to read the full narration.</p>
          )}
        </div>
      )}

      {reference.url && (
        <a
          href={reference.url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-white hover:bg-black"
        >
          {linkLabel} <ExternalLink className="size-4" />
        </a>
      )}
    </Modal>
  )
}
