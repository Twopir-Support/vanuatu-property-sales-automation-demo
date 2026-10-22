import { ArrowRight, CheckCircle2, Circle, CircleDot, ExternalLink, PlayCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card } from '../components/ui/primitives'
import { COMPANY, IDS, USERS } from '../data/ids'
import { LOTS } from '../data/lots'
import { cn, date, dateTime, longDate, time, vt } from '../lib/format'
import { completedSteps, integrationStatuses } from '../lib/status'
import { SYSTEMS, SystemIcon } from '../lib/systems'
import { useDemo } from '../store/DemoStore'
import { hubspotHasPendingChanges } from '../store/engine'

function useNextAction() {
  const { state } = useDemo()
  if (hubspotHasPendingChanges(state)) return { label: 'Sync the latest buyer data to HubSpot', to: '/workflow?step=5', cta: 'Open step 5' }
  const step = state.steps.find((s) => s.status === 'pending')
  if (!step) return { label: 'Sale complete — review the Automation Monitor', to: '/monitor', cta: 'Open monitor' }
  if (step.id === 6) return { label: 'Generate the sale contract for LOT-025', to: '/workflow?step=6', cta: 'Open step 6' }
  if (step.id === 7) return { label: 'Director approval of contract CTR-LOT-025', to: '/workflow?step=7', cta: 'Open approval' }
  if (step.id === 8) return { label: 'Confirm settlement and complete the sale', to: '/workflow?step=8', cta: 'Open step 8' }
  return { label: `Complete “${step.title}”`, to: `/workflow?step=${step.id}`, cta: 'Open step' }
}

export default function Overview() {
  const { state } = useDemo()
  const next = useNextAction()
  const deals = state.hubspot.deals
  const openDeals = deals.filter((d) => d.stage !== 'Closed Won')
  const pipeline = openDeals.reduce((a, d) => a + d.amount, 0)
  const today = state.events.filter((e) => new Date(e.at).toDateString() === new Date().toDateString())
  const ok = today.filter((e) => e.status === 'success').length
  const dups = state.events.filter((e) => e.status === 'duplicate').length
  const failed = state.events.filter((e) => e.status === 'failed').length
  const done = completedSteps(state)
  const deal = deals.find((d) => d.id === IDS.hubspotDeal)!
  const sold = LOTS.filter((l) => l.status === 'Sold').length + (state.saleCompleted ? 1 : 0)

  const journey = [
    { system: 'process-street' as const, label: 'Workflow run', id: IDS.processStreetRun, to: '/workflow', status: `${done} of 8 steps`, done: done === 8 },
    { system: 'hubspot' as const, label: 'CRM deal', id: IDS.hubspotDeal, to: '/crm/deal', status: deal.stage, done: !hubspotHasPendingChanges(state) },
    { system: 'contracts' as const, label: 'Sale contract', id: IDS.contract, to: '/contracts', status: state.contract.status, done: state.contract.status === 'Approved' },
    { system: 'drive' as const, label: 'Drive folder', id: IDS.driveFolder, to: `/documents/${IDS.driveFolder}`, status: state.saleCompleted ? 'Archived' : 'Provisioned', done: true },
    { system: 'xero' as const, label: 'Deposit invoice', id: IDS.xeroInvoice, to: '/accounting/invoice', status: state.xero.invoice?.status ?? 'Waiting for milestone', done: !!state.xero.invoice },
  ]

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-brand-700 uppercase">{COMPANY.name} · {COMPANY.location}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sales operations overview</h1>
          <p className="text-sm text-slate-500">{COMPANY.development} · {longDate(new Date().toISOString())} · signed in as {USERS.sales}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/lots"><Button>View lot register</Button></Link>
          <Link to="/workflow"><Button variant="primary">Open LOT-025 workflow <ArrowRight size={15} /></Button></Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Open pipeline" value={vt(pipeline)} sub={`${openDeals.length} open deals · Lot Sales pipeline`} to="/crm" />
        <Kpi label="Lots sold · Harbour View" value={`${sold} / ${LOTS.length}`} sub={`${LOTS.filter((l) => l.status === 'Available').length} available · ${LOTS.filter((l) => l.status === 'Under contract').length} under contract`} to="/lots" />
        <Kpi label="Contracts awaiting approval" value={String((state.contract.status === 'Generated' ? 1 : 0) + 1)} sub="Includes LOT-024 (Priya Nair)" to="/contracts" />
        <Kpi label="Automation runs today" value={String(today.length)} sub={`${ok} succeeded · ${dups} duplicates suppressed · ${failed} failed`} to="/monitor" tone={failed ? 'red' : undefined} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Featured transaction */}
        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-xs text-slate-500">Featured transaction · <span className="font-mono">{IDS.transaction}</span></p>
              <h2 className="text-lg font-semibold">LOT-025 — {state.transaction.buyerName}</h2>
            </div>
            <Badge tone="blue" className="ml-1">{deal.stage}</Badge>
            <div className="ml-auto text-right">
              <p className="text-lg font-semibold">{vt(state.transaction.salePrice)}</p>
              <p className="text-xs text-slate-500">Settlement {date(state.transaction.settlementDate)} · {state.transaction.salesRep}</p>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium">{done} of 8 workflow steps completed</span>
              <span className="text-slate-500">{Math.round((done / 8) * 100)}%</span>
            </div>
            <div className="mb-5 flex gap-1">
              {state.steps.map((s) => (
                <Link key={s.id} to={`/workflow?step=${s.id}`} title={`${s.id}. ${s.title}`} className={cn('h-2 flex-1 rounded-full', s.status === 'complete' ? 'bg-emerald-500' : 'bg-slate-200 hover:bg-slate-300')} />
              ))}
            </div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">One transaction, five systems</p>
            <div className="grid gap-2 md:grid-cols-5">
              {journey.map((j, i) => (
                <Link key={j.id} to={j.to} className="group relative rounded-lg border border-slate-200 p-3 transition hover:border-brand-600 hover:shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <SystemIcon system={j.system} />
                    {j.done ? <CheckCircle2 size={16} className="text-emerald-500" /> : <CircleDot size={16} className="text-amber-500" />}
                  </div>
                  <p className="text-[11px] text-slate-500">{SYSTEMS[j.system].name}</p>
                  <p className="text-sm font-medium">{j.label}</p>
                  <p className="font-mono text-[11px] text-slate-500">{j.id}</p>
                  <p className="mt-1 text-xs text-slate-700">{j.status}</p>
                  {i < journey.length - 1 && <ArrowRight size={14} className="absolute top-1/2 -right-[13px] z-10 hidden -translate-y-1/2 rounded-full bg-white text-slate-400 md:block" />}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-brand-50 px-5 py-3">
            <PlayCircle size={20} className="text-brand-700" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-brand-900 uppercase">Next action in the demo</p>
              <p className="text-sm text-brand-900">{next.label}</p>
            </div>
            <Link to={next.to}><Button variant="primary" size="sm">{next.cta} <ArrowRight size={14} /></Button></Link>
          </div>
        </Card>

        {/* Integration health */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Integration status · LOT-025</h2>
            <Link to="/settings" className="text-xs text-brand-700 hover:underline">Connections</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {integrationStatuses(state).map((s) => (
              <li key={s.key}>
                <Link to={SYSTEMS[s.system].route} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                  <SystemIcon system={s.system} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="truncate text-xs text-slate-500">{s.detail}</p>
                  </div>
                  <Badge tone={s.tone} dot>{s.status.length > 22 ? s.status.slice(0, 22) + '…' : s.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {/* Activity */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Recent activity across systems</h2>
            <Link to="/monitor" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">Automation Monitor <ExternalLink size={11} /></Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {state.activity.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                <SystemIcon system={a.system} size={12} />
                <p className="flex-1 text-sm">{a.text}</p>
                <span className="text-xs whitespace-nowrap text-slate-500">{a.actor} · {time(a.at)}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Pipeline by stage */}
        <Card>
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Pipeline by stage</h2></div>
          <ul className="space-y-3 px-5 py-4">
            {['Enquiry', 'Lot Reserved', 'Documents Received', 'Contract Approval', 'Contract Approved', 'Closed Won'].map((stage) => {
              const ds = deals.filter((d) => d.stage === stage)
              const amt = ds.reduce((a, d) => a + d.amount, 0)
              const max = Math.max(...['Enquiry', 'Lot Reserved', 'Documents Received', 'Contract Approval', 'Contract Approved', 'Closed Won'].map((st) => deals.filter((d) => d.stage === st).reduce((a, d) => a + d.amount, 0)), 1)
              return (
                <li key={stage}>
                  <div className="mb-1 flex justify-between text-xs"><span>{stage} <span className="text-slate-400">({ds.length})</span></span><span className="tabular-nums text-slate-600">{vt(amt)}</span></div>
                  <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${(amt / max) * 100}%` }} /></div>
                </li>
              )
            })}
          </ul>
          <p className="border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-500">Last refreshed {dateTime(new Date().toISOString())} · synthetic data</p>
        </Card>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, to, tone }: { label: string; value: string; sub: string; to: string; tone?: 'red' }) {
  return (
    <Link to={to}>
      <Card className="h-full p-4 transition hover:border-brand-600 hover:shadow">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className={cn('mt-1 text-2xl font-semibold tracking-tight', tone === 'red' && 'text-rose-600')}>{value}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Circle size={6} className="fill-current" /> {sub}</p>
      </Card>
    </Link>
  )
}
