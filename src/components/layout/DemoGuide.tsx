import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Play, X } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { USERS } from '../../data/ids'
import type { DemoState, SystemId } from '../../data/types'
import { cn } from '../../lib/format'
import { SystemIcon } from '../../lib/systems'
import { useDemo } from '../../store/DemoStore'
import { signContract, syncHubSpot, toggleStep, type Result } from '../../store/engine'
import { Spinner } from '../ui/overlays'

interface GuideStep {
  system: SystemId
  title: string
  /** What the presenter says on this step. */
  say: string
  route: string
  action?: { label: string; run: (s: DemoState) => Result }
  done?: (s: DemoState) => boolean
}

const synced = (s: DemoState) => s.hubspot.lastSyncedHash !== ''
const generated = (s: DemoState) => s.contract.status !== 'Not generated'
const approved = (s: DemoState) => s.contract.status === 'Approved'
const signed = (s: DemoState) => s.contract.signature === 'Signed'

/** The interview story, step by step. Every action goes through the same engine as the screens. */
export const GUIDE: GuideStep[] = [
  { system: 'automation', title: 'Property Sales Automation control center', say: 'This is the control center I designed around your property-sales process.', route: '/' },
  { system: 'process-street', title: 'Salesperson completes the CRM task', say: 'Here is the Process Street workflow where the salesperson completes the lot-sale checklist.', route: '/workflow?step=5', action: { label: 'Complete CRM task (runs Zap 1)', run: (s) => syncHubSpot(s, 'Guided demo: CRM task') }, done: synced },
  { system: 'automation', title: 'Zap 1 runs', say: 'Zapier picks that up — filter, normalise, find or create.', route: '/zaps?zap=z1', done: synced },
  { system: 'hubspot', title: 'Buyer and deal matched in HubSpot', say: 'That creates or updates the buyer and deal in HubSpot — matched on Buyer ID and the deal key, so no duplicates.', route: '/crm/deal', done: synced },
  { system: 'process-street', title: 'Contract generation task', say: 'Once the required information is complete, the salesperson ticks “Contract generated”.', route: '/workflow?step=6', action: { label: 'Complete step 6 (runs Zap 2A)', run: (s) => toggleStep(s, 6, USERS.sales) }, done: generated },
  { system: 'contracts', title: 'Draft generated from the approved template', say: 'The contract is generated from an approved template, with every merge field validated.', route: '/contracts', done: generated },
  { system: 'drive', title: 'Folder and documents in Google Drive', say: 'The transaction folder and supporting documents are automatically organised in Google Drive.', route: '/documents/gd-025-ctr', done: generated },
  { system: 'process-street', title: 'Internal approval', say: 'The director approves inside the workflow — a stop task, so nothing runs ahead.', route: '/workflow?step=7', action: { label: 'Approve contract (runs Zap 2B)', run: (s) => toggleStep(s, 7, USERS.director) }, done: approved },
  { system: 'contracts', title: 'Buyer e-signature', say: 'The approved PDF goes to the buyer for signature.', route: '/contracts', action: { label: 'Simulate buyer signature (runs Zap 2C)', run: (s) => signContract(s) }, done: signed },
  { system: 'hubspot', title: 'Deal becomes Closed Won', say: 'After internal approval and buyer signature, the deal becomes Closed Won.', route: '/crm/deal', done: signed },
  { system: 'automation', title: 'Zap 3 validates the accounting rules', say: 'Then Zapier validates the accounting conditions before preparing the Xero draft.', route: '/zaps?zap=z3', done: (s) => !!s.xero.invoice },
  { system: 'xero', title: 'Xero draft invoice', say: 'The draft deposit invoice is ready for finance — and its number is written back to HubSpot.', route: '/accounting/invoice', done: (s) => !!s.xero.invoice },
  { system: 'automation', title: 'Automation Monitor', say: 'If anything fails, it goes into the Automation Monitor instead of silently losing the transaction.', route: '/monitor' },
  { system: 'automation', title: 'AI roadmap on the same backbone', say: 'And this same backbone supports the later AI use cases — settlement statements, contract assistance, AML/KYC document checks and supplier invoices.', route: '/roadmap' },
]

export function DemoGuide() {
  const { state, runDelayed, busy, guideOpen, setGuideOpen, guideStep, setGuideStep } = useDemo()
  const navigate = useNavigate()
  const loc = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  if (!guideOpen) return null
  const i = Math.min(guideStep, GUIDE.length - 1)
  const step = GUIDE[i]
  const isDone = step.done?.(state) ?? false
  const here = loc.pathname + loc.search === step.route || (step.route === '/' && loc.pathname === '/')
  const go = (n: number) => { setGuideStep(n); navigate(GUIDE[n].route) }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[55] flex justify-center px-3">
      <div className="pointer-events-auto w-full max-w-[860px] overflow-hidden rounded-lg border border-slate-300 bg-white shadow-[0_8px_30px_rgba(15,23,42,.18)]">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-900 px-3 py-1.5 text-white">
          <span className="text-[11px] font-semibold tracking-wider uppercase">Guided demo</span>
          <span className="text-[11px] text-slate-400">Step {i + 1} of {GUIDE.length}</span>
          <div className="ml-2 flex flex-1 gap-0.5">
            {GUIDE.map((g, n) => (
              <button key={n} onClick={() => go(n)} title={g.title} className={cn('h-1.5 flex-1 rounded-full', n === i ? 'bg-teal-400' : g.done?.(state) ? 'bg-teal-700' : n < i ? 'bg-slate-500' : 'bg-slate-700')} />
            ))}
          </div>
          <button onClick={() => setCollapsed((c) => !c)} className="rounded p-0.5 text-slate-300 hover:text-white" aria-label={collapsed ? 'Expand' : 'Collapse'}>{collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
          <button onClick={() => setGuideOpen(false)} className="rounded p-0.5 text-slate-300 hover:text-white" aria-label="Close guided demo"><X size={15} /></button>
        </div>
        {!collapsed && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <SystemIcon system={step.system} size={16} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                {step.title}
                {isDone && <CheckCircle2 size={14} className="text-emerald-600" />}
              </p>
              <p className="text-[13px] text-slate-600 italic">“{step.say}”</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => go(Math.max(0, i - 1))} disabled={i === 0} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ArrowLeft size={14} /> Back</button>
              {!here && <button onClick={() => navigate(step.route)} className="h-8 rounded-md border border-slate-300 px-2.5 text-sm text-slate-700 hover:bg-slate-50">Show screen</button>}
              {step.action && !isDone && (
                <button onClick={() => { if (!here) navigate(step.route); runDelayed('guide', step.action!.run, 900) }} disabled={busy === 'guide'} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60">
                  {busy === 'guide' ? <Spinner size={12} /> : <Play size={13} />} {step.action.label}
                </button>
              )}
              <button onClick={() => go(Math.min(GUIDE.length - 1, i + 1))} disabled={i === GUIDE.length - 1} className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40">Next <ArrowRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
