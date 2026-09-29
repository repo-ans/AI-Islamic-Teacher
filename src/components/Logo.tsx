import { cn } from '../lib/utils'

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-ink">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path d="M15.4 4.2a8 8 0 1 0 4.2 12.7A6.4 6.4 0 1 1 15.4 4.2Z" fill="#dff77e" />
          <path d="m17.6 6.2.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5.5-1.3Z" fill="#dff77e" />
        </svg>
      </span>
      <span className={cn('text-lg font-semibold tracking-tight', light ? 'text-white' : 'text-ink')}>Ilm AI</span>
    </span>
  )
}
