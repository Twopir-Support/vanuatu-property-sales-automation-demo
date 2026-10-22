import { AlertTriangle, CircleCheck, Copy, PauseCircle, RotateCcw, Search, UserPlus, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ActionMenu, Drawer, Spinner } from '../components/ui/overlays'
import { USERS } from '../data/ids'
import type { AutomationEvent } from '../data/types'
import { cn, dateTime, time } from '../lib/format'
import { SYSTEMS } from '../lib/systems'
import { useDemo } from '../store/DemoStore'
import { assignEvent, markEventFixed, replayEvent } from '../store/engine'

type View = 'SUCCESS' | 'FAILED' | 'VALIDATION ERROR' | 'SKIPPED' | 'STOPPED BY FILTER'

function viewStatus(e: AutomationEvent, processed: string[]): { label: View | 'RESOLVED'; cls: string } {
  if (e.status === 'success') return { label: 'SUCCESS', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' }
  if (e.status === 'duplicate') return { label: 'SKIPPED', cls: 'bg-violet-50 text-violet-700 ring-violet-600/20' }
  if (e.status === 'blocked') return { label: 'STOPPED BY FILTER', cls: 'bg-amber-50 text-amber-800 ring-amber-600/25' }
  if (processed.includes(e.idempotencyKey)) return { label: 'RESOLVED', cls: 'bg-slate-100 text-slate-600 ring-slate-400/30' }
  if (e.errorClass === 'Validation') return { label: 'VALIDATION ERROR', cls: 'bg-orange-50 text-orange-800 ring-orange-600/25' }
  return { label: 'FAILED', cls: 'bg-rose-50 text-rose-700 ring-rose-600/25' }
}

const zapLabel = (e: AutomationEvent) => e.scenario.split(' · ')[0]


const SYS_LABEL: Partial<Record<string, string>> = { contracts: 'Contract Generator', automation: 'Zapier', inbox: 'Shared inbox' }
const sysName = (id: AutomationEvent['source']) => SYS_LABEL[id] ?? SYSTEMS[id].name

type Pill = 'Success' | 'Failed' | 'Pending' | 'Filtered' | 'Skipped' | 'Resolved'
function pill(e: AutomationEvent, processed: string[]): Pill {
  const v = viewStatus(e, processed).label
  return v === 'SUCCESS' ? 'Success' : v === 'SKIPPED' ? 'Skipped' : v === 'STOPPED BY FILTER' ? 'Filtered' : v === 'RESOLVED' ? 'Resolved' : v === 'VALIDATION ERROR' ? 'Pending' : 'Failed'
}
const PILL_CLS: Record<Pill, string> = {
  Success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Failed: 'bg-rose-50 text-rose-700 ring-rose-600/25',
  Pending: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  Filtered: 'bg-slate-100 text-slate-600 ring-slate-400/30',
  Skipped: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  Resolved: 'bg-slate-100 text-slate-500 ring-slate-400/30',
}
const message = (e: AutomationEvent) => e.errorMessage ?? e.result.split(' · ')[0].replace(/^Filter: stopped — /, 'Stopped: ')

export default function Monitor() {
  const { state, runDelayed, busy, run } = useDemo()
  const [filter, setFilter] = useState<'All' | 'Successful' | 'Failed' | 'Pending' | 'Other'>('All')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [refreshedAt, setRefreshedAt] = useState(() => new Date().toISOString())
  const [refreshing, setRefreshing] = useState(false)
  const processed = state.processedKeys
  const ids = eventIds(state.events)
  const rows = state.events.filter((e) => {
    const p = pill(e, processed)
    if (filter === 'Successful' && p !== 'Success') return false
    if (filter === 'Failed' && p !== 'Failed') return false
    if (filter === 'Pending' && p !== 'Pending') return false
    if (filter === 'Other' && !['Filtered', 'Skipped', 'Resolved'].includes(p)) return false
    if (q && !`${ids[e.id]} ${e.scenario} ${e.transaction} ${e.result}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })
  const count = (p: Pill[]) => state.events.filter((e) => p.includes(pill(e, processed))).length
  const tabs: [typeof filter, string, number][] = [
    ['All', 'All Events', state.events.length], ['Successful', 'Successful', count(['Success'])], ['Failed', 'Failed', count(['Failed'])], ['Pending', 'Pending', count(['Pending'])], ['Other', 'Filtered / skipped', count(['Filtered', 'Skipped', 'Resolved'])],
  ]
  const open = state.events.find((e) => e.id === openId)
  const refresh = () => { setRefreshing(true); window.setTimeout(() => { setRefreshing(false); setRefreshedAt(new Date().toISOString()) }, 600) }

  return (
    <div className="mx-auto max-w-[1440px] p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Automation Monitor — Success &amp; Error Handling</h1>
          <p className="text-sm text-slate-500">Every Zap run across all transactions. Failures wait here with a classification and an owner — nothing is lost silently.</p>
        </div>
        <Link to="/zaps" className="text-sm font-medium text-brand-700 hover:underline">Open Zaps →</Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2.5">
          {tabs.map(([k, label, n]) => (
            <button key={k} onClick={() => setFilter(k)} className={cn('rounded-md border px-2.5 py-1 text-xs font-medium', filter === k ? (k === 'Failed' ? 'border-rose-300 bg-rose-50 text-rose-700' : k === 'Pending' ? 'border-amber-300 bg-amber-50 text-amber-800' : k === 'Successful' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-blue-300 bg-blue-50 text-blue-700') : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {label} ({n})
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex h-7 items-center gap-1.5 rounded-md border border-slate-300 px-2 text-xs">
              <Search size={12} className="text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events" className="w-32 outline-none" />
            </div>
            <button onClick={refresh} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-blue-300 px-2.5 text-xs font-medium text-blue-700 hover:bg-blue-50">{refreshing ? <Spinner size={11} /> : <RotateCcw size={12} />} Refresh</button>
            <span className="text-xs text-slate-500">Last updated: {dateTime(refreshedAt)}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>{['Event ID', 'Workflow', 'Source', 'Destination', 'Transaction', 'Time', 'Status', 'Message', 'Actions'].map((h) => <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const p = pill(e, processed)
                const retrying = busy === `retry-${e.id}`
                const bills = e.scenario.includes('bills')
                return (
                  <tr key={e.id} onClick={() => setOpenId(e.id)} className={cn('cursor-pointer border-t border-slate-100 hover:bg-slate-50', openId === e.id && 'bg-brand-50')}>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-slate-600">{ids[e.id]}</td>
                    <td className="px-3 py-2 whitespace-nowrap" title={e.scenario}>{bills ? 'Supplier Bills' : 'Lot Sale'} <span className="text-[11px] text-slate-400">· {zapLabel(e)}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">{sysName(e.source)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{e.errorClass === 'Validation' ? 'Validation' : sysName(e.target)}</td>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{e.transaction ?? 'TXN-HVR-025'}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap text-slate-600">{time(e.at)}</td>
                    <td className="px-3 py-2"><span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', retrying ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : PILL_CLS[p])}>{retrying ? 'Retrying…' : p}</span></td>
                    <td className="max-w-[300px] truncate px-3 py-2 text-slate-700" title={e.result}>{message(e)}</td>
                    <td className="px-3 py-2 whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                      <span className="flex items-center gap-1">
                        {p === 'Failed' ? (
                          <button onClick={() => runDelayed(`retry-${e.id}`, (s) => replayEvent(s, e.id), 1100)} disabled={retrying} className="h-6 rounded bg-blue-600 px-2.5 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:opacity-50">Retry</button>
                        ) : p === 'Pending' ? (
                          <button onClick={() => setOpenId(e.id)} className="h-6 rounded bg-blue-600 px-2.5 text-[11px] font-semibold text-white hover:bg-blue-500">Resolve</button>
                        ) : (
                          <button onClick={() => setOpenId(e.id)} className="h-6 rounded border border-blue-300 px-2.5 text-[11px] font-medium text-blue-700 hover:bg-blue-50">View</button>
                        )}
                        <ActionMenu items={[
                          { label: 'View details', onClick: () => setOpenId(e.id) },
                          { label: 'Assign to Finance', onClick: () => run((s) => assignEvent(s, e.id, USERS.finance)), disabled: p !== 'Failed' && p !== 'Pending' },
                          { label: 'Copy storage key', onClick: () => navigator.clipboard?.writeText(e.idempotencyKey).catch(() => undefined) },
                        ]} />
                      </span>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-slate-500">No events match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && <EventDrawer e={open} id={ids[open.id]} onClose={() => setOpenId(null)} />}
    </div>
  )
}

/** Sequential, human-readable event IDs in time order (EVT-001 is the oldest). */
function eventIds(events: AutomationEvent[]) {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
  return Object.fromEntries(sorted.map((e, i) => [e.id, `EVT-${String(i + 1).padStart(3, '0')}`])) as Record<string, string>
}

function EventDrawer({ e, id, onClose }: { e: AutomationEvent; id: string; onClose: () => void }) {
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
      title={<span className="flex items-center gap-2"><span className="font-mono text-sm text-slate-500">{id}</span> {zapLabel(e)}</span>}
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
            <ul className="space-y-1 text-xs">{later.map((x) => <li key={x.id} className="flex justify-between"><span className="font-mono">{eventIds(state.events)[x.id]}</span><span>{viewStatus(x, state.processedKeys).label} · {time(x.at)}</span></li>)}</ul>
          </div>
        )}
      </div>
    </Drawer>
  )
}
