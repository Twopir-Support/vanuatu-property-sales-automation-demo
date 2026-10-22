import { ArrowRight, CheckCircle2, Copy, Filter, Hourglass, RotateCcw, ShieldCheck, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, SectionTitle, type Tone } from '../components/ui/primitives'
import type { AutomationEvent, EventStatus, SystemId } from '../data/types'
import { cn, dateTime, time } from '../lib/format'
import { SYSTEMS, SystemIcon } from '../lib/systems'
import { useDemo } from '../store/DemoStore'
import { replayEvent, ZAP } from '../store/engine'

const statusMeta: Record<EventStatus, { tone: Tone; label: string; Icon: typeof CheckCircle2 }> = {
  success: { tone: 'green', label: 'Success', Icon: CheckCircle2 },
  duplicate: { tone: 'violet', label: 'Duplicate suppressed', Icon: ShieldCheck },
  failed: { tone: 'red', label: 'Failed', Icon: XCircle },
  blocked: { tone: 'amber', label: 'Stopped by filter', Icon: Hourglass },
}

const SCENARIOS = [
  { name: ZAP.z1, trigger: 'Process Street: step 5 checked' },
  { name: ZAP.z2a, trigger: 'Process Street: step 6 checked' },
  { name: ZAP.z2b, trigger: 'Process Street: step 7 approved' },
  { name: ZAP.z2c, trigger: 'E-signature: signed' },
  { name: ZAP.z3, trigger: 'HubSpot: deal Closed Won' },
  { name: ZAP.z4, trigger: 'Xero: payment' },
  { name: ZAP.z5, trigger: 'Process Street: step 8 checked' },
  { name: ZAP.bills, trigger: 'New supplier email (later phase)' },
]

export default function Monitor() {
  const { state, run } = useDemo()
  const [status, setStatus] = useState<EventStatus | 'all'>('all')
  const [target, setTarget] = useState<SystemId | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(state.events[0]?.id ?? null)
  const events = state.events.filter((e) => (status === 'all' || e.status === status) && (target === 'all' || e.target === target))
  const open = state.events.find((e) => e.id === openId)
  const count = (s: EventStatus) => state.events.filter((e) => e.status === s).length

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <SectionTitle
        title="Automation Monitor"
        subtitle="Every simulated integration run, with idempotency keys, results and replay. In production this is the Zapier Zap history, plus a Storage by Zapier record of each processed key."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(statusMeta) as EventStatus[]).map((s) => {
          const m = statusMeta[s]
          return (
            <button key={s} onClick={() => setStatus(status === s ? 'all' : s)} className={cn('rounded-xl border bg-white p-4 text-left shadow-sm transition', status === s ? 'border-brand-600 ring-2 ring-brand-600/20' : 'border-slate-200 hover:border-slate-300')}>
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><m.Icon size={14} /> {m.label}</p>
              <p className="mt-1 text-2xl font-semibold">{count(s)}</p>
            </button>
          )
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
            <Filter size={14} className="text-slate-400" />
            <select value={target} onChange={(e) => setTarget(e.target.value as SystemId | 'all')} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
              <option value="all">All target systems</option>
              {(Object.keys(SYSTEMS) as SystemId[]).map((s) => <option key={s} value={s}>{SYSTEMS[s].name}</option>)}
            </select>
            {status !== 'all' && <Badge tone={statusMeta[status].tone}>{statusMeta[status].label} <button onClick={() => setStatus('all')}>×</button></Badge>}
            <span className="ml-auto text-xs text-slate-500">{events.length} runs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>{['Time', 'Scenario', 'Route', 'Result', 'Duration'].map((h) => <th key={h} className="px-4 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} onClick={() => setOpenId(e.id)} className={cn('cursor-pointer border-t border-slate-100', openId === e.id ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{time(e.at)}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{e.scenario}</p>
                      <p className="max-w-xs truncate font-mono text-[11px] text-slate-500">{e.idempotencyKey}</p>
                    </td>
                    <td className="px-4 py-2.5"><span className="flex items-center gap-1"><SystemIcon system={e.source} size={11} /><ArrowRight size={12} className="text-slate-400" /><SystemIcon system={e.target} size={11} /></span></td>
                    <td className="px-4 py-2.5"><Badge tone={statusMeta[e.status].tone} dot>{statusMeta[e.status].label}</Badge></td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 tabular-nums">{(e.durationMs / 1000).toFixed(2)} s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          {open ? <EventDetail e={open} onReplay={() => run((s) => replayEvent(s, open.id))} /> : <Card className="p-5 text-sm text-slate-500">Select a run to see details.</Card>}
          <Card className="overflow-hidden">
            <h3 className="border-b border-slate-200 px-5 py-3 font-semibold">Zaps</h3>
            <ul className="divide-y divide-slate-100">
              {SCENARIOS.map((s) => {
                const runs = state.events.filter((e) => e.scenario === s.name)
                const last = runs[0]
                return (
                  <li key={s.name} className="flex items-center gap-3 px-5 py-2.5">
                    <span className={cn('size-2 rounded-full', last ? (last.status === 'failed' ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-slate-300')} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-[11px] text-slate-500">{s.trigger}</p>
                    </div>
                    <span className="text-xs text-slate-500">{runs.length} runs</span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

function EventDetail({ e, onReplay }: { e: AutomationEvent; onReplay: () => void }) {
  const m = statusMeta[e.status]
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
        <m.Icon size={20} className={{ green: 'text-emerald-600', violet: 'text-violet-600', red: 'text-rose-600', amber: 'text-amber-600', blue: '', slate: '' }[m.tone]} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{e.scenario}</p>
          <p className="text-xs text-slate-500">{dateTime(e.at)} · {e.id}</p>
        </div>
        <Button size="sm" onClick={onReplay}><RotateCcw size={13} /> {e.status === 'failed' ? 'Retry' : 'Replay'}</Button>
      </div>
      <dl className="space-y-3 px-5 py-4 text-sm">
        <div><dt className="text-xs text-slate-500">Trigger</dt><dd>{e.trigger}</dd></div>
        <div><dt className="text-xs text-slate-500">Action</dt><dd>{SYSTEMS[e.source].name} → {SYSTEMS[e.target].name}: {e.action}</dd></div>
        <div><dt className="text-xs text-slate-500">Result</dt><dd>{e.result}</dd></div>
        <div>
          <dt className="text-xs text-slate-500">Idempotency key</dt>
          <dd className="flex items-center gap-2 font-mono text-xs break-all">{e.idempotencyKey} <button onClick={() => navigator.clipboard?.writeText(e.idempotencyKey).catch(() => undefined)} aria-label="Copy"><Copy size={12} className="text-slate-400" /></button></dd>
        </div>
        <div>
          <dt className="mb-1 text-xs text-slate-500">Payload (synthetic)</dt>
          <dd><pre className="scroll-thin max-h-48 overflow-auto rounded-md bg-slate-900 p-3 text-[11px] text-emerald-200">{JSON.stringify(e.payload, null, 2)}</pre></dd>
        </div>
      </dl>
      <p className="border-t border-slate-200 bg-slate-50 px-5 py-2.5 text-[11px] text-slate-500">
        Replaying a processed key is safe: the engine records a “duplicate suppressed” run and writes nothing. Failed runs never record their key, so a retry executes normally.
      </p>
    </Card>
  )
}
