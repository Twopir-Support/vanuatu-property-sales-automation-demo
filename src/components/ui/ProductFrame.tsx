import { Info, Link2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { IDS } from '../../data/ids'
import { cn } from '../../lib/format'

/**
 * Wraps a product-style view with an honest label: these are original components that
 * recreate familiar UI patterns, not the vendors' real software.
 */
export function ProductFrame({ product, label, children, className }: { product: string; label?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-1.5 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Info size={12} />
          {label ?? `Simulated ${product}-style view · Original demo component · Synthetic data`}
        </span>
        <CrossRef />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}

const refs: { label: string; id: string }[] = [
  { label: 'Txn', id: IDS.transaction },
  { label: 'Run', id: IDS.processStreetRun },
  { label: 'Deal', id: IDS.hubspotDeal },
  { label: 'Contract', id: IDS.contract },
  { label: 'Folder', id: IDS.driveFolder },
  { label: 'Invoice', id: IDS.xeroInvoice },
]

export function CrossRef() {
  return (
    <span className="hidden items-center gap-1 min-[1400px]:inline-flex">
      <Link2 size={12} />
      {refs.map((r, i) => (
        <span key={r.id} className="inline-flex items-center">
          <span className="rounded px-1 font-mono text-slate-600" title={`${r.label}: ${r.id}`}>{r.id}</span>
          {i < refs.length - 1 && <span className="text-slate-300">·</span>}
        </span>
      ))}
    </span>
  )
}
