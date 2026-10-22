import { ArrowRight, Waves, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, SectionTitle, type Tone } from '../components/ui/primitives'
import { COMPANY, IDS } from '../data/ids'
import { LOTS, type Lot, type LotStatus } from '../data/lots'
import { cn, vt } from '../lib/format'
import { useDemo } from '../store/DemoStore'

const statusTone: Record<LotStatus, Tone> = { Available: 'green', Reserved: 'amber', 'Under contract': 'blue', Sold: 'slate' }
const tile: Record<LotStatus, string> = {
  Available: 'bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-200',
  Reserved: 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200',
  'Under contract': 'bg-sky-100 border-sky-300 text-sky-900 hover:bg-sky-200',
  Sold: 'bg-slate-200 border-slate-300 text-slate-600 hover:bg-slate-300',
}

export default function LotSales() {
  const { state } = useDemo()
  const [filter, setFilter] = useState<LotStatus | 'All'>('All')
  const [sel, setSel] = useState<Lot | null>(LOTS.find((l) => l.id === IDS.lot) ?? null)
  const lots = LOTS.map((l) => (l.id === IDS.lot ? { ...l, status: (state.saleCompleted ? 'Sold' : 'Under contract') as LotStatus, price: state.transaction.salePrice, buyer: state.transaction.buyerName } : l))
  const rows = filter === 'All' ? lots : lots.filter((l) => l.status === filter)
  const selLot = sel ? lots.find((l) => l.id === sel.id) ?? null : null

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <SectionTitle title="Lot Sales" subtitle={`${COMPANY.development} · release register (synthetic)`} actions={<Link to="/workflow"><Button variant="primary">Open LOT-025 workflow <ArrowRight size={15} /></Button></Link>} />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Site plan</h2>
              <div className="flex flex-wrap gap-3 text-xs">
                {(Object.keys(tile) as LotStatus[]).map((s) => <span key={s} className="flex items-center gap-1.5"><span className={cn('size-3 rounded-sm border', tile[s])} /> {s}</span>)}
              </div>
            </div>
            <div className="rounded-lg bg-gradient-to-b from-sky-100 to-white p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-sky-700"><Waves size={14} /> Port Vila harbour</p>
              {(['Stage 1', 'Stage 2'] as const).map((stage) => (
                <div key={stage} className="mb-3">
                  <p className="mb-1.5 text-[11px] font-semibold text-slate-500 uppercase">{stage}</p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-9">
                    {lots.filter((l) => l.stage === stage).map((l) => (
                      <button key={l.id} onClick={() => setSel(l)} className={cn('rounded-md border-2 px-1 py-3 text-center text-xs font-semibold transition', tile[l.status], selLot?.id === l.id && 'ring-2 ring-brand-700 ring-offset-1', l.id === IDS.lot && 'outline-2 outline-dashed outline-brand-700')}>
                        {l.id.replace('LOT-', '')}
                        <span className="block text-[10px] font-normal opacity-75">{l.areaSqm} m²</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="mt-2 text-[11px] text-slate-500">Schematic only — not a survey plan.</p>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
              <h2 className="mr-auto font-semibold">Lot register</h2>
              {(['All', 'Available', 'Reserved', 'Under contract', 'Sold'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn('rounded-full px-3 py-1 text-xs', filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{f}</button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>{['Lot', 'Stage', 'Area', 'Outlook', 'List price', 'Status', 'Buyer', 'CRM deal'].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((l) => (
                    <tr key={l.id} onClick={() => setSel(l)} className={cn('cursor-pointer border-t border-slate-100 hover:bg-slate-50', l.id === IDS.lot && 'bg-brand-50/60', selLot?.id === l.id && 'bg-brand-50')}>
                      <td className="px-4 py-2 font-mono font-medium">{l.id}</td>
                      <td className="px-4 py-2">{l.stage}</td>
                      <td className="px-4 py-2">{l.areaSqm} m²</td>
                      <td className="px-4 py-2">{l.view}</td>
                      <td className="px-4 py-2 tabular-nums">{vt(l.price)}</td>
                      <td className="px-4 py-2"><Badge tone={statusTone[l.status]} dot>{l.status}</Badge></td>
                      <td className="px-4 py-2">{l.buyer ?? '—'}</td>
                      <td className="px-4 py-2 font-mono text-xs">{l.dealId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-6">
          {selLot ? (
            <div>
              <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="font-mono text-xs text-slate-500">{selLot.id}</p>
                  <h2 className="text-lg font-semibold">{selLot.stage} · {selLot.view} outlook</h2>
                  <Badge tone={statusTone[selLot.status]} dot className="mt-1">{selLot.status}</Badge>
                </div>
                <button onClick={() => setSel(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
              </div>
              <dl className="grid grid-cols-2 gap-4 px-5 py-4 text-sm">
                <div><dt className="text-xs text-slate-500">Price</dt><dd className="font-medium">{vt(selLot.price)}</dd></div>
                <div><dt className="text-xs text-slate-500">Area</dt><dd className="font-medium">{selLot.areaSqm} m²</dd></div>
                <div><dt className="text-xs text-slate-500">Buyer</dt><dd className="font-medium">{selLot.buyer ?? '—'}</dd></div>
                <div><dt className="text-xs text-slate-500">CRM deal</dt><dd className="font-mono text-xs">{selLot.dealId ?? '—'}</dd></div>
              </dl>
              {selLot.id === IDS.lot ? (
                <div className="space-y-2 border-t border-slate-200 px-5 py-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Linked records</p>
                  {[
                    ['Process Street run', IDS.processStreetRun, '/workflow'],
                    ['HubSpot deal', IDS.hubspotDeal, '/crm/deal'],
                    ['Sale contract', IDS.contract, '/contracts'],
                    ['Drive folder', IDS.driveFolder, `/documents/${IDS.driveFolder}`],
                    ['Xero invoice', IDS.xeroInvoice, '/accounting/invoice'],
                  ].map(([l, id, to]) => (
                    <Link key={id} to={to} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm hover:border-brand-600">
                      <span>{l}</span>
                      <span className="font-mono text-xs text-slate-500">{id} →</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">Only LOT-025 is wired end-to-end in this demo. In production every lot would follow the same automated workflow.</p>
              )}
            </div>
          ) : (
            <p className="p-5 text-sm text-slate-500">Select a lot on the plan or in the register.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
