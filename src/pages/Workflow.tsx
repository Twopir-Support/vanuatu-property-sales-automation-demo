import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Calendar,
  Check,
  ChevronDown,
  CircleCheck,
  ExternalLink,
  FileText,
  Hand,
  History,
  Lock,
  MessageSquare,
  RefreshCw,
  Save,
  Share2,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  Workflow as WorkflowIcon,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar, Badge, Button, inputCls } from '../components/ui/primitives'
import { ProductFrame } from '../components/ui/ProductFrame'
import { IDS, USERS } from '../data/ids'
import type { ChecklistDocument, Transaction, WorkflowStep } from '../data/types'
import { cn, date, dateTime, relative, vt } from '../lib/format'
import { completedSteps, integrationStatuses } from '../lib/status'
import { SystemIcon } from '../lib/systems'
import { useDemo } from '../store/DemoStore'
import { approveContract, generateContract, hubspotHasPendingChanges, requestContractChanges, syncHubSpot, toggleStep, updateTransaction } from '../store/engine'

const docTone: Record<ChecklistDocument['status'], 'green' | 'amber' | 'blue'> = {
  Received: 'green',
  Approved: 'green',
  Generated: 'blue',
  'Awaiting generation': 'amber',
}

export default function Workflow() {
  const { state, run } = useDemo()
  const [params, setParams] = useSearchParams()
  const firstPending = state.steps.find((s) => s.status === 'pending')?.id ?? 8
  const selectedId = Number(params.get('step')) || 1
  const step = state.steps.find((s) => s.id === selectedId) ?? state.steps[0]
  const done = completedSteps(state)
  const pct = Math.round((done / state.steps.length) * 100)

  const [draft, setDraft] = useState<Transaction>(state.transaction)
  useEffect(() => setDraft(state.transaction), [state.transaction])
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(state.transaction), [draft, state.transaction])
  const [rightTab, setRightTab] = useState<'automations' | 'activity'>('automations')

  const select = (id: number) => setParams({ step: String(id) }, { replace: true })
  const save = () => run((s) => updateTransaction(s, draft))
  const completeSelected = () => {
    if (dirty) save()
    run((s) => toggleStep(s, step.id, step.id === 7 ? USERS.director : step.assignee === USERS.integration ? USERS.sales : step.assignee))
  }
  const sync = () => {
    if (dirty) save()
    run((s) => syncHubSpot(s, 'Manual “Sync to HubSpot” button'))
  }

  return (
    <ProductFrame product="Process Street">
      <div className="flex min-h-0 flex-1 flex-col bg-white font-sans">
        {/* Run header */}
        <header className="border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-3 px-5 pt-3 pb-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <WorkflowIcon size={14} className="text-ps-blue" />
              <span>Library</span>
              <span>/</span>
              <span className="font-medium text-slate-700">Residential Lot Sale</span>
              <Badge tone="slate" className="ml-1">Workflow run · {IDS.processStreetRun}</Badge>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="mr-2 flex -space-x-1.5">
                {[USERS.sales, USERS.admin, USERS.director, USERS.finance].map((n) => (
                  <Avatar key={n} name={n} size={26} className="ring-2 ring-white" />
                ))}
              </div>
              <Button size="sm" variant="ghost"><Share2 size={14} /> Share</Button>
              <Button size="sm" onClick={save} disabled={!dirty}>
                <Save size={14} /> Save Changes
              </Button>
              <Button size="sm" variant="hubspot" onClick={sync}>
                <RefreshCw size={14} /> Sync to HubSpot
              </Button>
              <Button size="sm" variant="success" onClick={completeSelected} disabled={step.status === 'complete' || step.kind === 'approval'} title={step.status === 'complete' ? 'Selected step is already complete' : undefined}>
                <Check size={14} /> Complete Step
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-4 px-5 pb-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Lot Sale — LOT-025</h1>
              <p className="text-xs text-slate-500">
                Started {dateTime(state.activity[state.activity.length - 1]?.at ?? new Date().toISOString())} by {USERS.sales} · Due {date('2026-12-15')}
              </p>
            </div>
            <div className="ml-auto w-full max-w-sm">
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-slate-700">
                  {done} of {state.steps.length} steps completed
                </span>
                <span className="text-slate-500">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-ps-green transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Task list */}
          <aside className="scroll-thin hidden w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-ps-sidebar md:block 2xl:w-80">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <span>Tasks</span>
              <span className="normal-case">Show: All</span>
            </div>
            <ol className="pb-4">
              {state.steps.map((s) => (
                <TaskRow key={s.id} step={s} active={s.id === step.id} current={s.id === firstPending} onSelect={() => select(s.id)} onToggle={() => run((st) => toggleStep(st, s.id, s.id === 7 ? USERS.director : USERS.sales))} />
              ))}
            </ol>
          </aside>

          {/* Task content */}
          <section className="scroll-thin min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-6">
              <div className="mb-4 md:hidden">
                <select className={inputCls} value={step.id} onChange={(e) => select(Number(e.target.value))}>
                  {state.steps.map((s) => (
                    <option key={s.id} value={s.id}>{s.id}. {s.title} {s.status === 'complete' ? '✓' : ''}</option>
                  ))}
                </select>
              </div>
              <TaskHeader step={step} />
              <p className="mb-6 text-sm leading-relaxed text-slate-600">{step.description}</p>

              {step.kind === 'form' && <SaleForm draft={draft} setDraft={setDraft} dirty={dirty} onSave={save} />}
              {step.id === 2 && <ReadOnlyFacts rows={[['Project', state.transaction.project], ['Lot ID', state.transaction.lotId], ['Release', 'Stage 2 · Harbour view · 836 m²'], ['Title reference', 'Synthetic — DEMO/HVR/025']]} subtasks={['Lot status is “Under contract” on release schedule', 'Survey plan matches lot boundaries', 'No caveats or encumbrances noted (demo)']} complete={step.status === 'complete'} />}
              {step.id === 3 && <ReadOnlyFacts rows={[['Sale price', vt(state.transaction.salePrice)], ['Currency', 'VUV'], ['Price list', 'Harbour View — Price list 2026'], ['Discount', 'None']]} subtasks={['Price matches 2026 price list', 'Director sign-off recorded']} complete={step.status === 'complete'} />}
              {step.kind === 'documents' && <DocumentsTask draft={draft} setDraft={setDraft} />}
              {step.id === 5 && <CrmTask onSync={sync} />}
              {step.id === 6 && <ContractTask onGenerate={() => run((s) => generateContract(s, 'Generate button on step 6'))} />}
              {step.id === 7 && <ApprovalTask />}
              {step.id === 8 && <ReadOnlyFacts rows={[['Settlement date', date(state.transaction.settlementDate)], ['Deposit invoice', state.xero.invoice ? `${state.xero.invoice.number} · ${state.xero.invoice.status}` : 'Not yet created'], ['HubSpot deal', IDS.hubspotDeal]]} subtasks={['Settlement funds received in trust account', 'Transfer documents lodged with Lands Department (demo)', 'Keys / handover booked']} complete={step.status === 'complete'} />}

              <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
                <Button variant="ghost" size="sm" disabled={step.id === 1} onClick={() => select(step.id - 1)}><ArrowLeft size={14} /> Previous</Button>
                {step.status === 'complete' ? (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ps-green"><CircleCheck size={16} /> Completed by {step.completedBy} · {step.completedAt && relative(step.completedAt)}</span>
                    <Button size="sm" variant="ghost" onClick={() => run((s) => toggleStep(s, step.id, USERS.sales))}>Uncomplete</Button>
                  </div>
                ) : step.kind === 'approval' ? (
                  <span className="text-xs text-slate-500">Use the approval controls above</span>
                ) : (
                  <button onClick={completeSelected} className="inline-flex h-10 items-center gap-2 rounded-md bg-ps-green px-5 text-sm font-semibold text-white shadow-sm hover:brightness-110">
                    <Check size={16} /> Complete Task
                  </button>
                )}
                <Button variant="ghost" size="sm" disabled={step.id === 8} onClick={() => select(step.id + 1)}>Next <ArrowRight size={14} /></Button>
              </div>
            </div>
          </section>

          {/* Right panel */}
          <aside className="scroll-thin hidden w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white xl:block 2xl:w-80">
            <div className="flex border-b border-slate-200 text-sm">
              {(['automations', 'activity'] as const).map((t) => (
                <button key={t} onClick={() => setRightTab(t)} className={cn('flex flex-1 items-center justify-center gap-1.5 py-2.5 capitalize', rightTab === t ? 'border-b-2 border-ps-blue font-medium text-ps-blue' : 'text-slate-500 hover:text-slate-800')}>
                  {t === 'automations' ? <Zap size={14} /> : <History size={14} />} {t}
                </button>
              ))}
            </div>
            {rightTab === 'automations' ? <AutomationPanel /> : <ActivityPanel />}
          </aside>
        </div>
      </div>
    </ProductFrame>
  )
}

function TaskRow({ step, active, current, onSelect, onToggle }: { step: WorkflowStep; active: boolean; current: boolean; onSelect: () => void; onToggle: () => void }) {
  const complete = step.status === 'complete'
  return (
    <li>
      <div
        onClick={onSelect}
        className={cn(
          'group flex cursor-pointer items-start gap-3 border-l-[3px] px-4 py-2.5 transition-colors',
          active ? 'border-ps-blue bg-white shadow-[inset_0_-1px_0_#e2e8f0,inset_0_1px_0_#e2e8f0]' : 'border-transparent hover:bg-white/70',
        )}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          aria-label={complete ? `Uncomplete ${step.title}` : `Complete ${step.title}`}
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
            complete ? 'border-ps-green bg-ps-green text-white' : 'border-slate-300 bg-white text-transparent hover:border-ps-green hover:text-ps-green/50',
          )}
        >
          <Check size={13} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm leading-snug', complete ? 'text-slate-400' : 'font-medium text-slate-800')}>
            <span className="mr-1 text-slate-400">{step.id}.</span>
            {step.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <Avatar name={step.assignee} size={16} />
            {step.kind === 'automation' && <span className="inline-flex items-center gap-0.5 text-violet-600"><Bot size={11} /> Automated</span>}
            {step.kind === 'approval' && <span className="inline-flex items-center gap-0.5 text-sky-700"><ShieldCheck size={11} /> Approval</span>}
            {!complete && <span className="inline-flex items-center gap-0.5"><Calendar size={11} /> {date(step.dueDate)}</span>}
            {current && !complete && <span className="rounded bg-sky-100 px-1 font-medium text-sky-700">Up next</span>}
          </div>
        </div>
        {step.stop && !complete && <Hand size={14} className="mt-0.5 shrink-0 text-rose-500" aria-label="Stop task" />}
      </div>
    </li>
  )
}

function TaskHeader({ step }: { step: WorkflowStep }) {
  return (
    <div className="mb-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone={step.status === 'complete' ? 'green' : 'amber'} dot>{step.status === 'complete' ? 'Complete' : 'Pending'}</Badge>
        {step.stop && <Badge tone="red"><Hand size={11} /> Stop task — earlier tasks must be complete</Badge>}
        {step.kind === 'automation' && <Badge tone="violet"><Bot size={11} /> Triggers automation</Badge>}
      </div>
      <h2 className="text-xl font-semibold text-slate-900">
        <span className="text-slate-400">{step.id}.</span> {step.title}
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><UserRound size={13} /> Assigned to <Avatar name={step.assignee} size={18} /> <b className="font-medium">{step.assignee}</b></span>
        <span className="inline-flex items-center gap-1.5"><Calendar size={13} /> Due {dateTime(step.dueDate)}</span>
      </div>
    </div>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-5 rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function PsField({ label, children, required, full }: { label: string; children: React.ReactNode; required?: boolean; full?: boolean }) {
  return (
    <label className={cn('block', full && 'sm:col-span-2')}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  )
}

function SaleForm({ draft, setDraft, dirty, onSave }: { draft: Transaction; setDraft: (t: Transaction) => void; dirty: boolean; onSave: () => void }) {
  const set = <K extends keyof Transaction>(k: K, v: Transaction[K]) => setDraft({ ...draft, [k]: v })
  return (
    <div>
      {dirty && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Unsaved changes to form fields.
          <Button size="sm" variant="primary" onClick={onSave}><Save size={13} /> Save Changes</Button>
        </div>
      )}
      <FormSection title="Buyer">
        <PsField label="Buyer name" required><input className={inputCls} value={draft.buyerName} onChange={(e) => set('buyerName', e.target.value)} /></PsField>
        <PsField label="Buyer ID"><input className={cn(inputCls, 'font-mono')} value={draft.buyerId} disabled /></PsField>
        <PsField label="Email" required><input type="email" className={inputCls} value={draft.email} onChange={(e) => set('email', e.target.value)} /></PsField>
        <PsField label="Phone"><input className={inputCls} value={draft.phone} onChange={(e) => set('phone', e.target.value)} /></PsField>
      </FormSection>
      <FormSection title="Property">
        <PsField label="Project" required>
          <select className={inputCls} value={draft.project} onChange={(e) => set('project', e.target.value)}>
            <option>Harbour View Residences</option>
          </select>
        </PsField>
        <PsField label="Lot ID" required><input className={cn(inputCls, 'font-mono')} value={draft.lotId} disabled title="Lot ID is the deal uniqueness key and is locked once the run starts" /></PsField>
      </FormSection>
      <FormSection title="Sale">
        <PsField label="Sale price (VUV)" required>
          <div className="relative">
            <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-slate-500">VT</span>
            <input type="number" min={0} step={50000} className={cn(inputCls, 'pl-8')} value={draft.salePrice} onChange={(e) => set('salePrice', Number(e.target.value))} />
          </div>
        </PsField>
        <PsField label="Sales representative">
          <select className={inputCls} value={draft.salesRep} onChange={(e) => set('salesRep', e.target.value)}>
            <option>Sarah Williams</option>
            <option>Lina Joseph</option>
          </select>
        </PsField>
        <PsField label="Settlement date" required><input type="date" className={inputCls} value={draft.settlementDate} onChange={(e) => set('settlementDate', e.target.value)} /></PsField>
        <PsField label="Required documents" full>
          <textarea rows={2} className={inputCls} value={draft.requiredDocuments} onChange={(e) => set('requiredDocuments', e.target.value)} />
        </PsField>
      </FormSection>
    </div>
  )
}

function ReadOnlyFacts({ rows, subtasks, complete }: { rows: [string, string][]; subtasks: string[]; complete: boolean }) {
  return (
    <div className="space-y-5">
      <dl className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="bg-white px-4 py-3">
            <dt className="text-xs text-slate-500">{k}</dt>
            <dd className="text-sm font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Subtasks</p>
        <ul className="space-y-1.5">
          {subtasks.map((t) => (
            <li key={t} className="flex items-center gap-2 text-sm text-slate-700">
              <span className={cn('flex size-4 items-center justify-center rounded border', complete ? 'border-ps-green bg-ps-green text-white' : 'border-slate-300')}>{complete && <Check size={11} strokeWidth={3} />}</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function DocumentsTask({ draft, setDraft }: { draft: Transaction; setDraft: (t: Transaction) => void }) {
  const { state } = useDemo()
  return (
    <div className="space-y-5">
      <PsField label="Required documents">
        <textarea rows={2} className={inputCls} value={draft.requiredDocuments} onChange={(e) => setDraft({ ...draft, requiredDocuments: e.target.value })} />
      </PsField>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 uppercase">
          <span>Document checklist</span>
          <span className="normal-case">{state.documents.filter((d) => d.status !== 'Awaiting generation').length} of {state.documents.length} on file</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {state.documents.map((d) => {
            const f = state.drive.files.find((x) => x.id === d.driveFileId)
            return (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <FileText size={18} className="text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{d.name}</p>
                  {f ? (
                    <Link to={`/documents/${f.parentId}?file=${f.id}`} className="inline-flex items-center gap-1 text-xs text-ps-blue hover:underline">
                      {f.name} <ExternalLink size={11} />
                    </Link>
                  ) : (
                    <p className="text-xs text-slate-500">Generated automatically at step 6</p>
                  )}
                </div>
                <Badge tone={docTone[d.status]} dot>{d.status}</Badge>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function CrmTask({ onSync }: { onSync: () => void }) {
  const { state } = useDemo()
  const pending = hubspotHasPendingChanges(state)
  const deal = state.hubspot.deals.find((d) => d.id === IDS.hubspotDeal)
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <SystemIcon system="hubspot" />
          <div className="flex-1">
            <p className="text-sm font-semibold">HubSpot upsert</p>
            <p className="text-xs text-slate-500">{pending ? 'Form data has changed since the last sync.' : `In sync · last synced ${state.hubspot.lastSyncedAt ? relative(state.hubspot.lastSyncedAt) : '—'}`}</p>
          </div>
          <Badge tone={pending ? 'amber' : 'green'} dot>{pending ? 'Ready to synchronize' : 'Synchronized'}</Badge>
        </div>
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded bg-slate-50 p-2.5"><b className="block text-slate-700">Contact match</b>Buyer ID <code>{state.transaction.buyerId}</code>, then normalised email</div>
          <div className="rounded bg-slate-50 p-2.5"><b className="block text-slate-700">Deal uniqueness</b>One open deal per Lot ID + Buyer ID</div>
          <div className="rounded bg-slate-50 p-2.5"><b className="block text-slate-700">Contact</b><Link className="text-ps-blue hover:underline" to="/crm/contact">{IDS.hubspotContact}</Link></div>
          <div className="rounded bg-slate-50 p-2.5"><b className="block text-slate-700">Deal</b><Link className="text-ps-blue hover:underline" to="/crm/deal">{IDS.hubspotDeal}</Link> · {deal?.stage}</div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" variant="hubspot" onClick={onSync}><RefreshCw size={13} /> Sync to HubSpot</Button>
          <span className="text-xs text-slate-500">Click twice — the second run is suppressed as a duplicate.</span>
        </div>
      </div>
    </div>
  )
}

function ContractTask({ onGenerate }: { onGenerate: () => void }) {
  const { state } = useDemo()
  const c = state.contract
  const ready = state.steps.filter((s) => s.id < 6).every((s) => s.status === 'complete')
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <SystemIcon system="contracts" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Generate sale agreement</p>
          <p className="text-xs text-slate-500">Template: {c.template} · merge fields from this run · saved to Drive › LOT-025 › 04 Contracts</p>
        </div>
        <Badge tone={c.status === 'Not generated' ? 'slate' : c.status === 'Approved' ? 'green' : 'blue'} dot>{c.status}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {c.status === 'Not generated' ? (
          <Button size="sm" variant="primary" onClick={onGenerate} disabled={!ready}>
            {ready ? <FileText size={13} /> : <Lock size={13} />} Generate contract
          </Button>
        ) : (
          <>
            <Link to="/contracts"><Button size="sm"><FileText size={13} /> Open {IDS.contract} v{c.version}</Button></Link>
            <Button size="sm" variant="ghost" onClick={onGenerate}>Re-run generation (idempotency test)</Button>
          </>
        )}
        <span className="text-xs text-slate-500">Completing this task also generates the contract.</span>
      </div>
    </div>
  )
}

function ApprovalTask() {
  const { state, run } = useDemo()
  const [comment, setComment] = useState('')
  const step = state.steps.find((s) => s.id === 7)!
  const c = state.contract
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 text-sm">
        <span className="font-medium text-slate-700">Tasks to approve</span>
        <span className="text-xs text-slate-500">Approver: {USERS.director}</span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <FileText size={18} className="text-slate-400" />
        <div className="flex-1">
          <p className="text-sm font-medium">6. Contract generated</p>
          <p className="text-xs text-slate-500">{c.status === 'Not generated' ? 'Not submitted yet — waiting on step 6' : `${IDS.contract} v${c.version} · generated ${c.generatedAt ? relative(c.generatedAt) : ''}`}</p>
        </div>
        <Badge tone={c.status === 'Approved' ? 'green' : c.status === 'Generated' ? 'amber' : 'slate'} dot>
          {c.status === 'Approved' ? 'Approved' : c.status === 'Generated' ? 'Awaiting approval' : 'Not submitted'}
        </Badge>
      </div>
      {c.status === 'Generated' && step.status !== 'complete' && (
        <div className="space-y-3 border-t border-slate-200 px-4 py-3">
          <textarea rows={2} placeholder="Add a comment (required to reject)…" className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={() => run((s) => toggleStep(s, 7, USERS.director))} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ps-green px-4 text-sm font-semibold text-white hover:brightness-110">
              <ThumbsUp size={14} /> Approve
            </button>
            <Button
              variant="secondary"
              className="text-rose-700"
              disabled={!comment.trim()}
              onClick={() => {
                run((s) => requestContractChanges(s, USERS.director, comment.trim()))
                setComment('')
              }}
            >
              <ThumbsDown size={14} /> Reject
            </Button>
          </div>
        </div>
      )}
      {c.comments.length > 0 && (
        <ul className="space-y-2 border-t border-slate-200 bg-slate-50/60 px-4 py-3">
          {c.comments.map((cm, i) => (
            <li key={i} className="flex gap-2 text-xs"><MessageSquare size={13} className="mt-0.5 text-slate-400" /><span><b>{cm.user}</b> · {relative(cm.at)} — {cm.text}</span></li>
          ))}
        </ul>
      )}
      {step.status !== 'complete' && c.status === 'Approved' && (
        <div className="border-t border-slate-200 px-4 py-3">
          <Button size="sm" onClick={() => run((s) => approveContract(s, USERS.director))}>Re-send approval (idempotency test)</Button>
        </div>
      )}
    </div>
  )
}

function AutomationPanel() {
  const { state } = useDemo()
  const statuses = integrationStatuses(state)
  return (
    <div className="p-4">
      <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">Connected automations</p>
      <ul className="space-y-2.5">
        {statuses.map((s) => (
          <li key={s.key} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2.5">
              <SystemIcon system={s.system} size={13} />
              <span className="flex-1 text-sm font-semibold text-slate-800">{s.label}</span>
              <span className={cn('size-2 rounded-full', { green: 'bg-emerald-500', amber: 'bg-amber-500 animate-pulse-dot', slate: 'bg-slate-300', blue: 'bg-sky-500', red: 'bg-rose-500', violet: 'bg-violet-500' }[s.tone])} />
            </div>
            <p className="mt-1.5 text-sm text-slate-700">{s.status}</p>
            <p className="text-xs text-slate-500">{s.detail}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <p className="mb-1 flex items-center gap-1 font-semibold text-slate-700"><ChevronDown size={12} /> Rules in this workflow</p>
        <ul className="list-disc space-y-0.5 pl-4">
          <li>Step 5 → upsert HubSpot contact + deal</li>
          <li>Step 6 → generate contract into Drive</li>
          <li>Step 7 approval → deal stage + Xero draft invoice</li>
          <li>Step 8 → Closed Won + archive folder</li>
        </ul>
        <Link to="/monitor" className="mt-2 inline-block text-ps-blue hover:underline">Open Automation Monitor →</Link>
      </div>
    </div>
  )
}

function ActivityPanel() {
  const { state } = useDemo()
  return (
    <ul className="p-4">
      {state.activity.slice(0, 40).map((a) => (
        <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
          <span className="absolute top-7 bottom-0 left-[13px] w-px bg-slate-200" />
          <SystemIcon system={a.system} size={12} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-800">{a.text}</p>
            <p className="text-[11px] text-slate-500">{a.actor} · {dateTime(a.at)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
