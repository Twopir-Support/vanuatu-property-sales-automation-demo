import { CheckCircle2, CircleDashed, CircleSlash, Copy, PauseCircle, RotateCcw, Search, Wrench, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Drawer, Spinner } from '../components/ui/overlays'
import { ProductFrame } from '../components/ui/ProductFrame'
import type { AutomationEvent } from '../data/types'
import { ZAPS } from '../data/zaps'
import { cn, dateTime } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { markEventFixed, replayEvent } from '../store/engine'
import { AppBadge, ZapierAppNav } from './Zaps'

type RunStatus = 'Success' | 'Errored' | 'Halted' | 'Filtered' | 'Skipped' | 'Resolved'

function runStatus(e: AutomationEvent, processed: string[]): RunStatus {
  if (e.status === 'success') return 'Success'
  if (e.status === 'duplicate') return 'Skipped'
  if (e.status === 'blocked') return 'Filtered'
  if (processed.includes(e.idempotencyKey)) return 'Resolved'
  return e.errorClass === 'Validation' ? 'Halted' : 'Errored'
}

const STATUS_UI: Record<RunStatus, { Icon: typeof CheckCircle2; cls: string; note: string }> = {
  Success: { Icon: CheckCircle2, cls: 'text-[#136c2e]', note: 'All steps ran' },
  Errored: { Icon: XCircle, cls: 'text-rose-600', note: 'A step failed — retry available' },
  Halted: { Icon: PauseCircle, cls: 'text-amber-700', note: 'Stopped: required data missing — fix, then replay' },
  Filtered: { Icon: CircleSlash, cls: 'text-slate-500', note: 'Filter conditions not met — nothing written' },
  Skipped: { Icon: CircleDashed, cls: 'text-violet-600', note: 'Already processed (Storage by Zapier) — nothing written' },
  Resolved: { Icon: CheckCircle2, cls: 'text-slate-400', note: 'Errored earlier, succeeded on a later run' },
}

const zapFor = (e: AutomationEvent) => ZAPS.find((z) => z.name === e.scenario)
const runId = (e: AutomationEvent) => `run_${e.id.replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase()}`

export default function ZapHistory() {
  const { state } = useDemo()
  const [status, setStatus] = useState<RunStatus | 'All'>('All')
  const [zapId, setZapId] = useState('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const processed = state.processedKeys
  const rows = state.events.filter((e) => {
    if (status !== 'All' && runStatus(e, processed) !== status) return false
    if (zapId !== 'all' && zapFor(e)?.id !== zapId) return false
    if (q && !`${e.scenario} ${e.transaction} ${e.result}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })
  const count = (st: RunStatus) => state.events.filter((e) => runStatus(e, processed) === st).length
  const open = state.events.find((e) => e.id === openId)

  return (
    <ProductFrame product="Zapier">
      <div className="flex min-h-0 flex-1 bg-[#f7f6f3] text-[#2d2e2e]">
        <ZapierAppNav active="Zap History" />
        <section className="scroll-thin min-w-0 flex-1 overflow-y-auto">
          <div className="border-b border-[#e6e3dc] bg-white px-6 pt-4">
            <h1 className="text-xl font-semibold">Zap history</h1>
            <p className="text-sm text-slate-500">Every run of every Zap. Errored and halted runs wait here with their data — nothing is lost.</p>
            <nav className="mt-3 flex gap-5 text-sm">
              <span className="border-b-2 border-[#ff4f00] pb-2 font-semibold">Zap runs</span>
              <span className="pb-2 text-slate-500">Task usage</span>
              <span className="pb-2 text-slate-500">Alerts</span>
            </nav>
          </div>
          <div className="space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <select value={status} onChange={(e) => setStatus(e.target.value as RunStatus | 'All')} className="h-8 rounded-md border border-[#d6d2c8] bg-white px-2 text-sm" aria-label="Status">
                <option value="All">Status: All ({state.events.length})</option>
                {(['Success', 'Errored', 'Halted', 'Filtered', 'Skipped', 'Resolved'] as RunStatus[]).map((s) => <option key={s} value={s}>{s} ({count(s)})</option>)}
              </select>
              <select value={zapId} onChange={(e) => setZapId(e.target.value)} className="h-8 max-w-72 rounded-md border border-[#d6d2c8] bg-white px-2 text-sm" aria-label="Zap">
                <option value="all">Zap: All Zaps</option>
                {ZAPS.filter((z) => z.id !== 'flow').map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <div className="flex h-8 items-center gap-1.5 rounded-md border border-[#d6d2c8] bg-white px-2 text-sm">
                <Search size={13} className="text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search runs" className="w-40 outline-none" />
              </div>
              <span className="ml-auto text-xs text-slate-500">{rows.length} runs · LOT-025 plus example runs on LOT-024 / LOT-027</span>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#e6e3dc] bg-white">
              <table className="w-full text-[13px]">
                <thead className="bg-[#fbfaf8] text-left text-xs text-slate-500">
                  <tr>{['Status', 'Zap', 'Transaction', 'Started', 'Result'].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((e) => {
                    const st = runStatus(e, processed)
                    const { Icon, cls } = STATUS_UI[st]
                    const zap = zapFor(e)
                    const apps = zap ? [...new Set(zap.steps.filter((s) => !s.app.includes('Zapier')).map((s) => s.app))].slice(0, 3) : []
                    return (
                      <tr key={e.id} onClick={() => setOpenId(e.id)} className={cn('cursor-pointer border-t border-[#efece6] hover:bg-[#fbfaf8]', openId === e.id && 'bg-[#fff1eb]')}>
                        <td className="px-4 py-2.5 whitespace-nowrap"><span className={cn('inline-flex items-center gap-1.5 font-medium', cls)}><Icon size={15} /> {st}</span></td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2">
                            <span className="flex -space-x-1">{apps.map((a) => <AppBadge key={a} app={a} size={18} />)}</span>
                            <span className="font-medium">{e.scenario}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{e.transaction ?? 'TXN-HVR-025'}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{dateTime(e.at)}</td>
                        <td className="max-w-[340px] truncate px-4 py-2.5 text-slate-600" title={e.result}>{e.errorMessage ?? e.result}</td>
                      </tr>
                    )
                  })}
                  {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">No runs match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      {open && <RunDrawer e={open} onClose={() => setOpenId(null)} />}
    </ProductFrame>
  )
}

function RunDrawer({ e, onClose }: { e: AutomationEvent; onClose: () => void }) {
  const { state, run, runDelayed, busy } = useDemo()
  const st = runStatus(e, state.processedKeys)
  const { Icon, cls, note } = STATUS_UI[st]
  const zap = zapFor(e)
  const retrying = busy === `retry-${e.id}`
  const halted = st === 'Halted' && !e.fixed
  return (
    <Drawer
      open
      onClose={onClose}
      width={480}
      title={e.scenario}
      subtitle={<span className="font-mono">{runId(e)} · {e.transaction ?? 'TXN-HVR-025'} · {dateTime(e.at)}</span>}
      footer={
        <>
          <button onClick={() => runDelayed(`retry-${e.id}`, (s) => replayEvent(s, e.id), 1000)} disabled={halted || retrying || st === 'Resolved'} title={halted ? 'Fix the missing data first' : undefined}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#ff4f00] px-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40">
            {retrying ? <><Spinner size={12} /> Replaying…</> : <><RotateCcw size={13} /> {st === 'Errored' || st === 'Halted' ? 'Retry' : 'Replay'}</>}
          </button>
          {zap && <Link to={`/?zap=${zap.id}`} className="h-8 rounded-md border border-[#2d2e2e] px-3 text-sm leading-8 font-medium hover:bg-[#f7f6f3]">Open Zap</Link>}
        </>
      }
    >
      <div className="space-y-4 px-5 py-4 text-sm">
        <div className="rounded-md border border-[#e6e3dc] p-3">
          <p className={cn('flex items-center gap-1.5 font-semibold', retrying ? 'text-[#695be8]' : cls)}>{retrying ? <Spinner size={13} /> : <Icon size={15} />} {retrying ? 'Retrying' : st}</p>
          <p className="mt-0.5 text-xs text-slate-600">{note}</p>
          {(st === 'Errored' || st === 'Halted') && (
            <dl className="mt-2 grid grid-cols-[110px_1fr] gap-y-1 text-xs">
              <dt className="text-slate-500">Error</dt><dd className="font-medium">{e.errorMessage}</dd>
              <dt className="text-slate-500">Attempt</dt><dd>{e.attempt ?? 1} / 3</dd>
              <dt className="text-slate-500">Classification</dt><dd>{e.errorClass === 'Validation' ? 'Validation error (not retried automatically)' : 'Retryable'}</dd>
            </dl>
          )}
          {st === 'Halted' && !e.fixed && (
            <button onClick={() => run((s) => markEventFixed(s, e.id))} className="mt-2.5 inline-flex h-7 items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 text-xs font-medium text-amber-900 hover:bg-amber-100">
              <Wrench size={12} /> Simulate fix: settlement date added in Process Street
            </button>
          )}
        </div>

        {zap && (
          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">Steps</p>
            <ol className="space-y-1">
              {zap.steps.map((s, i) => {
                const failedHere = (st === 'Errored' || st === 'Halted') && i === Math.min(zap.steps.length - 1, e.errorClass === 'Validation' ? 1 : zap.steps.length - 2)
                const stoppedHere = st === 'Filtered' && s.kind === 'filter'
                return (
                  <li key={i} className="flex items-center gap-2 rounded-md bg-[#fbfaf8] px-2.5 py-1.5 text-[13px]">
                    <AppBadge app={s.app} size={18} />
                    <span className="flex-1 truncate">{i + 1}. {s.event}</span>
                    {failedHere ? <XCircle size={14} className="text-rose-600" /> : stoppedHere ? <CircleSlash size={14} className="text-slate-500" /> : st === 'Success' ? <CheckCircle2 size={14} className="text-[#136c2e]" /> : null}
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
          <dt className="text-slate-500">Trigger</dt><dd>{e.trigger}</dd>
          <dt className="text-slate-500">Result</dt><dd>{e.result}</dd>
          <dt className="text-slate-500">Storage key</dt>
          <dd className="flex items-start gap-1.5 font-mono text-xs break-all">{e.idempotencyKey}<button onClick={() => navigator.clipboard?.writeText(e.idempotencyKey).catch(() => undefined)} aria-label="Copy key"><Copy size={12} className="text-slate-400" /></button></dd>
          <dt className="text-slate-500">Duration</dt><dd>{(e.durationMs / 1000).toFixed(2)} s</dd>
        </dl>
        <div>
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">Data in</p>
          <pre className="scroll-thin max-h-56 overflow-auto rounded-md bg-[#2d2e2e] p-3 text-[11px] leading-relaxed text-[#ffd8c7]">{JSON.stringify(e.payload, null, 2)}</pre>
        </div>
      </div>
    </Drawer>
  )
}
