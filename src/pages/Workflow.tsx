import {
  BarChart3,
  ChevronDown,
  HelpCircle,
  Home as HomeIcon,
  Inbox as InboxIcon,
  LayoutTemplate,
  ListChecks,
  Settings as SettingsIcon,
  Users,
  ArrowLeft,
  ArrowRight,
  Bot,
  Calendar,
  Check,
  CircleCheck,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  History,
  Info,
  Lock,
  MessageSquare,
  Paperclip,
  PenLine,
  RefreshCw,
  Save,
  Share2,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Upload,
  UserRound,
  Workflow as WorkflowIcon,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActionMenu, ConfirmDialog, Spinner } from '../components/ui/overlays'
import { Avatar, Badge, Button, inputCls } from '../components/ui/primitives'
import { ProductFrame } from '../components/ui/ProductFrame'
import { IDS, USERS } from '../data/ids'
import type { DemoState, Transaction, WorkflowStep } from '../data/types'
import { cn, date, dateTime, relative, time, vt } from '../lib/format'
import { completedSteps, integrationStatuses } from '../lib/status'
import { SystemIcon } from '../lib/systems'
import { useDemo } from '../store/DemoStore'
import {
  addStepComment,
  hubspotHasPendingChanges,
  requestContractChanges,
  signContract,
  syncHubSpot,
  toggleStep,
  updateTransaction,
  uploadRunAttachment,
} from '../store/engine'

type RightTab = 'details' | 'automations' | 'activity'

/** A step is locked when stop tasks are enforced and the step before it is not complete. */
function isLocked(s: DemoState, step: WorkflowStep) {
  if (!s.settings.enforceStopTasks || !step.stop || step.status === 'complete') return false
  return s.steps.filter((x) => x.id < step.id).some((x) => x.status !== 'complete')
}

function dueState(step: WorkflowStep): { label: string; cls: string } {
  if (step.status === 'complete') return { label: `Completed ${step.completedAt ? time(step.completedAt) : ''}`, cls: 'text-ps-green' }
  const due = new Date(step.dueDate)
  const now = new Date()
  const days = Math.round((new Date(due.toDateString()).getTime() - new Date(now.toDateString()).getTime()) / 864e5)
  if (due.getTime() < now.getTime()) return { label: 'Overdue', cls: 'text-rose-600 font-medium' }
  if (days === 0) return { label: `Due today ${time(step.dueDate)}`, cls: 'text-amber-700 font-medium' }
  if (days === 1) return { label: 'Due tomorrow', cls: 'text-slate-600' }
  return { label: `Due ${date(step.dueDate)}`, cls: 'text-slate-500' }
}

function attachmentsFor(s: DemoState, stepId: number) {
  const base: string[] = []
  if (stepId === 4) base.push('Identification.pdf', 'Proof of Address.pdf', 'Sale Application.pdf')
  if (stepId === 6 && s.contract.driveFileId) base.push('Sale Contract — Draft.pdf')
  if (stepId === 7 && s.contract.approvedFileId) base.push('Sale Contract — Approved.pdf')
  return [...base, ...s.runAttachments.filter((a) => a.stepId === stepId).map((a) => a.name)]
}

export default function Workflow() {
  const { state, run, runDelayed, busy, interviewMode } = useDemo()
  const [params, setParams] = useSearchParams()
  const firstPending = state.steps.find((s) => s.status === 'pending')?.id ?? 8
  const selectedId = Number(params.get('step')) || firstPending
  const step = state.steps.find((s) => s.id === selectedId) ?? state.steps[0]
  const done = completedSteps(state)
  const pct = Math.round((done / state.steps.length) * 100)
  const locked = isLocked(state, step)

  const [draft, setDraft] = useState<Transaction>(state.transaction)
  useEffect(() => setDraft(state.transaction), [state.transaction])
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(state.transaction), [draft, state.transaction])
  const [rightTab, setRightTab] = useState<RightTab>('details')
  const [confirmUncomplete, setConfirmUncomplete] = useState<WorkflowStep | null>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)

  const select = (id: number) => setParams({ step: String(id) }, { replace: true })
  const save = () => run((s) => updateTransaction(s, draft))
  const actor = (st: WorkflowStep) => (st.id === 7 ? USERS.director : st.assignee === USERS.integration ? USERS.sales : st.assignee)
  const complete = (st: WorkflowStep) => {
    if (dirty) save()
    runDelayed(`complete-${st.id}`, (s) => toggleStep(s, st.id, actor(st)), st.kind === 'automation' || st.kind === 'approval' ? 800 : 300)
  }
  const sync = () => {
    if (dirty) save()
    runDelayed('sync', (s) => syncHubSpot(s, 'Manual “Sync to HubSpot” button'))
  }
  const toggleFromList = (st: WorkflowStep) => (st.status === 'complete' ? setConfirmUncomplete(st) : complete(st))

  return (
    <ProductFrame product="Process Street">
      <div className="flex min-h-0 flex-1 bg-white text-[#1f2937]">
      <PsAppNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Run header */}
        <header className="shrink-0 border-b border-slate-200 bg-white px-6 pt-3 pb-3">
          <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500"><span className="hover:text-ps-blue">Runs</span><span>/</span><span>Residential Lot Sale</span></nav>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-slate-900">Residential Lot Sale</h1>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', done === 8 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-ps-blue')}>{done === 8 ? 'Completed' : 'In progress'}</span>
              </div>
              <p className="mt-0.5 text-sm text-slate-600">LOT-025 — {state.transaction.buyerName}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="mr-1 hidden -space-x-1.5 xl:flex">
                {[USERS.sales, USERS.admin, USERS.director, USERS.finance].map((n) => <Avatar key={n} name={n} size={24} className="ring-2 ring-white" />)}
              </div>
              <Button size="sm" variant="ghost"><Share2 size={14} /> Share</Button>
              <Button size="sm" variant="hubspot" onClick={sync} disabled={busy === 'sync'}>{busy === 'sync' ? <Spinner size={12} /> : <RefreshCw size={14} />} Sync to HubSpot</Button>
              <ActionMenu
                trigger={<span className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700">Actions <ChevronDown size={13} /></span>}
                items={[
                  { label: 'Save changes', onClick: save, disabled: !dirty },
                  { label: 'View activity', onClick: () => setRightTab('activity') },
                  { label: 'Run details', onClick: () => setRightTab('details') },
                  { label: 'Open HubSpot deal', onClick: () => window.location.assign('#/crm/deal') },
                ]}
              />
              <button onClick={() => complete(step)} disabled={step.status === 'complete' || step.kind === 'approval' || locked || !!busy} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ps-blue px-3.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50">
                {busy === `complete-${step.id}` ? <Spinner size={12} /> : <Check size={14} />} Complete step
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-2 text-xs">
            {([['Run ID', IDS.processStreetRun], ['Started by', USERS.sales], ['Due date', date('2026-12-15')]] as [string, string][]).map(([k, v]) => (
              <div key={k}><p className="text-slate-500">{k}</p><p className={cn('font-medium text-slate-800', k === 'Run ID' && 'font-mono')}>{v}</p></div>
            ))}
            <div className="min-w-56 flex-1 sm:max-w-xs">
              <div className="mb-1 flex justify-between"><span className="font-medium text-slate-700">{done} of {state.steps.length} tasks completed</span><span className="text-slate-500">{pct}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-ps-green transition-all duration-500" style={{ width: `${pct}%` }} /></div>
            </div>
            {dirty && <Button size="sm" variant="primary" onClick={save}><Save size={13} /> Save changes</Button>}
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Task list */}
          <aside className="scroll-thin hidden w-[280px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white md:block">
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <span>Tasks</span><span className="font-normal normal-case">{done}/{state.steps.length}</span>
            </div>
            <ol className="pb-4">
              {state.steps.map((s) => (
                <TaskRow
                  key={s.id}
                  step={s}
                  state={state}
                  active={s.id === step.id}
                  busy={busy === `complete-${s.id}`}
                  onSelect={() => select(s.id)}
                  onToggle={() => toggleFromList(s)}
                  onComment={() => { select(s.id); setTimeout(() => commentRef.current?.focus(), 50) }}
                  onActivity={() => { select(s.id); setRightTab('activity') }}
                />
              ))}
            </ol>
          </aside>

          {/* Task content */}
          <section className="scroll-thin min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[760px] px-6 py-5">
              <div className="mb-4 md:hidden">
                <select className={inputCls} value={step.id} onChange={(e) => select(Number(e.target.value))}>
                  {state.steps.map((s) => <option key={s.id} value={s.id}>{s.id}. {s.title} {s.status === 'complete' ? '✓' : ''}</option>)}
                </select>
              </div>
              <TaskHeader step={step} locked={locked} />
              {locked && (
                <div className="mb-4 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  <Lock size={15} className="mt-0.5 text-slate-500" />
                  <span>This task is locked until <b>“{state.steps.find((x) => x.id === step.id - 1)?.title}”</b> is complete. Stop tasks keep contracts and accounting from running ahead of the sale.</span>
                </div>
              )}
              <p className="mb-5 text-sm leading-relaxed text-slate-600">{step.description}</p>

              <div className={cn(locked && 'pointer-events-none opacity-50')}>
                {step.kind === 'form' && <SaleForm draft={draft} setDraft={setDraft} dirty={dirty} onSave={save} />}
                {step.id === 2 && <ReadOnlyFacts rows={[['Project', state.transaction.project], ['Lot ID', state.transaction.lotId], ['Release', 'Stage 2 · Harbour outlook · 836 m²'], ['Title reference', 'DEMO/HVR/025 (synthetic)']]} subtasks={['Lot shows “Under contract” on the release schedule', 'Survey plan matches lot boundaries', 'No caveats or encumbrances recorded (demo)']} complete={step.status === 'complete'} />}
                {step.id === 3 && <ReadOnlyFacts rows={[['Sale price', vt(state.transaction.salePrice)], ['Currency', 'VUV'], ['Price list', 'Harbour View — Price list 2026'], ['Discount', 'None']]} subtasks={['Price matches the 2026 price list', 'Director sign-off recorded']} complete={step.status === 'complete'} />}
                {step.kind === 'documents' && <DocumentsTask />}
                {step.id === 5 && <CrmTask onSync={sync} syncing={busy === 'sync'} />}
                {step.id === 6 && <ContractTask onGenerate={() => complete(step)} generating={busy === 'complete-6'} />}
                {step.id === 7 && <ApprovalTask />}
                {step.id === 8 && <ReadOnlyFacts rows={[['Settlement date', date(state.transaction.settlementDate)], ['Deposit invoice', state.xero.invoice ? `${state.xero.invoice.number} · ${state.xero.invoice.status}` : 'Not created yet'], ['Contract', state.contract.signature === 'Signed' ? 'Signed' : 'Not signed yet'], ['HubSpot deal', IDS.hubspotDeal]]} subtasks={['Settlement funds received in trust account', 'Transfer documents lodged (demo)', 'Handover booked']} complete={step.status === 'complete'} />}
              </div>

              <Attachments stepId={step.id} />
              <Comments stepId={step.id} inputRef={commentRef} />

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <Button variant="ghost" size="sm" disabled={step.id === 1} onClick={() => select(step.id - 1)}><ArrowLeft size={14} /> Previous</Button>
                {step.status === 'complete' ? (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ps-green"><CircleCheck size={16} /> Completed by {step.completedBy} · {step.completedAt && dateTime(step.completedAt)}</span>
                    {!interviewMode && <Button size="sm" variant="ghost" onClick={() => setConfirmUncomplete(step)}>Uncomplete</Button>}
                  </div>
                ) : step.kind === 'approval' ? (
                  <span className="text-xs text-slate-500">Approve or reject using the controls above</span>
                ) : (
                  <button onClick={() => complete(step)} disabled={locked || !!busy} className="inline-flex h-9 items-center gap-2 rounded-md bg-ps-green px-5 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-50">
                    {busy === `complete-${step.id}` ? <Spinner size={14} /> : <Check size={16} />} Complete task
                  </button>
                )}
                <Button variant="ghost" size="sm" disabled={step.id === 8} onClick={() => select(step.id + 1)}>Next <ArrowRight size={14} /></Button>
              </div>
            </div>
          </section>

          {/* Right panel */}
          <aside className="scroll-thin hidden w-[270px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white xl:block">
            <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-white text-[13px]">
              {([['details', 'Run details', Info], ['automations', 'Integrations', Zap], ['activity', 'Activity', History]] as const).map(([k, l, I]) => (
                <button key={k} onClick={() => setRightTab(k)} className={cn('flex flex-1 items-center justify-center gap-1 py-2.5', rightTab === k ? 'border-b-2 border-ps-blue font-medium text-ps-blue' : 'text-slate-500 hover:text-slate-800')}>
                  <I size={13} /> {l}
                </button>
              ))}
            </div>
            {rightTab === 'details' && <RunDetails />}
            {rightTab === 'automations' && <AutomationPanel />}
            {rightTab === 'activity' && <ActivityPanel />}
          </aside>
        </div>
      </div>
      </div>

      <ConfirmDialog
        open={!!confirmUncomplete}
        title={`Uncomplete “${confirmUncomplete?.title}”?`}
        confirmLabel="Uncomplete task"
        onCancel={() => setConfirmUncomplete(null)}
        onConfirm={() => { const st = confirmUncomplete!; setConfirmUncomplete(null); run((s) => toggleStep(s, st.id, USERS.sales)) }}
      >
        Records already created in HubSpot, Drive or Xero are kept — nothing is rolled back. Re-completing the task will not create duplicates (idempotency keys).
      </ConfirmDialog>
    </ProductFrame>
  )
}

function TaskRow({ step, state, active, busy, onSelect, onToggle, onComment, onActivity }: { step: WorkflowStep; state: DemoState; active: boolean; busy: boolean; onSelect: () => void; onToggle: () => void; onComment: () => void; onActivity: () => void }) {
  const complete = step.status === 'complete'
  const locked = isLocked(state, step)
  const due = dueState(step)
  const comments = state.stepComments.filter((c) => c.stepId === step.id).length
  const files = attachmentsFor(state, step.id).length
  const canCheck = !locked && step.kind !== 'approval'
  return (
    <li>
      <div onClick={onSelect} className={cn('group flex cursor-pointer items-start gap-2.5 border-l-[3px] px-3 py-2.5', active ? 'border-ps-blue bg-white shadow-[inset_0_-1px_0_#e5e7eb,inset_0_1px_0_#e5e7eb]' : 'border-transparent hover:bg-white/70')}>
        <button
          onClick={(e) => { e.stopPropagation(); if (canCheck || complete) onToggle() }}
          disabled={!canCheck && !complete}
          aria-label={complete ? `Uncomplete ${step.title}` : `Complete ${step.title}`}
          className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            complete ? 'border-ps-green bg-ps-green text-white' : locked ? 'border-slate-200 bg-slate-100 text-slate-400' : 'border-slate-300 bg-white text-transparent hover:border-ps-green')}
        >
          {busy ? <Spinner size={10} className="text-ps-green" /> : locked ? <Lock size={10} /> : <Check size={12} strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[13px] leading-snug', complete ? 'text-slate-400 line-through decoration-slate-300' : locked ? 'text-slate-400' : 'font-medium text-slate-800')}>
            <span className="mr-1 text-slate-400 no-underline">{step.id}.</span>{step.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
            <span className="inline-flex items-center gap-1 text-slate-500"><Avatar name={step.assignee} size={14} />{step.assignee.split(' ')[0]}</span>
            <span className={due.cls}>{due.label}</span>
            {comments > 0 && <span className="inline-flex items-center gap-0.5 text-slate-500"><MessageSquare size={11} />{comments}</span>}
            {files > 0 && <span className="inline-flex items-center gap-0.5 text-slate-500"><Paperclip size={11} />{files}</span>}
            {step.kind === 'automation' && <span className="inline-flex items-center gap-0.5 text-violet-600"><Bot size={11} /> Zap</span>}
            {step.kind === 'approval' && <span className="inline-flex items-center gap-0.5 text-sky-700"><ShieldCheck size={11} /> Approval</span>}
          </div>
        </div>
        <div className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <ActionMenu
            items={[
              { label: 'Open task', onClick: onSelect },
              { label: complete ? 'Uncomplete' : 'Complete task', onClick: onToggle, disabled: !canCheck && !complete },
              { label: 'Add comment', onClick: onComment },
              { label: 'View activity', onClick: onActivity },
            ]}
          />
        </div>
      </div>
    </li>
  )
}

function TaskHeader({ step, locked }: { step: WorkflowStep; locked: boolean }) {
  return (
    <div className="mb-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {step.status === 'complete' ? <Badge tone="green" dot>Completed</Badge> : locked ? <Badge tone="slate"><Lock size={10} /> Locked</Badge> : step.kind === 'approval' ? <Badge tone="amber" dot>Awaiting approval</Badge> : <Badge tone="blue" dot>In progress</Badge>}
        {step.stop && <Badge tone="red">Stop task</Badge>}
        {step.kind === 'automation' && <Badge tone="violet"><Zap size={10} /> Triggers a Zap</Badge>}
      </div>
      <h2 className="text-xl font-semibold text-slate-900"><span className="font-normal text-slate-400">{step.id}.</span> {step.title}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><UserRound size={13} /> <Avatar name={step.assignee} size={18} /> {step.assignee}</span>
        <span className="inline-flex items-center gap-1.5"><Calendar size={13} /> Due {dateTime(step.dueDate)}</span>
        {step.completedAt && <span className="inline-flex items-center gap-1.5"><Clock size={13} /> Completed {dateTime(step.completedAt)} by {step.completedBy}</span>}
      </div>
    </div>
  )
}

/* ---------- form widgets ---------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2.5 border-b border-slate-200 pb-1.5 text-[13px] font-semibold text-slate-800">{title}</h3>
      <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function PsField({ label, children, required, full, help }: { label: string; children: ReactNode; required?: boolean; full?: boolean; help?: string }) {
  return (
    <label className={cn('block', full && 'sm:col-span-2')}>
      <span className="mb-1 block text-[13px] font-medium text-slate-700">{label} {required && <span className="text-rose-500">*</span>}</span>
      {children}
      {help && <span className="mt-1 block text-[11px] text-slate-500">{help}</span>}
    </label>
  )
}

const REQUIRED_DOCS: { id: string; label: string }[] = [
  { id: 'doc-id', label: 'Identification' },
  { id: 'doc-address', label: 'Proof of Address' },
  { id: 'doc-application', label: 'Sale Application' },
  { id: 'doc-contract', label: 'Sale Contract' },
]

function SaleForm({ draft, setDraft, dirty, onSave }: { draft: Transaction; setDraft: (t: Transaction) => void; dirty: boolean; onSave: () => void }) {
  const { state } = useDemo()
  const set = <K extends keyof Transaction>(k: K, v: Transaction[K]) => setDraft({ ...draft, [k]: v })
  return (
    <div>
      {dirty && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You have unsaved changes on this run.
          <Button size="sm" variant="primary" onClick={onSave}><Save size={13} /> Save</Button>
        </div>
      )}
      <Section title="Buyer">
        <PsField label="Buyer name" required><input className={inputCls} value={draft.buyerName} onChange={(e) => set('buyerName', e.target.value)} /></PsField>
        <PsField label="Buyer ID" help="Stable identifier used to match the HubSpot contact"><input className={cn(inputCls, 'font-mono')} value={draft.buyerId} disabled /></PsField>
        <PsField label="Email" required><input type="email" className={inputCls} value={draft.email} onChange={(e) => set('email', e.target.value)} /></PsField>
        <PsField label="Phone"><input className={inputCls} value={draft.phone} onChange={(e) => set('phone', e.target.value)} /></PsField>
      </Section>
      <Section title="Property">
        <PsField label="Project" required>
          <select className={inputCls} value={draft.project} onChange={(e) => set('project', e.target.value)}><option>Harbour View Residences</option></select>
        </PsField>
        <PsField label="Lot ID" required help="Locked once the run starts — part of the deal key"><input className={cn(inputCls, 'font-mono')} value={draft.lotId} disabled /></PsField>
      </Section>
      <Section title="Sale">
        <PsField label="Sale price" required>
          <div className="relative">
            <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-slate-500">VT</span>
            <input type="number" min={0} step={50000} className={cn(inputCls, 'pl-8 tabular-nums')} value={draft.salePrice} onChange={(e) => set('salePrice', Number(e.target.value))} />
          </div>
        </PsField>
        <PsField label="Currency"><input className={inputCls} value="VUV — Vanuatu vatu" disabled /></PsField>
        <PsField label="Sales representative">
          <select className={inputCls} value={draft.salesRep} onChange={(e) => set('salesRep', e.target.value)}><option>Sarah Williams</option><option>Lina Joseph</option></select>
        </PsField>
        <PsField label="Settlement date" required><input type="date" className={inputCls} value={draft.settlementDate} onChange={(e) => set('settlementDate', e.target.value)} /></PsField>
      </Section>
      <div className="mb-5">
        <h3 className="mb-2.5 border-b border-slate-200 pb-1.5 text-[13px] font-semibold text-slate-800">Required documents</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {REQUIRED_DOCS.map((d) => {
            const doc = state.documents.find((x) => x.id === d.id)
            const have = doc && doc.status !== 'Awaiting generation'
            return (
              <li key={d.id} className="flex items-center gap-2.5 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <span className={cn('flex size-4 items-center justify-center rounded-[3px] border', have ? 'border-ps-green bg-ps-green text-white' : 'border-slate-300 bg-white')}>{have && <Check size={11} strokeWidth={3} />}</span>
                <span className="flex-1">{d.label}</span>
                <span className={cn('text-xs', have ? 'text-ps-green' : 'text-amber-700')}>{doc?.status === 'Awaiting generation' ? 'Generated at step 6' : doc?.status}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function ReadOnlyFacts({ rows, subtasks, complete }: { rows: [string, string][]; subtasks: string[]; complete: boolean }) {
  return (
    <div className="space-y-5">
      <dl className="grid overflow-hidden rounded-md border border-slate-200 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="border-b border-slate-100 px-4 py-2.5 sm:odd:border-r">
            <dt className="text-[11px] tracking-wide text-slate-500 uppercase">{k}</dt>
            <dd className="text-sm font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <h3 className="mb-2 text-[13px] font-semibold text-slate-800">Subtasks</h3>
        <ul className="space-y-1.5">
          {subtasks.map((t) => (
            <li key={t} className="flex items-center gap-2 text-sm text-slate-700">
              <span className={cn('flex size-4 items-center justify-center rounded-[3px] border', complete ? 'border-ps-green bg-ps-green text-white' : 'border-slate-300')}>{complete && <Check size={11} strokeWidth={3} />}</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function DocumentsTask() {
  const { state, run } = useDemo()
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
        <span>File uploads</span>
        <span className="normal-case">{state.documents.filter((d) => d.status !== 'Awaiting generation').length} of {state.documents.length} on file</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {REQUIRED_DOCS.map((rd) => {
          const d = state.documents.find((x) => x.id === rd.id)!
          const f = state.drive.files.find((x) => x.id === d.driveFileId)
          const extra = state.runAttachments.filter((a) => a.stepId === 4 && a.name.startsWith(rd.label))
          return (
            <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
              <FileText size={17} className="text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{rd.label}</p>
                {f ? (
                  <Link to={`/documents/${f.parentId}?file=${f.id}`} className="inline-flex items-center gap-1 text-xs text-ps-blue hover:underline">{f.name} · in Google Drive <ExternalLink size={10} /></Link>
                ) : (
                  <p className="text-xs text-slate-500">{d.id === 'doc-contract' ? 'Generated by Zap 2A at step 6' : `${rd.label}.pdf · uploaded to this run · copied to Drive by Zap 2A`}{extra.length ? ` · ${extra.length} newer version${extra.length > 1 ? 's' : ''}` : ''}</p>
                )}
              </div>
              <Badge tone={d.status === 'Awaiting generation' ? 'amber' : 'green'} dot>{d.status}</Badge>
              {d.id !== 'doc-contract' && (
                <>
                  <input ref={(el) => { inputs.current[d.id] = el }} type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) run((s) => uploadRunAttachment(s, 4, `${rd.label} — ${file.name}`, file.size / 1024, USERS.sales)); e.target.value = '' }} />
                  <Button size="sm" variant="ghost" onClick={() => inputs.current[d.id]?.click()}><Upload size={13} /> Upload</Button>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function CrmTask({ onSync, syncing }: { onSync: () => void; syncing: boolean }) {
  const { state } = useDemo()
  const pending = hubspotHasPendingChanges(state)
  const deal = state.hubspot.deals.find((d) => d.id === IDS.hubspotDeal)
  return (
    <div className="rounded-md border border-slate-200">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <SystemIcon system="hubspot" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Zap 1 · Find or create buyer &amp; deal in HubSpot</p>
          <p className="text-xs text-slate-500">{pending ? 'Run data has changed since the last sync.' : `In sync · last run ${state.hubspot.lastSyncedAt ? relative(state.hubspot.lastSyncedAt) : '—'}`}</p>
        </div>
        {syncing ? <Badge tone="blue"><Spinner size={10} /> Running</Badge> : <Badge tone={pending ? 'amber' : 'green'} dot>{pending ? 'Ready to synchronize' : 'Synchronized'}</Badge>}
      </div>
      <dl className="grid gap-px bg-slate-100 text-xs sm:grid-cols-2">
        <div className="bg-white px-4 py-2.5"><dt className="text-slate-500">Contact match</dt><dd className="font-medium">Buyer ID <code>{state.transaction.buyerId}</code>, then normalised email</dd></div>
        <div className="bg-white px-4 py-2.5"><dt className="text-slate-500">Deal key</dt><dd className="font-medium">Lot ID + Buyer ID · <code>{state.transaction.lotId}-{state.transaction.buyerId}</code></dd></div>
        <div className="bg-white px-4 py-2.5"><dt className="text-slate-500">Contact</dt><dd><Link className="font-medium text-ps-blue hover:underline" to="/crm/contact">{IDS.hubspotContact}</Link></dd></div>
        <div className="bg-white px-4 py-2.5"><dt className="text-slate-500">Deal</dt><dd><Link className="font-medium text-ps-blue hover:underline" to="/crm/deal">{IDS.hubspotDeal}</Link> · {deal?.stage}</dd></div>
      </dl>
      <div className="flex items-center gap-2 px-4 py-3">
        <Button size="sm" variant="hubspot" onClick={onSync} disabled={syncing}>{syncing ? <Spinner size={12} /> : <RefreshCw size={13} />} Sync to HubSpot</Button>
        <span className="text-xs text-slate-500">Running it twice with the same data is skipped — never duplicated.</span>
      </div>
    </div>
  )
}

function ContractTask({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  const { state } = useDemo()
  const c = state.contract
  const ready = state.steps.filter((s) => s.id < 6).every((s) => s.status === 'complete')
  return (
    <div className="rounded-md border border-slate-200">
      <div className="flex items-start gap-3 px-4 py-3">
        <SystemIcon system="contracts" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Zap 2A · Generate sale contract</p>
          <p className="text-xs text-slate-500">Find/create the Drive folder → populate “{c.template}” → save draft to 04 Contracts → copy supporting documents</p>
        </div>
        {generating ? <Badge tone="blue"><Spinner size={10} /> Generating</Badge> : <Badge tone={c.status === 'Not generated' ? 'slate' : c.status === 'Approved' ? 'green' : 'blue'} dot>{c.status === 'Generated' ? 'Draft' : c.status}</Badge>}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
        {c.status === 'Not generated' ? (
          <Button size="sm" variant="primary" onClick={onGenerate} disabled={!ready || generating}>{ready ? <FileText size={13} /> : <Lock size={13} />} Generate contract</Button>
        ) : (
          <>
            <Link to="/contracts"><Button size="sm"><FileText size={13} /> Open {IDS.contract} v{c.version}</Button></Link>
            <Link to={`/documents/gd-025-ctr`}><Button size="sm" variant="ghost"><FolderOpen size={13} /> Drive folder</Button></Link>
          </>
        )}
        <span className="text-xs text-slate-500">Completing this task runs Zap 2A.</span>
      </div>
    </div>
  )
}

function ApprovalTask() {
  const { state, run, runDelayed, busy } = useDemo()
  const [comment, setComment] = useState('')
  const [confirm, setConfirm] = useState(false)
  const step = state.steps.find((s) => s.id === 7)!
  const c = state.contract
  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-[13px]">
        <span className="font-semibold text-slate-700">Tasks to approve</span>
        <span className="flex items-center gap-3 text-xs text-slate-500">Approver: {USERS.director}<Link to="/contracts/approval" className="font-medium text-ps-blue hover:underline">Open Contract Approval →</Link></span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <FileText size={17} className="text-slate-400" />
        <div className="flex-1">
          <p className="text-sm font-medium">6. Contract generated</p>
          <p className="text-xs text-slate-500">{c.status === 'Not generated' ? 'Not submitted — waiting on step 6' : <Link to="/contracts" className="text-ps-blue hover:underline">{IDS.contract} v{c.version} · Sale Contract — Draft.pdf</Link>}</p>
        </div>
        <Badge tone={c.status === 'Approved' ? 'green' : c.status === 'Generated' ? 'amber' : 'slate'} dot>{c.status === 'Approved' ? 'Approved' : c.status === 'Generated' ? 'Awaiting approval' : 'Not submitted'}</Badge>
      </div>
      {c.status === 'Generated' && step.status !== 'complete' && (
        <div className="space-y-2.5 border-t border-slate-200 px-4 py-3">
          <textarea rows={2} placeholder="Comment (required to reject)" className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={() => setConfirm(true)} disabled={!!busy} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ps-green px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
              {busy === 'complete-7' ? <Spinner size={12} /> : <ThumbsUp size={14} />} Approve
            </button>
            <Button size="sm" className="text-rose-700" disabled={!comment.trim()} onClick={() => { run((s) => requestContractChanges(s, USERS.director, comment.trim())); setComment('') }}><ThumbsDown size={14} /> Reject</Button>
          </div>
        </div>
      )}
      {c.comments.length > 0 && (
        <ul className="space-y-1.5 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5">
          {c.comments.map((cm, i) => <li key={i} className="flex gap-2 text-xs"><MessageSquare size={12} className="mt-0.5 text-slate-400" /><span><b>{cm.user}</b> · {relative(cm.at)} — {cm.text}</span></li>)}
        </ul>
      )}
      {c.status === 'Approved' && (
        <div className="space-y-2 border-t border-slate-200 px-4 py-3">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Buyer e-signature · Zap 2B → 2C</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={c.signature === 'Signed' ? 'green' : 'amber'} dot>{c.signature === 'Signed' ? 'Signed by buyer' : 'Awaiting signature'}</Badge>
            <span className="text-xs text-slate-500">Sent to {state.transaction.email}{c.sentAt ? ` · ${relative(c.sentAt)}` : ''}</span>
          </div>
          {c.signature === 'Out for signature' ? (
            <Button size="sm" variant="primary" disabled={!!busy} onClick={() => runDelayed('sign', (s) => signContract(s), 900)}>{busy === 'sign' ? <Spinner size={12} /> : <PenLine size={13} />} Simulate buyer signature</Button>
          ) : (
            <p className="text-xs text-slate-600">Signed PDF filed in Drive · HubSpot deal Closed Won · Zap 3 checked the Xero rules{state.xero.invoice ? ` and created draft ${state.xero.invoice.number}` : ''}.</p>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        title="Approve contract CTR-LOT-025?"
        confirmLabel="Approve and send for signature"
        confirmClassName="bg-ps-green hover:bg-ps-green hover:brightness-110"
        onCancel={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); runDelayed('complete-7', (s) => toggleStep(s, 7, USERS.director), 900) }}
      >
        Zap 2B will save the approved PDF to Google Drive, send it to {state.transaction.email} for e-signature and move the HubSpot deal to <b>Out for Signature</b>. Nothing is created in Xero until the buyer signs and the deal is won.
      </ConfirmDialog>
    </div>
  )
}

function Attachments({ stepId }: { stepId: number }) {
  const { state, run } = useDemo()
  const input = useRef<HTMLInputElement>(null)
  const files = attachmentsFor(state, stepId)
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800"><Paperclip size={14} /> Attachments <span className="font-normal text-slate-400">{files.length}</span></h3>
        <input ref={input} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) run((s) => uploadRunAttachment(s, stepId, f.name, f.size / 1024, USERS.sales)); e.target.value = '' }} />
        <Button size="sm" variant="ghost" onClick={() => input.current?.click()}><Upload size={13} /> Upload document</Button>
      </div>
      {files.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 px-3 py-3 text-center text-xs text-slate-500">No files on this task.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => <li key={f + i} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs"><FileText size={12} className="text-rose-500" />{f}</li>)}
        </ul>
      )}
    </div>
  )
}

function Comments({ stepId, inputRef }: { stepId: number; inputRef: React.RefObject<HTMLTextAreaElement | null> }) {
  const { state, run } = useDemo()
  const [text, setText] = useState('')
  const list = state.stepComments.filter((c) => c.stepId === stepId)
  return (
    <div className="mt-6">
      <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-800"><MessageSquare size={14} /> Comments <span className="font-normal text-slate-400">{list.length}</span></h3>
      <ul className="mb-3 space-y-3">
        {list.map((c) => (
          <li key={c.id} className="flex gap-2.5">
            <Avatar name={c.user} size={26} />
            <div className="min-w-0 flex-1 rounded-md bg-slate-50 px-3 py-2">
              <p className="text-xs"><b className="text-slate-800">{c.user}</b> <span className="text-slate-500">· {dateTime(c.at)}</span></p>
              <p className="text-sm text-slate-700">{c.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex gap-2.5">
        <Avatar name={USERS.sales} size={26} />
        <div className="flex-1">
          <textarea ref={inputRef} rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment… (@mention a teammate)" className={inputCls} />
          <div className="mt-1.5 flex justify-end">
            <Button size="sm" variant="primary" disabled={!text.trim()} onClick={() => { run((s) => addStepComment(s, stepId, USERS.sales, text.trim())); setText('') }}>Add comment</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- right panel ---------- */

function RunDetails() {
  const { state } = useDemo()
  const folder = state.drive.files.some((f) => f.id === IDS.driveFolder)
  const rows: [string, ReactNode][] = [
    ['Workflow', 'Residential Lot Sale (v4)'],
    ['Run ID', <span className="font-mono">{IDS.processStreetRun}</span>],
    ['Transaction', <span className="font-mono">{IDS.transaction}</span>],
    ['Started by', USERS.sales],
    ['Run due', date('2026-12-15')],
    ['HubSpot deal', <Link className="text-ps-blue hover:underline" to="/crm/deal">{IDS.hubspotDeal}</Link>],
    ['Drive folder', folder ? <Link className="text-ps-blue hover:underline" to={`/documents/${IDS.driveFolder}`}>LOT-025 — Alex Morgan</Link> : <span className="text-slate-400">Created by Zap 2A</span>],
    ['Xero invoice', state.xero.invoice ? <Link className="text-ps-blue hover:underline" to="/accounting/invoice">{state.xero.invoice.number}</Link> : <span className="text-slate-400">After deal won</span>],
  ]
  return (
    <div className="p-4">
      <dl className="space-y-2.5 text-[13px]">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-slate-800">{v}</dd></div>)}
      </dl>
      <p className="mt-4 mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Assignees</p>
      <ul className="space-y-1.5 text-[13px]">
        {[[USERS.sales, 'Sales'], [USERS.admin, 'Admin'], [USERS.director, 'Approver'], [USERS.finance, 'Finance']].map(([n, r]) => (
          <li key={n} className="flex items-center gap-2"><Avatar name={n} size={22} /> <span className="flex-1">{n}</span><span className="text-xs text-slate-500">{r}</span></li>
        ))}
      </ul>
    </div>
  )
}

function AutomationPanel() {
  const { state } = useDemo()
  return (
    <div className="p-4">
      <ul className="space-y-2">
        {integrationStatuses(state).map((s) => (
          <li key={s.key} className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center gap-2.5">
              <SystemIcon system={s.system} size={13} />
              <span className="flex-1 text-[13px] font-semibold text-slate-800">{s.label}</span>
              <span className={cn('size-2 rounded-full', { green: 'bg-emerald-500', amber: 'bg-amber-500 animate-pulse-dot', slate: 'bg-slate-300', blue: 'bg-sky-500', red: 'bg-rose-500', violet: 'bg-violet-500' }[s.tone])} />
            </div>
            <p className="mt-1.5 text-[13px] text-slate-700">{s.status}</p>
            <p className="text-xs text-slate-500">{s.detail}</p>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
        <p className="mb-1 font-semibold text-slate-700">Zaps on this workflow</p>
        <ul className="space-y-0.5">
          <li>Zap 1 · step 5 → HubSpot buyer + deal</li>
          <li>Zap 2A · step 6 → Drive folder + draft</li>
          <li>Zap 2B · step 7 approved → e-signature</li>
          <li>Zap 2C · signed → Drive + Closed Won</li>
          <li>Zap 3 · deal won + rules → Xero draft</li>
        </ul>
        <Link to="/zaps" className="mt-2 inline-block font-medium text-ps-blue hover:underline">Open Zaps →</Link>
      </div>
    </div>
  )
}

function ActivityPanel() {
  const { state } = useDemo()
  return (
    <ul className="p-4">
      {state.activity.slice(0, 40).map((a) => (
        <li key={a.id} className="relative flex gap-3 pb-3.5 last:pb-0">
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

/** Process Street-style app navigation (original component, no vendor logo). */
function PsAppNav() {
  const items: [string, typeof Info, boolean, number?][] = [
    ['Home', HomeIcon, false], ['Inbox', InboxIcon, false, 2], ['Workflows', WorkflowIcon, false], ['Runs', ListChecks, true], ['Reports', BarChart3, false], ['People', Users, false], ['Templates', LayoutTemplate, false],
  ]
  return (
    <nav className="hidden w-[176px] shrink-0 flex-col bg-[#13253d] py-3 text-[13px] text-white/75 lg:flex" aria-label="Process Street">
      <div className="mb-4 flex items-center gap-2 px-4 text-white">
        <span className="flex size-6 items-center justify-center rounded bg-ps-blue"><WorkflowIcon size={13} /></span>
        <span className="text-[15px] font-semibold tracking-tight">Process Street</span>
      </div>
      {items.map(([label, Icon, active, badge]) => (
        <span key={label} className={cn('mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-1.5', active ? 'bg-white/12 font-medium text-white' : 'hover:bg-white/5')}>
          <Icon size={15} />{label}
          {badge && <span className="ml-auto rounded-full bg-white/15 px-1.5 text-[10px]">{badge}</span>}
        </span>
      ))}
      <div className="mt-auto">
        {([['Help', HelpCircle], ['Settings', SettingsIcon]] as const).map(([label, Icon]) => (
          <span key={label} className="mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 hover:bg-white/5"><Icon size={15} />{label}</span>
        ))}
      </div>
    </nav>
  )
}
