import { useEffect, type ReactNode } from 'react'
import { cn } from '../lib/utils'

export function Modal({ children, onClose, side, className }: { children: ReactNode; onClose: () => void; side?: boolean; className?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute animate-rise overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl shadow-ink/10 scroll-thin',
          side
            ? 'inset-y-3 right-3 left-3 sm:left-auto sm:w-[440px]'
            : 'top-1/2 left-1/2 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
