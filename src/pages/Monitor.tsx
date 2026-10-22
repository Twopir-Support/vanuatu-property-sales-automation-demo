import { AlertTriangle, ArrowRight, CircleCheck, Copy, PauseCircle, RotateCcw, Search, UserPlus, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Drawer, Spinner } from '../components/ui/overlays'
import { USERS } from '../data/ids'
import type { AutomationEvent } from '../data/types'
import { cn, dateTime, time } from '../lib/format'
import { SYSTEMS, SystemIcon } from '../lib/systems'
import { useDemo } from '../store/DemoStore'
import { assignEvent, markEventFixed, replayEvent, ZAP } from '../store/engine'

type View = 'SUCCESS' | 'FAILED' | 'VALIDATION ERROR' | 'SKIPPED' | 'STOPPED BY FILTER'

function viewStatus(e: AutomationEvent, processed: string[]): { label: View | 'RESOLVED'; cls: string } {
  if (e.status === 'success') return { label: 'SUCCESS', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' }
  if (e.status === 'duplicate') return { label: 'SKIPPED', cls: 'bg-violet-50 text-violet-700 ring-violet-600/20' }
  if (e.status === 'blocked') return { label: 'STOPPED BY FILTER', cls: 'bg-amber-50 text-amber-800 ring-amber-600/25' }
  if (processed.includes(e.idempotencyKey)) return { label: 'RESOLVED', cls: 'bg-slate-100 text-slate-600 ring-slate-400/30' }
  if (e.errorClass === 'Validation') return { label: 'VALIDATION ERROR', cls: 'bg-orange-50 text-orange-800 ring-orange-600/25' }
  return { label: 'FAILED', cls: 'bg-rose-50 text-rose-700 ring-rose-600/25' }
}

const evtId = (e: AutomationEvent) => `EVT-${e.id.replace(/^ev-?/, '').replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase()}`
const zapLabel = (e: AutomationEvent) => e.scenario.split(' · ')[0]

const ZAP_LIST = [ZAP.z1, ZAP.z2a, ZAP.z2b, ZAP.z2c, ZAP.z3, ZAP.z4, ZAP.z5, ZAP.bills]

export default function Monitor() {
  const { state } = useDemo()
  const [filter, setFilter] = useState<'ALL' | View>('ALL')
  const [txn, setTxn] = useState('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const processed = state.processedKeys
  const txns = [...new Set(state.events.map((e) => e.transaction ?? 'TXN-HVR-025'))]
  const rows = state.events.filter((e) => {
    const v = viewStatus(e, processed).label
    if (filter !== 'ALL' && v !== filter) return false
    if (txn !== 'all' && (e.transaction ?? 'TXN-HVR-025') !== txn) return false
    if (q && !`${evtId(e)} ${e.scenario} ${e.idempotencyKey} ${e.result}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })
  const open = state.events.find((e) => e.id === openId)
  const today = state.events.filter((e) => new Date(e.at).toDateString() === new Date().toDateString())
  const openFailures = state.events.filter((e) => e.status === 'failed' && !processed.includes(e.idempotencyKey))
  const ok = today.filter((e) => e.status === 'success').length
  const counted = today.filter((e) => e.status === 'success' || e.status === 'failed').length
  const kpis: [string, string, string?][] = [
    ['Runs today', String(today.length)],
    ['Success rate', counted ? `${Math.round((ok / counted) * 100)}%` : '—'],
    ['Open failures', String(openFailures.filter((e) => e.errorClass !== 'Validation').length), openFailures.some((e) => e.errorClass !== 'Validation') ? 'text-rose-600' : undefined],
    ['Validation errors', String(openFailures.filter((e) => e.errorClass === 'Validation').length), openFailures.some((e) => e.errorClass === 'Validation') ? 'text-orange-700' : undefined],
    ['Duplicates skipped', String(state.events.filter((e) => e.status === 'duplicate').length)],
    ['Avg duration', today.length ? `${(today.reduce((a, e) => a + e.durationMs, 0) / today.length / 1000).toFixed(2)} s` : '—'],
  ]
  const chips: ('ALL' | View)[] = ['ALL', 'SUCCESS', 'FAILED', 'VALIDATION ERROR', 'STOPPED BY FILTER', 'SKIPPED']

  return (
    <div className="mx-auto max-w-[1440px] p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Automation Monitor</h1>
          <p className="text-sm text-slate-500">Every Zap run across all transactions. Nothing fails silently — failures wait here with a classification and an owner.</p>
        </div>
        <Link to="/zaps" className="text-sm font-medium text-brand-700 hover:underline">Open Zaps →</Link>
      </div>

      <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([k, v, cls]) => (
          <div key={k} className="border-r border-b border-slate-100 px-4 py-3 last:border-r-0">
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{k}</p>
            <p className={cn('text-xl font-semibold tabular-nums', cls)}>{v}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {chips.map((c) => (
              <button key={c} onClick={() => setFilter(c)} className={cn('rounded px-2 py-1 text-[11px] font-semibold tracking-wide', filter === c ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>{c}</button>
            ))}
          </div>
          <select value={txn} onChange={(e) => setTxn(e.target.value)} className="ml-auto rounded-md border border-slate-300 px-2 py-1 text-xs" aria-label="Transaction">
            <option value="all">All transactions</option>
            {txns.map((t) => <option key={t}>{t}</option>)}
          </select>
          <div className="flex h-7 items-center gap-1.5 rounded-md border border-slate-300 px-2 text-xs">
            <Search size={12} className="text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Event ID, key, result" className="w-40 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-left text-[11px] tracking-wide text-slate-500 uppercase">
              <tr>{['Event ID', 'Zap', 'Source → Destination', 'Transaction', 'Status', 'Duration', 'Attempts', 'Timestamp'].map((h) => <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const v = viewStatus(e, processed)
                return (
                  <tr key={e.id} onClick={() => setOpenId(e.id)} className={cn('cursor-pointer border-t border-slate-100 hover:bg-slate-50', openId === e.id && 'bg-brand-50')}>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-slate-600">{evtId(e)}</td>
                    <td className="px-3 py-2"><span className="font-medium whitespace-nowrap">{zapLabel(e)}</span><span className="block max-w-[260px] truncate text-[11px] text-slate-500">{e.scenario.split(' · ')[1]}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><SystemIcon system={e.source} size={10} />{SYSTEMS[e.source].name}<ArrowRight size={11} className="text-slate-400" /><SystemIcon system={e.target} size={10} />{SYSTEMS[e.target].name}</span></td>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{e.transaction ?? 'TXN-HVR-025'}</td>
                    <td className="px-3 py-2"><span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap ring-1 ring-inset', v.cls)}>{v.label}</span></td>
                    <td className="px-3 py-2 text-xs tabular-nums text-slate-600">{(e.durationMs / 1000).toFixed(2)} s</td>
                    <td className="px-3 py-2 text-xs tabular-nums text-slate-600">{e.attempt ?? 1} / 3</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap text-slate-600">{dateTime(e.at)}</td>
                  </tr>
                )
              })}
              {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500">No runs match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <p className="border-b border-slate-200 px-4 py-2.5 text-[13px] font-semibold">Zap health</p>
        <table className="w-full text-[13px]">
          <tbody>
            {ZAP_LIST.map((z) => {
              const runs = state.events.filter((e) => e.scenario === z)
              const last = runs[0]
              const failing = runs.some((e) => e.status === 'failed' && !processed.includes(e.idempotencyKey))
              return (
                <tr key={z} className="border-t border-slate-100 first:border-0">
                  <td className="w-8 px-4 py-2"><span className={cn('block size-2 rounded-full', failing ? 'bg-rose-500' : last ? 'bg-emerald-500' : 'bg-slate-300')} /></td>
                  <td className="py-2 font-medium">{z}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{runs.length} runs</td>
                  <td className="px-4 py-2 text-right text-xs text-slate-500">{last ? `last ${time(last.at)}` : 'no runs yet'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {open && <EventDrawer e={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function EventDrawer({ e, onClose }: { e: AutomationEvent; onClose: () => void }) {
  const { state, run, runDelayed, busy } = useDemo()
  const [payload, setPayload] = useState(false)
  const v = viewStatus(e, state.processedKeys)
  const isFailed = e.status === 'failed' && v.label !== 'RESOLVED'
  const validation = e.errorClass === 'Validation'
  const paused = isFailed && validation && !e.fixed
  const retrying = busy === `retry-${e.id}`
  const later = state.events.filter((x) => x.idempotencyKey === e.idempotencyKey && x.id !== e.id && x.at > e.at)

  return (
    <Drawer
      open
      onClose={onClose}
      width={480}
      title={<span className="flex items-center gap-2"><span className="font-mono text-sm text-slate-500">{evtId(e)}</span> {zapLabel(e)}</span>}
      subtitle={<span>{e.scenario.split(' · ')[1]} · {e.transaction ?? 'TXN-HVR-025'} · {dateTime(e.at)}</span>}
      footer={
        <>
          {e.status === 'failed' || e.status === 'blocked' || e.status === 'success' || e.status === 'duplicate' ? (
            <button
              onClick={() => runDelayed(`retry-${e.id}`, (s) => replayEvent(s, e.id), 1100)}
              disabled={paused || retrying || v.label === 'RESOLVED'}
              title={paused ? 'Validation errors are not retried until the data is fixed' : undefined}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40"
            >
              {retrying ? <><Spinner size={12} /> Retrying…</> : <><RotateCcw size={13} /> {isFailed ? 'Retry Now' : 'Replay'}</>}
            </button>
          ) : null}
          <button onClick={() => setPayload((p) => !p)} className="h-8 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">{payload ? 'Hide payload' : 'View Payload'}</button>
          {isFailed && (
            <button onClick={() => run((s) => assignEvent(s, e.id, USERS.finance))} disabled={e.assignedTo === USERS.finance} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <UserPlus size={13} /> {e.assignedTo ? `Assigned · ${e.assignedTo.split(' ')[0]}` : 'Assign to Finance'}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4 px-5 py-4 text-sm">
        <div className="flex items-center gap-2">
          <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ring-1 ring-inset', v.cls)}>{retrying ? 'RETRYING' : v.label}</span>
          <span className="text-xs text-slate-500">Attempt {e.attempt ?? 1} / 3 · {(e.durationMs / 1000).toFixed(2)} s</span>
        </div>

        {isFailed && (
          <div className={cn('rounded-md border p-3', validation ? 'border-orange-300 bg-orange-50' : 'border-rose-200 bg-rose-50')}>
            <p className={cn('flex items-center gap-1.5 font-semibold', validation ? 'text-orange-900' : 'text-rose-800')}>
              {validation ? <PauseCircle size={15} /> : <AlertTriangle size={15} />} Error: {e.errorMessage ?? 'Request failed'}
            </p>
            <dl className="mt-2 grid grid-cols-[120px_1fr] gap-y-1 text-xs">
              <dt className="text-slate-600">Attempt</dt><dd>{e.attempt ?? 1} / 3</dd>
              <dt className="text-slate-600">Classification</dt><dd className="font-semibold">{validation ? 'Validation Error' : 'Retryable'}</dd>
              <dt className="text-slate-600">Action</dt><dd>{validation ? (e.fixed ? 'Data fixed — ready to retry' : 'Automation paused. Not retried until the missing data is fixed.') : 'Automatic retry with backoff (2 attempts left), then alert the owner.'}</dd>
              {e.assignedTo && <><dt className="text-slate-600">Owner</dt><dd>{e.assignedTo}</dd></>}
            </dl>
            {validation && !e.fixed && (
              <button onClick={() => run((s) => markEventFixed(s, e.id))} className="mt-2.5 inline-flex h-7 items-center gap-1.5 rounded-md border border-orange-300 bg-white px-2.5 text-xs font-medium text-orange-900 hover:bg-orange-100">
                <Wrench size={12} /> Simulate fix: add settlement date in Process Street
              </button>
            )}
          </div>
        )}
        {v.label === 'RESOLVED' && <p className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><CircleCheck size={14} /> Resolved by a later successful run of the same key.</p>}

        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[13px]">
          <dt className="text-slate-500">Route</dt><dd>{SYSTEMS[e.source].name} → {SYSTEMS[e.target].name}</dd>
          <dt className="text-slate-500">Trigger</dt><dd>{e.trigger}</dd>
          <dt className="text-slate-500">Action</dt><dd>{e.action}</dd>
          <dt className="text-slate-500">Result</dt><dd>{e.result}</dd>
          <dt className="text-slate-500">Storage key</dt>
          <dd className="flex items-start gap-1.5 font-mono text-xs break-all">{e.idempotencyKey}<button onClick={() => navigator.clipboard?.writeText(e.idempotencyKey).catch(() => undefined)} aria-label="Copy key"><Copy size={12} className="text-slate-400" /></button></dd>
        </dl>

        {payload && <pre className="scroll-thin max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-[11px] text-emerald-200">{JSON.stringify(e.payload, null, 2)}</pre>}

        {later.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">Later runs of this key</p>
            <ul className="space-y-1 text-xs">{later.map((x) => <li key={x.id} className="flex justify-between"><span className="font-mono">{evtId(x)}</span><span>{viewStatus(x, state.processedKeys).label} · {time(x.at)}</span></li>)}</ul>
          </div>
        )}
      </div>
    </Drawer>
  )
}
