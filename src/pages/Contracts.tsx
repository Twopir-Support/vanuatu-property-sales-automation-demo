import { Check, ChevronRight, CircleAlert, ExternalLink, FileText, FolderOpen, History, Lock, PenLine, RefreshCw, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog, Spinner } from '../components/ui/overlays'
import { Badge, Button, inputCls } from '../components/ui/primitives'
import { COMPANY, IDS, USERS } from '../data/ids'
import type { DemoState } from '../data/types'
import { cn, dateTime, longDate, relative, vt } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { approveContract, generateContract, regenerateContract, requestContractChanges, sendContractForReview, signContract, toggleStep } from '../store/engine'

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
    { label: 'Buyer information complete', ok: !!(t.buyerName && t.email && t.phone && t.buyerId), detail: `${t.buyerName} · ${t.buyerId}` },
    { label: 'Lot information complete', ok: !!(t.lotId && t.project), detail: `${t.lotId} · ${t.project}` },
    { label: 'Price complete', ok: t.salePrice > 0, detail: vt(t.salePrice) },
    { label: 'Settlement date complete', ok: !!t.settlementDate, detail: t.settlementDate ? longDate(t.settlementDate) : 'Missing' },
    { label: 'Required documents complete', ok: docs.every((d) => d.status === 'Received'), detail: `${docs.filter((d) => d.status === 'Received').length} of ${docs.length} received` },
  ]
}

export default function Contracts() {
  const { state, run, runDelayed, busy } = useDemo()
  const c = state.contract
  const t = state.transaction
  const life = lifecycleIndex(state)
  const checks = validations(state)
  const allOk = checks.every((x) => x.ok)
  const priorSteps = state.steps.filter((s) => s.id < 6).every((s) => s.status === 'complete')
  const step6 = state.steps.find((s) => s.id === 6)!
  const step7 = state.steps.find((s) => s.id === 7)!
  const [comment, setComment] = useState('')
  const [confirm, setConfirm] = useState<null | 'approve' | 'sign'>(null)

  const generate = () => runDelayed('gen', (s) => (step6.status === 'pending' ? toggleStep(s, 6, USERS.sales) : generateContract(s, 'Contracts — Generate Draft')), 1000)
  const approve = () => runDelayed('approve', (s) => (step7.status === 'pending' ? toggleStep(s, 7, USERS.director) : approveContract(s, USERS.director, 'Contracts — Approve')), 900)

  const mapping: [string, string, string][] = [
    ['Buyer Name', 'Process Street · buyer_name', t.buyerName],
    ['Buyer Email', 'Process Street · email', t.email],
    ['Buyer ID', 'HubSpot · contact.buyer_id', t.buyerId],
    ['Lot ID', 'Process Street · lot_id', t.lotId],
    ['Project', 'Process Street · project', t.project],
    ['Sale Price', 'HubSpot · deal.amount', vt(t.salePrice)],
    ['Currency', 'HubSpot · deal_currency_code', t.currency],
    ['Settlement Date', 'Process Street · settlement_date', longDate(t.settlementDate)],
    ['Sales Representative', 'HubSpot · deal owner', t.salesRep],
  ]
  const versions = state.drive.files.filter((f) => f.parentId === 'gd-025-ctr').sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))

  return (
    <div className="flex min-h-full flex-col bg-[#f4f5f7]">
      {/* Toolbar */}
      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="mb-1 flex items-center gap-1 text-xs text-slate-500">
          <span>Documents</span><ChevronRight size={12} /><span>Sale contracts</span><ChevronRight size={12} /><span className="font-mono">{IDS.contract}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Generate Sale Contract</h1>
            <p className="text-[13px] text-slate-600">
              Transaction <b>LOT-025 — {t.buyerName}</b> <span className="font-mono text-xs text-slate-500">({IDS.transaction})</span> · Template <b>{c.template}</b>
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button onClick={generate} disabled={c.status !== 'Not generated' || !allOk || !priorSteps || !!busy}>
              {busy === 'gen' ? <Spinner size={13} /> : !priorSteps ? <Lock size={14} /> : <FileText size={14} />} Generate Draft
            </Button>
            <Button onClick={() => run((s) => regenerateContract(s, USERS.sales))} disabled={c.status !== 'Generated' || !!busy}><RefreshCw size={14} /> Regenerate</Button>
            <Button variant="primary" onClick={() => run((s) => sendContractForReview(s, USERS.sales))} disabled={c.status !== 'Generated' || !!c.reviewRequestedAt}><Send size={14} /> Send for Review</Button>
          </div>
        </div>
        {/* Lifecycle */}
        <ol className="mt-3 flex flex-wrap items-center gap-1 text-[11px] font-semibold tracking-wide">
          {LIFECYCLE.map((stage, i) => (
            <li key={stage} className="flex items-center gap-1">
              <span className={cn('inline-flex items-center gap-1 rounded px-2 py-1', i < life ? 'bg-emerald-50 text-emerald-700' : i === life ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-400')}>
                {i < life && <Check size={11} strokeWidth={3} />}{stage}
              </span>
              {i < LIFECYCLE.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
            </li>
          ))}
          {life === -1 && <li className="ml-2 font-normal tracking-normal text-slate-500 normal-case">Not generated yet — runs as Zap 2A when workflow step 6 is completed.</li>}
        </ol>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* Merge fields */}
        <section className="h-fit overflow-hidden rounded-md border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <h2 className="text-[13px] font-semibold">Merge fields</h2>
            <span className="text-[11px] text-slate-500">{mapping.length} mapped</span>
          </header>
          <ul className="divide-y divide-slate-100">
            {mapping.map(([f, src, v]) => (
              <li key={f} className="px-4 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-violet-700">{'{{'}{f.toLowerCase().replace(/ /g, '_')}{'}}'}</span>
                  <Check size={12} className="text-emerald-600" />
                </div>
                <p className="text-[13px] font-medium text-slate-800">{v}</p>
                <p className="text-[11px] text-slate-500">{f} ← {src}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Preview */}
        <section className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white">
          <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
            <FileText size={16} className="text-rose-600" />
            <p className="text-[13px] font-semibold">{c.signedFileId ? 'Sale Contract — Signed.pdf' : c.approvedFileId ? 'Sale Contract — Approved.pdf' : c.driveFileId ? `Sale Contract — Draft${c.version > 1 ? ` v${c.version}` : ''}.pdf` : 'Template preview (unmerged)'}</p>
            <Badge tone={life >= 4 ? 'green' : life >= 0 ? 'blue' : 'slate'}>{life >= 0 ? (LIFECYCLE as readonly string[])[life] : 'NOT GENERATED'}</Badge>
            {c.driveFileId && (
              <Link to={`/documents/gd-025-ctr?file=${c.signedFileId ?? c.approvedFileId ?? c.driveFileId}`} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"><FolderOpen size={13} /> Open in Google Drive <ExternalLink size={10} /></Link>
            )}
          </header>
          <div className="scroll-thin max-h-[calc(100vh-260px)] overflow-y-auto bg-[#e9ebee] px-4 py-6">
            <ContractDocument state={state} />
          </div>
        </section>

        {/* Validation + approval */}
        <aside className="h-fit space-y-4">
          <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <h2 className="text-[13px] font-semibold">Validation</h2>
              <Badge tone={allOk ? 'green' : 'amber'}>{allOk ? 'Ready' : 'Incomplete'}</Badge>
            </header>
            <ul className="divide-y divide-slate-100">
              {checks.map((v) => (
                <li key={v.label} className="flex items-start gap-2.5 px-4 py-2">
                  {v.ok ? <Check size={15} className="mt-0.5 text-emerald-600" strokeWidth={3} /> : <CircleAlert size={15} className="mt-0.5 text-amber-600" />}
                  <div><p className="text-[13px] text-slate-800">{v.label}</p><p className="text-[11px] text-slate-500">{v.detail}</p></div>
                </li>
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <header className="border-b border-slate-200 px-4 py-2.5"><h2 className="text-[13px] font-semibold">Review &amp; signature</h2></header>
            <div className="space-y-3 px-4 py-3 text-[13px]">
              <Row label="Internal reviewer" value={USERS.director} />
              <Row label="Review" value={c.status === 'Approved' ? `Approved ${c.approvedAt ? relative(c.approvedAt) : ''}` : c.reviewRequestedAt ? `Requested ${relative(c.reviewRequestedAt)}` : c.status === 'Generated' ? 'Not sent' : '—'} />
              <Row label="Signer" value={`${t.buyerName} · ${t.email}`} />
              <Row label="Signature" value={c.signature === 'Signed' ? `Signed ${c.signedAt ? relative(c.signedAt) : ''}` : c.signature === 'Out for signature' ? 'Awaiting signature' : 'Not sent'} />
              {c.status === 'Generated' && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <textarea rows={2} className={inputCls} placeholder="Reviewer comment (required to request changes)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" onClick={() => setConfirm('approve')} disabled={!!busy}>{busy === 'approve' ? <Spinner size={12} /> : <ThumbsUp size={13} />} Approve</Button>
                    <Button size="sm" disabled={!comment.trim()} onClick={() => { run((s) => requestContractChanges(s, USERS.director, comment.trim())); setComment('') }}><ThumbsDown size={13} /> Request changes</Button>
                  </div>
                </div>
              )}
              {c.signature === 'Out for signature' && (
                <Button size="sm" variant="primary" onClick={() => setConfirm('sign')} disabled={!!busy}>{busy === 'sign' ? <Spinner size={12} /> : <PenLine size={13} />} Simulate buyer signature</Button>
              )}
              {c.signature === 'Signed' && <p className="rounded bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800">Signed PDF filed · HubSpot deal Closed Won{state.xero.invoice ? ` · Xero draft ${state.xero.invoice.number}` : ''}</p>}
            </div>
            {c.comments.length > 0 && (
              <ul className="space-y-1.5 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
                {c.comments.map((cm, i) => <li key={i}><b>{cm.user}</b> · {relative(cm.at)} — {cm.text}</li>)}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <header className="flex items-center gap-1.5 border-b border-slate-200 px-4 py-2.5"><History size={14} /><h2 className="text-[13px] font-semibold">Versions in Drive</h2></header>
            {versions.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-500">No files yet. Zap 2A creates the transaction folder and saves the draft here.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {versions.map((f) => (
                  <li key={f.id}>
                    <Link to={`/documents/gd-025-ctr?file=${f.id}`} className="flex items-center gap-2 px-4 py-2 text-[13px] hover:bg-slate-50">
                      <FileText size={14} className="text-rose-600" /><span className="flex-1 truncate">{f.name}</span><span className="text-[11px] text-slate-500">{relative(f.modifiedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm === 'approve'}
        title="Approve and send for signature?"
        confirmLabel="Approve"
        onCancel={() => setConfirm(null)}
        onConfirm={() => { setConfirm(null); approve() }}
      >
        Zap 2B saves <b>Sale Contract — Approved.pdf</b> to Drive, sends it to {t.email} for e-signature and moves the HubSpot deal to <b>Out for Signature</b>. Xero is not touched.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'sign'}
        title="Simulate the buyer signing?"
        confirmLabel="Simulate signature"
        onCancel={() => setConfirm(null)}
        onConfirm={() => { setConfirm(null); runDelayed('sign', (s) => signContract(s), 900) }}
      >
        In production this event comes from the e-signature tool. Zap 2C files <b>Sale Contract — Signed.pdf</b> and marks the deal <b>Closed Won</b>, which triggers Zap 3’s Xero checks.
      </ConfirmDialog>
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex justify-between gap-3"><span className="text-slate-500">{label}</span><span className="text-right font-medium text-slate-800">{value}</span></div>
}

function Field({ v, raw, merged }: { v: string; raw: string; merged: boolean }) {
  return merged ? <span>{v}</span> : <span className="rounded-sm bg-violet-50 px-0.5 font-mono text-[12px] text-violet-700">{raw}</span>
}

function ContractDocument({ state }: { state: DemoState }) {
  const c = state.contract
  const t = state.transaction
  const m = c.version > 0
  return (
    <article className="relative mx-auto max-w-[680px] bg-white px-14 py-12 font-serif text-[14px] leading-[1.7] text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,.15)]">
      {c.signature !== 'Signed' && m && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[96px] font-bold tracking-widest text-slate-900/[.04] select-none" style={{ transform: 'rotate(-30deg)' }}>{c.status === 'Approved' ? 'APPROVED' : 'DRAFT'}</span>}
      <p className="mb-6 border border-amber-300 bg-amber-50 py-1 text-center font-sans text-[10px] font-bold tracking-[.18em] text-amber-900">SAMPLE DOCUMENT — NOT A LEGAL AGREEMENT</p>
      <header className="mb-6 text-center">
        <p className="font-sans text-[10px] tracking-[.2em] text-slate-500 uppercase">{COMPANY.name}</p>
        <h2 className="mt-1 text-[19px] font-bold tracking-wide">RESIDENTIAL LOT SALE AGREEMENT</h2>
        <p className="font-sans text-[11px] text-slate-500">{IDS.contract} · Version {m ? c.version : '—'} · {c.template}</p>
      </header>
      <table className="mb-6 w-full border-collapse font-sans text-[13px]">
        <tbody>
          {[
            ['Seller', COMPANY.name, COMPANY.name],
            ['Purchaser', t.buyerName, '{{buyer_name}}'],
            ['Purchaser ID', t.buyerId, '{{buyer_id}}'],
            ['Property', t.project, '{{project}}'],
            ['Lot', t.lotId, '{{lot_id}}'],
            ['Purchase Price', `${vt(t.salePrice)} (${t.currency})`, '{{sale_price}}'],
            ['Settlement Date', longDate(t.settlementDate), '{{settlement_date}}'],
          ].map(([k, v, raw]) => (
            <tr key={k} className="border-b border-slate-200">
              <th className="w-40 py-1.5 pr-4 text-left align-top font-semibold text-slate-600">{k}</th>
              <td className="py-1.5"><Field v={v} raw={raw} merged={m || k === 'Seller'} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="space-y-3">
        <p><b>1. Sale.</b> The Seller agrees to sell and the Purchaser agrees to buy the Lot described above for the Purchase Price.</p>
        <p><b>2. Deposit.</b> A deposit of {m ? vt(t.salePrice * 0.1) : <Field v="" raw="{{deposit}}" merged={false} />} is payable after this agreement is signed.</p>
        <p><b>3. Settlement.</b> The balance is payable on the Settlement Date, when possession passes to the Purchaser.</p>
        <p><b>4. Further terms.</b> <span className="text-slate-500">[Placeholder clauses for demonstration only. The real template is supplied and approved by the client’s solicitor.]</span></p>
      </section>
      <section className="mt-10 grid grid-cols-2 gap-10 font-sans text-[12px]">
        <div>
          <div className="h-12 border-b border-slate-500">{c.status === 'Approved' && <span className="font-serif text-lg italic text-slate-700">D. Kalo</span>}</div>
          <p className="mt-1 font-semibold">For the Seller</p>
          <p className="text-slate-500">{c.approver ? `${c.approver}, Director · ${c.approvedAt ? longDate(c.approvedAt) : ''}` : 'Name / date'}</p>
        </div>
        <div>
          <div className="h-12 border-b border-slate-500">{c.signature === 'Signed' && <span className="font-serif text-lg italic text-slate-700">A. Morgan</span>}</div>
          <p className="mt-1 font-semibold">Purchaser</p>
          <p className="text-slate-500">{c.signature === 'Signed' ? `${t.buyerName} · ${c.signedAt ? dateTime(c.signedAt) : ''} (e-signature, simulated)` : 'Name / date'}</p>
        </div>
      </section>
      {!m && <p className="mt-8 flex items-center gap-1.5 font-sans text-xs text-slate-500"><X size={12} /> Unmerged template — fields in purple are filled when the draft is generated.</p>}
    </article>
  )
}
