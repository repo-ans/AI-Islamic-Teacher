import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { CourseColor } from '../lib/types'
import { cn, initials } from '../lib/utils'

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[24px] bg-white p-5 sm:p-6', className)} {...p} />
}

/** Inner tile with the dashed outline used throughout the reference design. */
export function Tile({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-dashed border-dash p-4', className)} {...p} />
}

type Variant = 'primary' | 'outline' | 'lime' | 'ghost' | 'brand' | 'danger' | 'soft'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-black',
  outline: 'border border-line bg-white text-ink hover:bg-soft',
  lime: 'bg-lime text-ink hover:bg-lime-strong',
  ghost: 'text-muted hover:bg-soft hover:text-ink',
  brand: 'bg-brand text-white hover:bg-brand-deep',
  danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-white',
  soft: 'bg-soft text-ink hover:bg-lilac',
}

/** Button styling, also used for links that look like buttons. */
export function buttonClasses(variant: Variant = 'primary', size: 'sm' | 'md' | 'lg' = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    size === 'sm' && 'h-8 px-3 text-xs',
    size === 'md' && 'h-10 px-4 text-sm',
    size === 'lg' && 'h-12 px-5 text-[15px]',
    VARIANTS[variant],
    className,
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  return (
    <button
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      {...p}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

export function IconButton({ className, ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'relative grid size-10 shrink-0 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-soft disabled:opacity-40',
        className,
      )}
      {...p}
    />
  )
}

type Tone = 'ok' | 'warn' | 'brand' | 'neutral' | 'danger' | 'lime' | 'ink'
const TONES: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  brand: 'bg-brand-soft text-brand',
  neutral: 'bg-soft text-muted',
  danger: 'bg-danger-soft text-danger',
  lime: 'bg-lime text-ink',
  ink: 'bg-ink text-white',
}

export function Pill({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap', TONES[tone], className)}>
      {children}
    </span>
  )
}

/** Row of dots used as a compact meter (as on the reference stat cards). */
export function DotMeter({
  value,
  max = 10,
  tone = 'ink',
  className,
}: {
  value: number
  max?: number
  tone?: 'ink' | 'brand' | 'lime' | 'lilac'
  className?: string
}) {
  const on = { ink: 'bg-ink', brand: 'bg-brand', lime: 'bg-lime-strong', lilac: 'bg-brand-dot' }[tone]
  const off = tone === 'lime' ? 'bg-ink/10' : 'bg-line'
  return (
    <div className={cn('flex gap-1.5', className)}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cn('size-2.5 rounded-full', i < value ? on : off)} />
      ))}
    </div>
  )
}

export function ProgressBar({ value, tone = 'ink', className }: { value: number; tone?: 'ink' | 'ok' | 'brand' | 'lime'; className?: string }) {
  const bar = { ink: 'bg-ink', ok: 'bg-ok', brand: 'bg-brand', lime: 'bg-lime-strong' }[tone]
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}>
      <div className={cn('h-full rounded-full transition-all', bar)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex rounded-full border border-line bg-white p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
            value === o.value ? 'bg-ink text-white' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn('size-5 animate-spin text-muted', className)} />
}

export function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Spinner className="size-7" />
    </div>
  )
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('grid size-9 shrink-0 place-items-center rounded-full bg-lilac text-xs font-semibold text-brand', className)}>
      {initials(name)}
    </span>
  )
}

const COURSE_TILE: Record<CourseColor, string> = {
  brand: 'bg-brand-soft text-brand',
  lime: 'bg-lime text-ink',
  amber: 'bg-warn-soft text-warn',
  ink: 'bg-ink text-white',
}

export function CourseBadge({ title, color, className }: { title: string; color: CourseColor; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-lg border border-line text-[11px] font-semibold uppercase',
        COURSE_TILE[color],
        className,
      )}
    >
      {title.slice(0, 2)}
    </span>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink">
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </span>
  )
}

// Full width unless the caller sizes the field itself (w-*, flex-1, min-w-*).
const sized = (c?: string) => !!c && /(^|\s)(w-|flex-1|min-w-)/.test(c)
const field =
  'rounded-xl border border-line bg-white px-3.5 text-sm text-ink placeholder:text-subtle outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-soft'

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, !sized(className) && 'w-full', 'h-11', className)} {...p} />
}

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(field, !sized(className) && 'w-full', 'h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', className)} {...p}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236e6e80' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
      {children}
    </select>
  )
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, !sized(className) && 'w-full', 'min-h-24 py-3 leading-relaxed', className)} {...p} />
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <Tile className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="mb-1 grid size-11 place-items-center rounded-full bg-soft text-muted">{icon}</div>
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </Tile>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{children}</p>
}
