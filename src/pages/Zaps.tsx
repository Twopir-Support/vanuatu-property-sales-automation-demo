import { CheckCircle2, ChevronRight, CircleDashed, History, Play, Power, XCircle, Zap as ZapIcon } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../components/ui/primitives'
import { ProductFrame } from '../components/ui/ProductFrame'
import { USERS } from '../data/ids'
import type { DemoState } from '../data/types'
import { APP_STYLE, FLOWS, ZAPS, type ZapDef, type ZapStep } from '../data/zaps'
import { cn, dateTime, time } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { approveContract, createXeroInvoice, generateContract, signContract, syncHubSpot, toggleStep, type Result } from '../store/engine'

/** “Run now” for the LOT-025 test record — goes through the same engine as the workflow screens. */
const RUNNERS: Record<string, (s: DemoState) => Result> = {
  z1: (s) => (s.steps[4].status === 'pending' ? toggleStep(s, 5, USERS.sales) : syncHubSpot(s, 'Zapier: Run now')),
  z2a: (s) => (s.steps[5].status === 'pending' ? toggleStep(s, 6, USERS.sales) : generateContract(s, 'Zapier: Run now')),
  z2b: (s) => (s.steps[6].status === 'pending' ? toggleStep(s, 7, USERS.director) : approveContract(s, USERS.director, 'Zapier: Run now')),
  z2c: (s) => signContract(s, 'Zapier: Run now'),
  z3: (s) => createXeroInvoice(s, 'Zapier: Run now'),
}

function AppBadge({ app, size = 32 }: { app: ZapStep['app']; size?: number }) {
  const st = APP_STYLE[app]
  return (
    <span className="flex shrink-0 items-center justify-center rounded-md text-[11px] font-bold" style={{ width: size, height: size, background: st.bg, color: st.fg }} title={app}>
      {st.short}
    </span>
  )
}

export default function Zaps() {
  const { state, run } = useDemo()
  const [params, setParams] = useSearchParams()
  const zap = ZAPS.find((z) => z.id === params.get('zap')) ?? ZAPS[0]
  const [stepIdx, setStepIdx] = useState(0)
  const [tab, setTab] = useState<'editor' | 'runs'>('editor')
  const step = zap.steps[Math.min(stepIdx, zap.steps.length - 1)]
  const runs = state.events.filter((e) => e.scenario === zap.name)
  const open = (id: string) => { setParams({ zap: id }); setStepIdx(0) }
  const flow = FLOWS.find((f) => f.n === zap.flow)!

  return (
    <ProductFrame product="Zapier">
      <div className="flex min-h-0 flex-1 bg-[#f7f6f3] text-[#2d2e2e]">
        {/* Zap list */}
        <aside className="scroll-thin hidden w-72 shrink-0 overflow-y-auto border-r border-[#e6e3dc] bg-white md:block">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="flex size-7 items-center justify-center rounded bg-[#ff4f00] text-white"><ZapIcon size={15} /></span>
            <p className="font-semibold">Zaps</p>
            <span className="ml-auto text-xs text-slate-500">Pacific Horizon</span>
          </div>
          {FLOWS.map((f) => (
            <div key={f.n} className="pb-2">
              <p className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{f.title}</p>
              {ZAPS.filter((z) => z.flow === f.n).map((z) => {
                const last = state.events.find((e) => e.scenario === z.name)
                return (
                  <button key={z.id} onClick={() => open(z.id)} className={cn('flex w-full items-start gap-2 px-4 py-2 text-left', z.id === zap.id ? 'bg-[#fff1eb]' : 'hover:bg-slate-50')}>
                    <span className="mt-0.5 flex -space-x-1">{[...new Set(z.steps.filter((s) => !s.app.includes('Zapier')).map((s) => s.app))].slice(0, 3).map((a) => <AppBadge key={a} app={a} size={18} />)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug font-medium">{z.name.replace(/^Zap \S+ · /, '')}</span>
                      <span className="text-[11px] text-slate-500">{z.name.split(' · ')[0]} · {last ? `last run ${time(last.at)}` : 'no runs yet'}</span>
                    </span>
                    <Power size={13} className={z.flow === 4 && z.id === 'z6' ? 'mt-1 text-slate-300' : 'mt-1 text-emerald-600'} />
                  </button>
                )
              })}
            </div>
          ))}
        </aside>

        {/* Editor */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#e6e3dc] bg-white px-5 py-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{flow.title}</p>
              <h1 className="truncate text-lg font-semibold">{zap.name}</h1>
            </div>
            <Badge tone={zap.id === 'z6' ? 'slate' : 'green'} dot>{zap.id === 'z6' ? 'Draft · later phase' : 'Published · On'}</Badge>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex overflow-hidden rounded-md border border-[#e6e3dc] text-sm">
                <button onClick={() => setTab('editor')} className={cn('px-3 py-1.5', tab === 'editor' ? 'bg-[#2d2e2e] text-white' : 'bg-white')}>Editor</button>
                <button onClick={() => setTab('runs')} className={cn('flex items-center gap-1 px-3 py-1.5', tab === 'runs' ? 'bg-[#2d2e2e] text-white' : 'bg-white')}><History size={13} /> Zap runs ({runs.length})</button>
              </div>
              {RUNNERS[zap.id] && (
                <button onClick={() => run(RUNNERS[zap.id])} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#ff4f00] px-3 text-sm font-semibold text-white hover:brightness-110">
                  <Play size={13} /> Run on LOT-025
                </button>
              )}
            </div>
          </div>
          <div className="border-b border-[#e6e3dc] bg-[#fffaf5] px-5 py-2.5 text-sm">
            <p className="mb-1 text-xs font-semibold text-[#b33a00]">What this flow does</p>
            <ul className="list-disc space-y-0.5 pl-5 text-[13px] text-slate-700">{flow.lines.map((l) => <li key={l}>{l}</li>)}</ul>
          </div>

          {tab === 'editor' ? (
            <div className="flex min-h-0 flex-1">
              <div className="scroll-thin min-w-0 flex-1 overflow-y-auto bg-[radial-gradient(#ddd9cf_1px,transparent_1px)] [background-size:16px_16px] px-4 py-6">
                <p className="mx-auto mb-4 max-w-md text-center text-xs text-slate-600">{zap.summary}</p>
                <ol className="mx-auto max-w-md">
                  {zap.steps.map((st, i) => (
                    <li key={i} className="flex flex-col items-center">
                      <button onClick={() => setStepIdx(i)} className={cn('w-full rounded-lg border bg-white p-3 text-left shadow-sm transition', i === stepIdx ? 'border-[#ff4f00] ring-2 ring-[#ff4f00]/25' : 'border-[#e6e3dc] hover:border-slate-400')}>
                        <div className="flex items-center gap-3">
                          <AppBadge app={st.app} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{i === 0 ? 'Trigger' : st.kind === 'filter' ? 'Filter' : st.kind === 'search' ? 'Search' : 'Action'} · {st.app}</p>
                            <p className="truncate text-sm font-semibold">{i + 1}. {st.event}</p>
                          </div>
                          <ChevronRight size={15} className="text-slate-400" />
                        </div>
                      </button>
                      {i < zap.steps.length - 1 && <span className="h-5 w-px bg-slate-400" />}
                    </li>
                  ))}
                </ol>
              </div>
              <StepPanel step={step} index={stepIdx} state={state} />
            </div>
          ) : (
            <RunsTable zap={zap} />
          )}
        </section>
      </div>
    </ProductFrame>
  )
}

function Mapped({ value }: { value: string }) {
  const parts = value.split(/(\{\{[^}]+\}\})/g)
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('{{') ? <span key={i} className="mx-0.5 inline-block rounded bg-[#ebe8fa] px-1.5 py-0.5 font-mono text-[11px] text-[#3d2ea6]">{p.slice(2, -2)}</span> : <span key={i}>{p}</span>,
      )}
    </span>
  )
}

function StepPanel({ step, index, state }: { step: ZapStep; index: number; state: DemoState }) {
  const output = step.output?.(state)
  return (
    <aside className="scroll-thin hidden w-[400px] shrink-0 overflow-y-auto border-l border-[#e6e3dc] bg-white lg:block">
      <div className="flex items-center gap-3 border-b border-[#e6e3dc] px-4 py-3">
        <AppBadge app={step.app} />
        <div className="min-w-0">
          <p className="text-xs text-slate-500">Step {index + 1} · {step.app}</p>
          <p className="font-semibold">{step.event}</p>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Setup</p>
          <dl className="space-y-2.5">
            {step.fields.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-medium text-slate-600">{k}</dt>
                <dd className="mt-0.5 rounded-md border border-[#e6e3dc] bg-[#fbfaf8] px-2.5 py-1.5 text-sm"><Mapped value={v} /></dd>
              </div>
            ))}
          </dl>
        </div>
        {step.note && <p className="rounded-md bg-[#fff1eb] p-3 text-xs text-[#7a2c00]">{step.note}</p>}
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Test · LOT-025 record</p>
          {output ? (
            <pre className="scroll-thin max-h-72 overflow-auto rounded-md bg-[#2d2e2e] p-3 text-[11px] leading-relaxed text-[#ffd8c7]">{JSON.stringify(output, null, 2)}</pre>
          ) : (
            <p className="text-xs text-slate-500">No sample output for this step.</p>
          )}
        </div>
        <p className="text-[11px] text-slate-400">Step and event names are indicative; exact Zapier app actions are confirmed during build.</p>
      </div>
    </aside>
  )
}

function RunsTable({ zap }: { zap: ZapDef }) {
  const { state } = useDemo()
  const runs = state.events.filter((e) => e.scenario === zap.name)
  const icon = { success: <CheckCircle2 size={15} className="text-emerald-600" />, duplicate: <CircleDashed size={15} className="text-violet-600" />, failed: <XCircle size={15} className="text-rose-600" />, blocked: <CircleDashed size={15} className="text-amber-600" /> }
  const label = { success: 'Success', duplicate: 'Skipped (already done)', failed: 'Errored', blocked: 'Stopped by filter' }
  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-5">
      {runs.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No runs yet — use “Run on LOT-025” or complete the matching workflow step.</p>
      ) : (
        <table className="w-full overflow-hidden rounded-lg border border-[#e6e3dc] bg-white text-sm">
          <thead className="bg-[#fbfaf8] text-left text-xs text-slate-500">
            <tr>{['Status', 'Started', 'Trigger', 'Result'].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-t border-[#efece6] align-top">
                <td className="px-4 py-2.5 whitespace-nowrap"><span className="inline-flex items-center gap-1.5">{icon[r.status]} {label[r.status]}</span></td>
                <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{dateTime(r.at)}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.trigger}</td>
                <td className="px-4 py-2.5">{r.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
