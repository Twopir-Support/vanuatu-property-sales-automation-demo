import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useDemo } from '../../store/DemoStore'
import { cn } from '../../lib/format'

const icons = { success: CheckCircle2, info: Info, warning: AlertTriangle, error: XCircle }
const colors = { success: 'text-emerald-600', info: 'text-sky-600', warning: 'text-amber-600', error: 'text-rose-600' }

export function Toaster() {
  const { toasts, dismiss } = useDemo()
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const Icon = icons[t.kind]
        return (
          <div key={t.id} className="animate-toast pointer-events-auto flex gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <Icon size={18} className={cn('mt-0.5 shrink-0', colors[t.kind])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              {t.message && <p className="mt-0.5 text-xs text-slate-600">{t.message}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="self-start rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
