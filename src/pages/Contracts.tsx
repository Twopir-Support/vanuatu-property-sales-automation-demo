import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Download, ExternalLink, FileText, FolderOpen, Lock, MoreHorizontal, PenLine, Printer, RefreshCw, Send, ZoomIn, ZoomOut } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ConfirmDialog, Spinner } from '../components/ui/overlays'
import { inputCls } from '../components/ui/primitives'
import { COMPANY, IDS, USERS } from '../data/ids'
import type { DemoState } from '../data/types'
import { cn, date, dateTime, longDate, relative, vt } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { approveContract, generateContract, regenerateContract, rejectContract, requestContractChanges, sendContractForReview, signContract, toggleStep } from '../store/engine'

const LIFECYCLE = ['DRAFT', 'INTERNAL REVIEW', 'APPROVED', 'SENT FOR SIGNATURE', 'SIGNED'] as const

/** Where the contract is in its lifecycle (-1 = not generated yet). */
function lifecycleIndex(s: DemoState) {
  const c = s.contract
  if (c.signature === 'Signed') return 4
  if (c.signature === 'Out for signature') return 3
  if (c.status === 'Approved') return 2
  if (c.status === 'Generated') return c.reviewRequestedAt ? 1 : 0
  return -1
}

function validations(s: DemoState) {
  const t = s.transaction
  const docs = s.documents.filter((d) => d.id !== 'doc-contract')
  return [
    { label: 'Buyer name', ok: !!t.buyerName, detail: t.buyerName },
    { label: 'Lot ID', ok: !!t.lotId, detail: t.lotId },
    { label: 'Purchase price', ok: t.salePrice > 0, detail: vt(t.salePrice) },
    { label: 'Project', ok: !!t.project, detail: t.project },
    { label: 'Settlement date', ok: !!t.settlementDate, detail: t.settlementDate ? longDate(t.settlementDate) : 'Missing' },
    { label: 'Required fields complete', ok: !!(t.email && t.phone && t.buyerId) && docs.every((d) => d.status === 'Received'), detail: `${docs.filter((d) => d.status === 'Received').length} of ${docs.length} documents · buyer contact details` },
  ]
}

function ContractTabs() {
  const tab = (to: string, label: string, end?: boolean) => (
    <NavLink to={to} end={end} className={({ isActive }) => cn('border-b-2 px-1 pb-2 text-[13px] font-medium', isActive ? 'border-brand-700 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800')}>{label}</NavLink>
  )
  return <nav className="flex gap-5">{tab('/contracts', 'Generate', true)}{tab('/contracts/approval', 'Approval')}</nav>
}

function LifecycleStrip({ life }: { life: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-1 text-[10px] font-semibold tracking-wide">
      {LIFECYCLE.map((stage, i) => (
        <li key={stage} className="flex items-center gap-1">
          <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5', i < life ? 'bg-emerald-50 text-emerald-700' : i === life ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-400')}>{i < life && <Check size={10} strokeWidth={3} />}{stage}</span>
          {i < LIFECYCLE.length - 1 && <ChevronRight size={11} className="text-slate-300" />}
        </li>
      ))}
    </ol>
  )
}

function DataField({ label, value, suffix, icon }: { label: string; value: string; suffix?: string; icon?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-600">{label}</span>
      <span className="flex items-center rounded-md border border-slate-300 bg-white text-sm">
        <span className="flex-1 truncate px-2.5 py-1.5">{value || <span className="text-slate-400">—</span>}</span>
        {suffix && <span className="border-l border-slate-200 px-2 py-1.5 text-xs text-slate-500">{suffix}</span>}
        {icon && <span className="px-2 text-slate-400">{icon}</span>}
      </span>
    </label>
  )
}

/** Paginated preview frame around the document, like a PDF viewer. */
function Viewer({ children, pages = 6 }: { children: ReactNode; pages?: number }) {
  const [zoom, setZoom] = useState(100)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto bg-[#e9ebee] px-4 py-5">
        <div style={{ zoom: zoom / 100 }}>{children}</div>
      </div>
      <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
        <button className="rounded p-1 hover:bg-slate-100" aria-label="Previous page"><ChevronLeft size={14} /></button>
        <span>Page <b>1</b> of {pages}</span>
        <button className="rounded p-1 hover:bg-slate-100" aria-label="Next page"><ChevronRight size={14} /></button>
        <span className="ml-auto tabular-nums">{zoom}%</span>
        <button onClick={() => setZoom((z) => Math.max(70, z - 10))} className="rounded p-1 hover:bg-slate-100" aria-label="Zoom out"><ZoomOut size={14} /></button>
        <button onClick={() => setZoom((z) => Math.min(130, z + 10))} className="rounded p-1 hover:bg-slate-100" aria-label="Zoom in"><ZoomIn size={14} /></button>
        <button className="rounded p-1 hover:bg-slate-100" aria-label="Print"><Printer size={14} /></button>
        <button className="rounded p-1 hover:bg-slate-100" aria-label="Download"><Download size={14} /></button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Generate                                                             */
/* ------------------------------------------------------------------ */

export default function Contracts() {
  const { state, run, runDelayed, busy } = useDemo()
  const c = state.contract
  const t = state.transaction
  const life = lifecycleIndex(state)
  const checks = validations(state)
  const allOk = checks.every((x) => x.ok)
  const priorSteps = state.steps.filter((s) => s.id < 6).every((s) => s.status === 'complete')
  const step6 = state.steps.find((s) => s.id === 6)!
  const generate = () => runDelayed('gen', (s) => (step6.status === 'pending' ? toggleStep(s, 6, USERS.sales) : generateContract(s, 'Contracts — Generate Contract')), 1000)
  const versions = state.drive.files.filter((f) => f.parentId === 'gd-025-ctr').sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))

  return (
    <div className="flex h-full min-h-[760px] flex-col bg-[#f4f5f7]">
      <div className="border-b border-slate-200 bg-white px-6 pt-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <h1 className="flex items-center gap-1 text-xl font-semibold tracking-tight text-slate-900">Generate Sale Contract <ChevronDown size={16} className="text-slate-400" /></h1>
            <p className="text-[13px] text-slate-600">LOT-025 — {t.buyerName} <span className="font-mono text-xs text-slate-500">· {IDS.transaction} · {IDS.contract}</span></p>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-slate-600">Template
            <select className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-800" value={c.template} disabled><option>{c.template}</option></select>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <Link to={c.driveFileId ? `/documents/gd-025-ctr?file=${c.signedFileId ?? c.approvedFileId ?? c.driveFileId}&view=preview` : '#'} className={cn('inline-flex h-8 items-center rounded-md bg-brand-700 px-3 text-sm font-medium text-white hover:bg-brand-600', !c.driveFileId && 'pointer-events-none opacity-40')}>Preview</Link>
            <Link to="/workflow?step=1" className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit Data</Link>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2"><ContractTabs /><div className="pb-2"><LifecycleStrip life={life} /></div></div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* Data */}
        <section className="h-fit space-y-3 rounded-md border border-slate-200 bg-white p-4">
          <DataField label="Buyer name" value={t.buyerName} />
          <DataField label="Lot ID" value={t.lotId} />
          <DataField label="Project" value={t.project} />
          <DataField label="Sale price" value={t.salePrice.toLocaleString('en-US')} suffix="VUV" />
          <DataField label="Settlement date" value={date(t.settlementDate)} icon={<Calendar size={14} />} />
          <DataField label="Sales representative" value={t.salesRep} />
          <p className="border-t border-slate-100 pt-2 text-[11px] text-slate-500">Values come from Process Street run {IDS.processStreetRun} and HubSpot deal {IDS.hubspotDeal}. Change them with <b>Edit Data</b>.</p>
        </section>

        {/* Document */}
        <section className="flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
          <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
            <FileText size={15} className="text-rose-600" />
            <p className="text-[13px] font-semibold">{c.signedFileId ? 'Sale Contract — Signed.pdf' : c.approvedFileId ? 'Sale Contract — Approved.pdf' : c.driveFileId ? `Sale Contract — Draft${c.version > 1 ? ` v${c.version}` : ''}.pdf` : 'Template preview (unmerged)'}</p>
            {c.driveFileId && <Link to={`/documents/gd-025-ctr?file=${c.signedFileId ?? c.approvedFileId ?? c.driveFileId}`} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"><FolderOpen size={13} /> View in Drive <ExternalLink size={10} /></Link>}
          </header>
          <Viewer><ContractDocument state={state} /></Viewer>
        </section>

        {/* Validation + actions */}
        <aside className="h-fit space-y-3">
          <section className="rounded-md border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 px-4 py-2.5 text-[13px] font-semibold">Document validation</h2>
            <ul className="space-y-0.5 px-4 py-2.5">
              {checks.map((v) => (
                <li key={v.label} className="flex items-start gap-2.5 py-1" title={v.detail}>
                  {v.ok ? <span className="mt-0.5 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-white"><Check size={10} strokeWidth={3.5} /></span> : <CircleAlert size={16} className="mt-0.5 text-amber-600" />}
                  <span className="text-[13px] text-slate-800">{v.label}</span>
                </li>
              ))}
            </ul>
            <div className={cn('mx-4 mb-3 rounded-md px-3 py-2.5 text-xs', allOk ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900')}>
              <p className="font-semibold">{allOk ? (life >= 1 ? 'In review' : 'Ready for review') : 'Not ready'}</p>
              <p>{allOk ? 'All required fields are complete.' : 'Complete the missing fields in Process Street.'}</p>
            </div>
          </section>
          <section className="space-y-2 rounded-md border border-slate-200 bg-white p-4">
            <button onClick={generate} disabled={c.status !== 'Not generated' || !allOk || !priorSteps || !!busy} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-ps-blue text-sm font-semibold text-white hover:brightness-110 disabled:opacity-45">
              {busy === 'gen' ? <Spinner size={13} /> : !priorSteps ? <Lock size={14} /> : <FileText size={14} />} Generate Contract
            </button>
            <button onClick={() => run((s) => sendContractForReview(s, USERS.sales))} disabled={c.status !== 'Generated' || !!c.reviewRequestedAt} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-ps-blue text-sm font-semibold text-ps-blue hover:bg-blue-50 disabled:opacity-40">
              <Send size={14} /> Send for Approval
            </button>
            <div className="flex gap-2">
              <button onClick={() => run((s) => regenerateContract(s, USERS.sales))} disabled={c.status !== 'Generated'} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"><RefreshCw size={13} /> Regenerate</button>
              <button className="inline-flex h-9 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50" aria-label="More"><MoreHorizontal size={15} /></button>
            </div>
            {life >= 1 && <Link to="/contracts/approval" className="block pt-1 text-center text-xs font-medium text-brand-700 hover:underline">Open approval →</Link>}
            <p className="pt-1 text-[11px] font-semibold tracking-wide text-rose-700">SAMPLE DOCUMENT — NOT A LEGAL AGREEMENT</p>
          </section>
          <section className="rounded-md border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 px-4 py-2 text-[13px] font-semibold">Files in Drive · 04 Contracts</h2>
            {versions.length === 0 ? <p className="px-4 py-2.5 text-xs text-slate-500">None yet — Zap 2A creates the folder and saves the draft.</p> : (
              <ul className="divide-y divide-slate-100">{versions.map((f) => <li key={f.id}><Link to={`/documents/gd-025-ctr?file=${f.id}`} className="flex items-center gap-2 px-4 py-1.5 text-[13px] hover:bg-slate-50"><FileText size={13} className="text-rose-600" /><span className="flex-1 truncate">{f.name}</span><span className="text-[11px] text-slate-500">{relative(f.modifiedAt)}</span></Link></li>)}</ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Approval                                                             */
/* ------------------------------------------------------------------ */

export function ContractApproval() {
  const { state, run, runDelayed, busy } = useDemo()
  const c = state.contract
  const t = state.transaction
  const life = lifecycleIndex(state)
  const step7 = state.steps.find((s) => s.id === 7)!
  const [compliance, setCompliance] = useState(false)
  const [dialog, setDialog] = useState<null | 'approve' | 'changes' | 'reject' | 'sign'>(null)
  const [comment, setComment] = useState('')
  const checks = validations(state)
  const docsOk = checks[5].ok
  const checklist = [
    { label: 'Buyer information validated', ok: checks[0].ok },
    { label: 'Property information validated', ok: checks[1].ok && checks[3].ok },
    { label: 'Sale price validated', ok: checks[2].ok },
    { label: 'Required documents present', ok: docsOk },
    { label: 'Compliance review complete', ok: compliance || c.status === 'Approved', manual: true },
  ]
  const canDecide = c.status === 'Generated'
  const status = c.signature === 'Signed' ? ['Signed', 'bg-emerald-100 text-emerald-800'] : c.signature === 'Out for signature' ? ['Awaiting Signature', 'bg-sky-100 text-sky-800'] : c.status === 'Approved' ? ['Approved', 'bg-emerald-100 text-emerald-800'] : c.status === 'Generated' ? ['Awaiting Approval', 'bg-amber-100 text-amber-800'] : ['Not generated', 'bg-slate-100 text-slate-600']
  const approve = () => runDelayed('approve', (s) => (step7.status === 'pending' ? toggleStep(s, 7, USERS.director) : approveContract(s, USERS.director, 'Contract Approval screen')), 900)

  return (
    <div className="flex h-full min-h-[760px] flex-col bg-[#f4f5f7]">
      <div className="border-b border-slate-200 bg-white px-6 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Contract Approval — LOT-025</h1>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', status[1])}>{status[0]}</span>
          {c.driveFileId && <Link to={`/documents/gd-025-ctr?file=${c.signedFileId ?? c.approvedFileId ?? c.driveFileId}`} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-ps-blue px-3 text-sm font-medium text-ps-blue hover:bg-blue-50"><FolderOpen size={14} /> View in Drive</Link>}
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2"><ContractTabs /><div className="pb-2"><LifecycleStrip life={life} /></div></div>
      </div>

      {c.status === 'Not generated' ? (
        <div className="m-6 rounded-md border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="font-semibold">No contract to approve yet</p>
          <p className="text-sm text-slate-600">The draft is generated by Zap 2A when workflow step 6 is completed.</p>
          <Link to="/contracts" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">Go to Generate →</Link>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
            <Viewer><ContractDocument state={state} /></Viewer>
          </section>
          <aside className="h-fit space-y-3">
            <section className="rounded-md border border-slate-200 bg-white">
              <h2 className="border-b border-slate-200 px-4 py-2.5 text-[13px] font-semibold">Transaction summary</h2>
              <dl className="space-y-1.5 px-4 py-3 text-[13px]">
                {([['Buyer', t.buyerName], ['Lot ID', t.lotId], ['Project', t.project], ['Sale price', vt(t.salePrice)], ['Settlement', date(t.settlementDate)], ['Sales rep', t.salesRep], ['Version', `v${c.version} · ${c.template}`]] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[96px_1fr] gap-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-800">{v}</dd></div>
                ))}
              </dl>
            </section>
            <section className="rounded-md border border-slate-200 bg-white">
              <h2 className="border-b border-slate-200 px-4 py-2.5 text-[13px] font-semibold">Approval checklist</h2>
              <ul className="px-4 py-2.5">
                {checklist.map((v) => (
                  <li key={v.label} className="flex items-center gap-2.5 py-1 text-[13px]">
                    {v.manual && canDecide ? (
                      <input type="checkbox" checked={compliance} onChange={(e) => setCompliance(e.target.checked)} className="size-4 accent-emerald-600" aria-label={v.label} />
                    ) : v.ok ? <span className="flex size-4 items-center justify-center rounded-full bg-emerald-600 text-white"><Check size={10} strokeWidth={3.5} /></span> : <CircleAlert size={16} className="text-amber-600" />}
                    <span className={v.ok ? 'text-slate-800' : 'text-slate-500'}>{v.label}{v.manual && canDecide ? <span className="text-slate-400"> (reviewer confirms)</span> : null}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-[13px]">
                <span className="text-slate-500">Status</span>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', status[1])}>{status[0]}</span>
                <span className="ml-auto text-xs text-slate-500">Approver: {USERS.director}</span>
              </div>
            </section>

            {canDecide && (
              <section className="grid grid-cols-2 gap-2">
                <button onClick={() => setDialog('approve')} disabled={!compliance || !!busy} title={compliance ? '' : 'Confirm the compliance review first'} className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-45">{busy === 'approve' ? <Spinner size={12} /> : null}Approve Contract</button>
                <button onClick={() => setDialog('changes')} className="h-10 rounded-md border border-amber-500 bg-amber-50 text-[13px] font-semibold text-amber-800 hover:bg-amber-100">Request Changes</button>
                <button onClick={() => setDialog('reject')} className="h-10 rounded-md border border-rose-500 text-[13px] font-semibold text-rose-700 hover:bg-rose-50">Reject</button>
              </section>
            )}

            {c.status === 'Approved' && (
              <section className="space-y-2 rounded-md border border-slate-200 bg-white p-4 text-[13px]">
                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Buyer e-signature · Zap 2B → 2C</p>
                <p>Approved by <b>{c.approver}</b>{c.approvedAt ? ` · ${dateTime(c.approvedAt)}` : ''}. Sent to {t.email}.</p>
                {c.signature === 'Out for signature' ? (
                  <button onClick={() => setDialog('sign')} disabled={!!busy} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-brand-700 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">{busy === 'sign' ? <Spinner size={13} /> : <PenLine size={14} />} Simulate buyer signature</button>
                ) : (
                  <p className="rounded bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800">Signed {c.signedAt ? dateTime(c.signedAt) : ''} · deal Closed Won{state.xero.invoice ? ` · Xero draft ${state.xero.invoice.number}` : ''}</p>
                )}
              </section>
            )}

            {c.comments.length > 0 && (
              <section className="rounded-md border border-slate-200 bg-white">
                <h2 className="border-b border-slate-200 px-4 py-2 text-[13px] font-semibold">Review comments</h2>
                <ul className="space-y-1.5 px-4 py-2.5 text-xs">{c.comments.map((cm, i) => <li key={i}><b>{cm.user}</b> · {relative(cm.at)} — {cm.text}</li>)}</ul>
              </section>
            )}
          </aside>
        </div>
      )}

      <ConfirmDialog open={dialog === 'approve'} title="Approve contract CTR-LOT-025?" confirmLabel="Approve contract" confirmClassName="bg-emerald-600 hover:bg-emerald-500" onCancel={() => setDialog(null)} onConfirm={() => { setDialog(null); approve() }}>
        Zap 2B saves <b>Sale Contract — Approved.pdf</b> to Drive, sends it to {t.email} for e-signature and moves the HubSpot deal to <b>Out for Signature</b>. Nothing is created in Xero until the buyer signs and the deal is won.
      </ConfirmDialog>
      <ConfirmDialog open={dialog === 'sign'} title="Simulate the buyer signing?" confirmLabel="Simulate signature" onCancel={() => setDialog(null)} onConfirm={() => { setDialog(null); runDelayed('sign', (s) => signContract(s), 900) }}>
        In production this event comes from the e-signature tool. Zap 2C files <b>Sale Contract — Signed.pdf</b> and marks the deal <b>Closed Won</b>, which triggers Zap 3’s Xero checks.
      </ConfirmDialog>
      {(dialog === 'changes' || dialog === 'reject') && (
        <div className="fixed inset-0 top-7 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={() => setDialog(null)}>
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <p className="px-5 pt-4 text-base font-semibold">{dialog === 'reject' ? 'Reject this contract?' : 'Request changes'}</p>
            <div className="space-y-2 px-5 py-3 text-sm text-slate-600">
              <p>{dialog === 'reject' ? 'The draft goes back to the sales rep and must be regenerated before it can be approved.' : 'A HubSpot task is created for the sales rep. The draft stays in review.'}</p>
              <textarea autoFocus rows={3} className={inputCls} placeholder="Comment for the sales rep (required)" value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 rounded-b-lg border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button onClick={() => setDialog(null)} className="h-8 rounded-md border border-slate-300 bg-white px-3 text-sm">Cancel</button>
              <button disabled={!comment.trim()} onClick={() => { const txt = comment.trim(); run((s) => (dialog === 'reject' ? rejectContract(s, USERS.director, txt) : requestContractChanges(s, USERS.director, txt))); setComment(''); setDialog(null) }}
                className={cn('h-8 rounded-md px-3 text-sm font-semibold text-white disabled:opacity-40', dialog === 'reject' ? 'bg-rose-600' : 'bg-amber-600')}>{dialog === 'reject' ? 'Reject' : 'Request changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ v, raw, merged }: { v: string; raw: string; merged: boolean }) {
  return merged ? <span>{v}</span> : <span className="rounded-sm bg-violet-50 px-0.5 font-mono text-[12px] text-violet-700">{raw}</span>
}

function ContractDocument({ state }: { state: DemoState }) {
  const c = state.contract
  const t = state.transaction
  const m = c.version > 0
  return (
    <article className="relative mx-auto max-w-[640px] bg-white px-12 py-10 font-serif text-[13.5px] leading-[1.7] text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,.18)]">
      {c.signature !== 'Signed' && m && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[90px] font-bold tracking-widest text-slate-900/[.04] select-none" style={{ transform: 'rotate(-30deg)' }}>{c.status === 'Approved' ? 'APPROVED' : 'DRAFT'}</span>}
      <div className="flex items-start justify-between">
        <div className="font-sans">
          <svg width="40" height="22" viewBox="0 0 40 22" aria-hidden="true"><path d="M2 20 L14 6 L22 14 L28 8 L38 20" fill="none" stroke="#0f766e" strokeWidth="2" /><path d="M2 20 H38" stroke="#0f766e" strokeWidth="2" /></svg>
          <p className="mt-0.5 text-[10px] font-bold tracking-[.18em] text-slate-700">PACIFIC HORIZON</p>
          <p className="text-[9px] tracking-[.3em] text-slate-500">DEVELOPMENTS</p>
        </div>
        <p className="border border-rose-300 px-2 py-1 text-center font-sans text-[9px] leading-tight font-bold tracking-wider text-rose-700">SAMPLE DOCUMENT —<br />NOT A LEGAL AGREEMENT</p>
      </div>
      <h2 className="mt-5 text-center text-[17px] font-bold tracking-wide">RESIDENTIAL LOT SALE AGREEMENT</h2>
      <p className="mb-5 text-center font-sans text-[11px] text-slate-500">{IDS.contract} · Version {m ? c.version : '—'} · {c.template}</p>
      <p className="font-sans text-[12px] font-bold">1. Parties</p>
      <table className="mb-3 w-full font-sans text-[12px]"><tbody>
        <tr><th className="w-32 py-0.5 text-left font-semibold text-slate-600">Seller</th><td>{COMPANY.name}, {COMPANY.location}</td></tr>
        <tr><th className="py-0.5 text-left font-semibold text-slate-600">Purchaser</th><td><Field v={`${t.buyerName} (${t.buyerId})`} raw="{{buyer_name}}" merged={m} /></td></tr>
      </tbody></table>
      <p className="font-sans text-[12px] font-bold">2. Property</p>
      <p className="mb-3 font-sans text-[12px]"><Field v={`${t.lotId}, ${t.project}, Port Vila, Vanuatu`} raw="{{lot_id}}, {{project}}" merged={m} /></p>
      <p className="font-sans text-[12px] font-bold">3. Purchase Price</p>
      <p className="mb-3 font-sans text-[12px]"><Field v={`${vt(t.salePrice)} (${t.currency})`} raw="{{sale_price}}" merged={m} /> · deposit 10% <Field v={`(${vt(t.salePrice * 0.1)})`} raw="{{deposit}}" merged={m} /></p>
      <p className="font-sans text-[12px] font-bold">4. Settlement Date</p>
      <p className="mb-3 font-sans text-[12px]"><Field v={longDate(t.settlementDate)} raw="{{settlement_date}}" merged={m} /></p>
      <p className="text-slate-500">The Seller agrees to sell and the Purchaser agrees to buy the Property for the Purchase Price. [Placeholder clauses for demonstration only — the real template is supplied and approved by the client’s solicitor.]</p>
      <p className="mt-4 font-sans text-[12px] font-bold">5. Signatures</p>
      <div className="mt-3 grid grid-cols-2 gap-10 font-sans text-[11px]">
        <div><div className="h-10 border-b border-slate-500">{c.status === 'Approved' && <span className="font-serif text-lg text-slate-700 italic">D. Kalo</span>}</div><p className="mt-1 font-semibold">Seller</p><p className="text-slate-500">{c.approvedAt ? `Date ${date(c.approvedAt)}` : 'Date'}</p></div>
        <div><div className="h-10 border-b border-slate-500">{c.signature === 'Signed' && <span className="font-serif text-lg text-slate-700 italic">A. Morgan</span>}</div><p className="mt-1 font-semibold">Purchaser</p><p className="text-slate-500">{c.signedAt ? `Date ${date(c.signedAt)} (e-signature, simulated)` : 'Date'}</p></div>
      </div>
    </article>
  )
}
