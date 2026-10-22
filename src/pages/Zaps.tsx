import { Check, CheckCircle2, CircleDashed, History, Play, Power, XCircle, Zap as ZapIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Spinner } from '../components/ui/overlays'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductFrame } from '../components/ui/ProductFrame'
import { USERS } from '../data/ids'
import type { DemoState } from '../data/types'
import { APP_STYLE, FLOWS, ZAPS, type ZapDef, type ZapStep } from '../data/zaps'
import { cn, dateTime, time, vt } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { approveContract, createXeroInvoice, generateContract, signContract, syncHubSpot, toggleStep, type Result } from '../store/engine'

/** “Run now” for the LOT-025 test record — goes through the same engine as the workflow screens. */
const RUNNERS: Record<string, (s: DemoState) => Result> = {
  z1: (s) => (s.steps[4].status === 'pending' ? toggleStep(s, 5, USERS.sales) : syncHubSpot(s, 'Zapier: Run now')),
  z2a: (s) => (s.steps[5].status === 'pending' ? toggleStep(s, 6, USERS.sales) : generateContract(s, 'Zapier: Run now')),
  z2b: (s) => (s.steps[6].status === 'pending' ? toggleStep(s, 7, USERS.director) : approveContract(s, USERS.director, 'Zapier: Run now')),
  z2c: (s) => signContract(s, 'Zapier: Run now'),
  z3: (s) => createXeroInvoice(s, 'Zapier: Run now'),
  flow: (s) => nextStage(s).run(s),
}

/** For the end-to-end overview: the next Zap that has not yet run for LOT-025. */
export function nextStage(s: DemoState): { label: string; run: (s: DemoState) => Result } {
  if (s.hubspot.lastSyncedHash === '') return { label: 'Run Zap 1 (Process Street → HubSpot)', run: RUNNERS.z1 }
  if (s.contract.status === 'Not generated') return { label: 'Run Zap 2A (generate contract → Drive)', run: RUNNERS.z2a }
  if (s.contract.status !== 'Approved') return { label: 'Approve → run Zap 2B (send for signature)', run: RUNNERS.z2b }
  if (s.contract.signature !== 'Signed') return { label: 'Buyer signs → run Zap 2C + Zap 3', run: RUNNERS.z2c }
  return { label: 'All stages complete', run: (st) => ({ state: st, notice: { kind: 'info', title: 'Every stage has run for LOT-025', message: 'Use Reset in the banner to start again.' } }) }
}

export function AppBadge({ app, size = 32 }: { app: ZapStep['app']; size?: number }) {
  const st = APP_STYLE[app]
  return (
    <span className="flex shrink-0 items-center justify-center rounded-md text-[11px] font-bold" style={{ width: size, height: size, background: st.bg, color: st.fg }} title={app}>
      {st.short}
    </span>
  )
}

export default function Zaps() {
  const { state, runDelayed, busy } = useDemo()
  const [params, setParams] = useSearchParams()
  const zap = ZAPS.find((z) => z.id === params.get('zap')) ?? ZAPS[0]
  const [stepIdx, setStepIdx] = useState(0)
  const [tab, setTab] = useState<'editor' | 'runs'>('editor')
  const [tested, setTested] = useState<Set<string>>(new Set())
  const step = zap.steps[Math.min(stepIdx, zap.steps.length - 1)]
  const runs = state.events.filter((e) => e.scenario === zap.name)
  const open = (id: string) => { setParams({ zap: id }); setStepIdx(0) }
  const flow = FLOWS.find((f) => f.n === zap.flow)!
  const hasSuccess = runs.some((e) => e.status === 'success')

  return (
    <ProductFrame product="Zapier">
      <div className="flex min-h-0 flex-1 bg-[#f7f6f3] text-[#2d2e2e]">
        <ZapierAppNav />
        {/* Zap list */}
        <aside className="scroll-thin hidden w-64 shrink-0 overflow-y-auto border-r border-[#e6e3dc] bg-white md:block">
          <div className="flex items-center gap-2 px-4 py-3">
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
              <p className="text-xs text-slate-500">Zaps <span className="mx-1">›</span> {flow.title}</p>
              <h1 className="truncate text-lg font-semibold">{zap.name}</h1>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-medium">
              <span className={cn('relative h-5 w-9 rounded-full', zap.id === 'z6' ? 'bg-slate-300' : 'bg-[#1aa35a]')}><span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow', zap.id === 'z6' ? 'left-0.5' : 'left-[18px]')} /></span>
              {zap.id === 'z6' ? 'Off · later phase' : 'On'}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex overflow-hidden rounded-md border border-[#e6e3dc] text-sm">
                <button onClick={() => setTab('editor')} className={cn('px-3 py-1.5', tab === 'editor' ? 'bg-[#2d2e2e] text-white' : 'bg-white')}>Editor</button>
                <button onClick={() => setTab('runs')} className={cn('flex items-center gap-1 px-3 py-1.5', tab === 'runs' ? 'bg-[#2d2e2e] text-white' : 'bg-white')}><History size={13} /> Zap runs ({runs.length})</button>
              </div>
              {RUNNERS[zap.id] && (
                <button onClick={() => runDelayed('zaprun', RUNNERS[zap.id], 900)} disabled={busy === 'zaprun'} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#ff4f00] px-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
                  {busy === 'zaprun' ? <><Spinner size={12} /> Running…</> : <><Play size={13} /> {zap.id === 'flow' ? nextStage(state).label : 'Run on LOT-025'}</>}
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
                            <p className="truncate text-sm font-semibold">{i + 1}. {st.app}</p>
                            <p className="truncate text-[13px] text-slate-600">{st.event}</p>
                          </div>
                          {tested.has(`${zap.id}:${i}`) || st.done?.(state) || (!st.done && hasSuccess)
                            ? <span className="flex size-5 items-center justify-center rounded-full bg-[#1aa35a] text-white"><Check size={12} strokeWidth={3} /></span>
                            : <span className="size-5 rounded-full border-2 border-slate-300" />}
                        </div>
                      </button>
                      {i < zap.steps.length - 1 && <span className="h-5 w-px bg-slate-400" />}
                    </li>
                  ))}
                </ol>
              </div>
              <StepPanel step={step} index={stepIdx} state={state} zapId={zap.id} tested={tested.has(`${zap.id}:${stepIdx}`)} onTested={() => setTested((t) => new Set(t).add(`${zap.id}:${stepIdx}`))} onContinue={() => setStepIdx((i) => Math.min(i + 1, zap.steps.length - 1))} isLast={stepIdx === zap.steps.length - 1} />
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

function StepPanel({ step, index, state, zapId, tested, onTested, onContinue, isLast }: { step: ZapStep; index: number; state: DemoState; zapId: string; tested: boolean; onTested: () => void; onContinue: () => void; isLast: boolean }) {
  const output = step.output?.(state)
  const [tab, setTab] = useState<'setup' | 'configure' | 'test'>('configure')
  const [testing, setTesting] = useState(false)
  useEffect(() => { setTab('configure'); setTesting(false) }, [index, zapId])
  const runTest = (then?: () => void) => {
    setTesting(true)
    window.setTimeout(() => { setTesting(false); onTested(); setTab('test'); then?.() }, 700)
  }
  const t = state.transaction
  return (
    <aside className="scroll-thin hidden w-[420px] shrink-0 flex-col overflow-y-auto border-l border-[#e6e3dc] bg-white lg:flex">
      <div className="flex items-center gap-3 border-b border-[#e6e3dc] px-4 py-3">
        <AppBadge app={step.app} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">{index + 1}. {index === 0 ? 'Trigger' : 'Action'} · {step.app}</p>
          <p className="truncate font-semibold">{step.event}</p>
        </div>
        {tested && <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f6ec] px-2 py-0.5 text-[11px] font-semibold text-[#136c2e]"><CheckCircle2 size={12} /> Tested</span>}
      </div>
      <div className="flex border-b border-[#e6e3dc] px-2 text-[13px]">
        {(['setup', 'configure', 'test'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={cn('border-b-2 px-3 py-2.5 capitalize', tab === k ? 'border-[#ff4f00] font-semibold text-[#2d2e2e]' : 'border-transparent text-slate-500 hover:text-[#2d2e2e]')}>{k}</button>
        ))}
      </div>

      <div className="flex-1 space-y-4 p-4">
        {tab === 'setup' && (
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs font-semibold text-slate-600">App</dt><dd className="mt-1 flex items-center gap-2 rounded-md border border-[#e6e3dc] bg-[#fbfaf8] px-2.5 py-1.5"><AppBadge app={step.app} size={20} /> {step.app}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-600">{index === 0 ? 'Trigger event' : 'Action event'}</dt><dd className="mt-1 rounded-md border border-[#e6e3dc] bg-[#fbfaf8] px-2.5 py-1.5">{step.event}</dd></div>
            {!step.app.includes('by Zapier') && (
              <div><dt className="text-xs font-semibold text-slate-600">Account</dt><dd className="mt-1 flex items-center justify-between rounded-md border border-[#e6e3dc] bg-[#fbfaf8] px-2.5 py-1.5"><span>{step.app} · Pacific Horizon integration account</span><span className="text-[11px] text-emerald-700">Connected (simulated)</span></dd></div>
            )}
          </dl>
        )}

        {tab === 'configure' && (
          <>
            {step.mappings && (
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Field mapping</p>
                <ul className="space-y-2">
                  {step.mappings.map(([from, to]) => (
                    <li key={from + to} className="rounded-md border border-[#e6e3dc] bg-[#fbfaf8] p-2">
                      <Pill text={from} />
                      <span className="my-0.5 block pl-3 text-[11px] text-slate-400">↓</span>
                      <Pill text={to} dest />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Fields</p>
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
          </>
        )}

        {tab === 'test' && (
          <>
            {testing ? (
              <p className="flex items-center gap-2 rounded-md border border-[#e6e3dc] px-3 py-3 text-sm text-slate-600"><Spinner size={14} className="text-[#ff4f00]" /> Testing step with the LOT-025 test record…</p>
            ) : tested ? (
              <div className="rounded-md border border-[#bfe5cb] bg-[#f0faf3] px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-[#136c2e]"><CheckCircle2 size={15} /> Test successful</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {[t.lotId, t.buyerName, vt(t.salePrice)].map((x) => <span key={x} className="rounded bg-white px-2 py-0.5 font-medium text-slate-700 ring-1 ring-[#bfe5cb]">{x}</span>)}
                </div>
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-[#d6d2c8] px-3 py-3 text-sm text-slate-600">Test this step to see the data it returns for the LOT-025 test record.</p>
            )}
            {output && (tested || testing) && (
              <div>
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">Data out</p>
                <pre className="scroll-thin max-h-72 overflow-auto rounded-md bg-[#2d2e2e] p-3 text-[11px] leading-relaxed text-[#ffd8c7]">{JSON.stringify(output, null, 2)}</pre>
              </div>
            )}
          </>
        )}
        <p className="text-[11px] text-slate-400">Step and event names are indicative; exact Zapier app actions are confirmed during build.</p>
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t border-[#e6e3dc] bg-white px-4 py-3">
        <button onClick={() => runTest()} disabled={testing} className="h-9 flex-1 rounded-md border border-[#2d2e2e] text-sm font-semibold hover:bg-[#f7f6f3] disabled:opacity-50">Test step</button>
        <button onClick={() => runTest(onContinue)} disabled={testing} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#695be8] text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
          {testing ? <Spinner size={13} /> : null} {isLast ? 'Test & finish' : 'Test & continue'}
        </button>
      </div>
    </aside>
  )
}

function Pill({ text, dest }: { text: string; dest?: boolean }) {
  const [app, field] = text.split(' · ')
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px]', dest ? 'bg-[#e6f6ec] text-[#136c2e]' : 'bg-[#ebe8fa] text-[#3d2ea6]')}>
      <b className="font-sans font-semibold">{app}</b>{field ? ` · ${field}` : ''}
    </span>
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

/** Zapier-style app navigation (original component, no vendor logo). */
export function ZapierAppNav({ active = 'Zaps' }: { active?: 'Zaps' | 'Zap History' }) {
  const items: [string, string?, string?][] = [['Zaps', undefined, '/'], ['Tables'], ['Interfaces'], ['Chatbots', 'Beta'], ['Canvas', 'Beta'], ['Agents', 'Beta'], ['Apps'], ['Zap History', undefined, '/history'], ['More']]
  return (
    <nav className="hidden w-44 shrink-0 flex-col border-r border-[#e6e3dc] bg-white px-2 py-3 text-[13px] lg:flex" aria-label="Zapier">
      <div className="mb-3 flex items-center gap-1.5 px-2"><span className="flex size-6 items-center justify-center rounded bg-[#ff4f00] text-white"><ZapIcon size={13} /></span><span className="font-bold tracking-tight">Zapier</span></div>
      <button className="mb-3 h-9 rounded-full bg-[#ff4f00] text-sm font-semibold text-white hover:brightness-110">+ Create</button>
      {items.map(([label, tag, to]) => {
        const cls = cn('flex items-center gap-2 rounded-md px-2.5 py-1.5', label === active ? 'bg-[#fff1eb] font-semibold text-[#2d2e2e]' : 'text-slate-600 hover:bg-slate-50', !to && 'cursor-default')
        const body = <>{label}{tag && <span className="ml-auto rounded bg-slate-100 px-1 text-[10px] text-slate-500">{tag}</span>}</>
        return to ? <Link key={label} to={to} className={cls}>{body}</Link> : <span key={label} className={cls}>{body}</span>
      })}
    </nav>
  )
}
