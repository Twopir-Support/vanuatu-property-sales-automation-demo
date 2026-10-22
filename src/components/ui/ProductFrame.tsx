import { Info, Link2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IDS } from '../../data/ids'
import { cn } from '../../lib/format'

/**
 * Wraps a product-style view with an honest label: these are original components that
 * recreate familiar UI patterns, not the vendors' real software.
 */
export function ProductFrame({ product, children, className }: { product: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-1.5 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Info size={12} />
          Simulated {product}-style view · original demo component, not the {product} product · synthetic data
        </span>
        <CrossRef />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}

const refs: { label: string; id: string; to: string }[] = [
  { label: 'Txn', id: IDS.transaction, to: '/' },
  { label: 'Run', id: IDS.processStreetRun, to: '/workflow' },
  { label: 'Deal', id: IDS.hubspotDeal, to: '/crm/deal' },
  { label: 'Contract', id: IDS.contract, to: '/contracts' },
  { label: 'Folder', id: IDS.driveFolder, to: `/documents/${IDS.driveFolder}` },
  { label: 'Invoice', id: IDS.xeroInvoice, to: '/accounting/invoice' },
]

export function CrossRef() {
  return (
    <span className="hidden items-center gap-1 min-[1400px]:inline-flex">
      <Link2 size={12} />
      {refs.map((r, i) => (
        <span key={r.id} className="inline-flex items-center">
          <Link to={r.to} className="rounded px-1 font-mono text-slate-600 hover:bg-slate-100 hover:text-brand-700" title={`${r.label}: ${r.id}`}>
            {r.id}
          </Link>
          {i < refs.length - 1 && <span className="text-slate-300">·</span>}
        </span>
      ))}
    </span>
  )
}
