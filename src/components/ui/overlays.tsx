import { MoreHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/format'

export function Spinner({ size = 14, className }: { size?: number; className?: string }) {
  return <span className={cn('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className)} style={{ width: size, height: size }} aria-label="Loading" />
}

/** Right-hand side panel used for record previews and run details. */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 440 }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 top-7 z-[58] flex justify-end bg-slate-900/25" onMouseDown={onClose}>
      <aside className="flex h-full w-full flex-col bg-white shadow-2xl" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold text-slate-900">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </aside>
    </div>
  )
}

/** Confirmation dialog with explicit consequences — used before anything that writes to another system. */
export function ConfirmDialog({
  open, title, children, confirmLabel, onConfirm, onCancel, tone = 'primary', confirmClassName,
}: { open: boolean; title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; tone?: 'primary' | 'danger'; confirmClassName?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 top-7 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onCancel}>
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className="px-5 pt-4 pb-2"><h2 className="text-base font-semibold text-slate-900">{title}</h2></div>
        <div className="px-5 pb-4 text-sm text-slate-600">{children}</div>
        <div className="flex justify-end gap-2 rounded-b-lg border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button onClick={onCancel} className="h-8 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button
            onClick={onConfirm}
            className={cn('h-8 rounded-md px-3 text-sm font-semibold text-white', tone === 'danger' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-brand-700 hover:bg-brand-600', confirmClassName)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export interface MenuItem {
  label: string
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
  icon?: ReactNode
}

/** Small contextual “⋯” menu. */
export function ActionMenu({ items, label = 'More actions', trigger, align = 'right' }: { items: MenuItem[]; label?: string; trigger?: ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      >
        {trigger ?? <MoreHorizontal size={16} />}
      </button>
      {open && (
        <div role="menu" className={cn('absolute top-full z-40 mt-1 min-w-48 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg', align === 'right' ? 'right-0' : 'left-0')}>
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              disabled={it.disabled}
              onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick?.() }}
              className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40', it.danger ? 'text-rose-600' : 'text-slate-700')}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
