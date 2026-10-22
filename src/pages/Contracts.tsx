import { CheckCircle2, ExternalLink, FileSignature, FileText, Lock, MessageSquare, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, SectionTitle, inputCls, type Tone } from '../components/ui/primitives'
import { COMPANY, IDS, USERS } from '../data/ids'
import type { Contract } from '../data/types'
import { cn, dateTime, longDate, relative, vt } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { approveContract, generateContract, requestContractChanges, toggleStep } from '../store/engine'

const tone: Record<Contract['status'], Tone> = { 'Not generated': 'slate', Generated: 'amber', Approved: 'green' }

export default function Contracts() {
  const { state, run } = useDemo()
  const c = state.contract
  const t = state.transaction
  const [comment, setComment] = useState('')
  const step6 = state.steps.find((s) => s.id === 6)!
  const step7 = state.steps.find((s) => s.id === 7)!
  const ready = state.steps.filter((s) => s.id < 6).every((s) => s.status === 'complete')

  const generate = () => run((s) => (step6.status === 'pending' ? toggleStep(s, 6, USERS.sales) : generateContract(s, 'Contracts page — Generate')))
  const approve = () => run((s) => (step7.status === 'pending' ? toggleStep(s, 7, USERS.director) : approveContract(s, USERS.director, 'Contracts page — Approve')))

  const register = [
    { id: IDS.contract, lot: IDS.lot, buyer: t.buyerName, value: t.salePrice, status: c.status, updated: c.approvedAt ?? c.generatedAt, live: true },
    { id: 'CTR-LOT-024', lot: 'LOT-024', buyer: 'Priya Nair', value: 11_900_000, status: 'Generated' as const, updated: undefined, live: false },
    { id: 'CTR-LOT-023', lot: 'LOT-023', buyer: 'Jordan Lee', value: 13_200_000, status: 'Approved' as const, updated: undefined, live: false },
  ]

  const merge = [
    ['{{buyer_name}}', t.buyerName, 'Process Street · Buyer name'],
    ['{{buyer_email}}', t.email, 'Process Street · Email'],
    ['{{buyer_id}}', t.buyerId, 'HubSpot · Buyer ID'],
    ['{{lot_id}}', t.lotId, 'Process Street · Lot ID'],
    ['{{project}}', t.project, 'Process Street · Project'],
    ['{{sale_price}}', vt(t.salePrice), 'Process Street · Sale price'],
    ['{{deposit}}', vt(t.salePrice * 0.1), 'Calculated · 10% of price'],
    ['{{settlement_date}}', longDate(t.settlementDate), 'Process Street · Settlement date'],
  ]

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <SectionTitle
        title="Contracts"
        subtitle="Generated from a Google Docs template, filed to Google Drive, approved inside the Process Street run"
        actions={
          <>
            <Button onClick={generate} disabled={!ready && c.status === 'Not generated'}>
              {ready || c.status !== 'Not generated' ? <FileSignature size={15} /> : <Lock size={15} />} {c.status === 'Not generated' ? 'Generate contract' : 'Re-run generation'}
            </Button>
            <Button variant="primary" onClick={approve} disabled={c.status === 'Not generated'}>
              <ThumbsUp size={15} /> {c.status === 'Approved' ? 'Re-send approval' : 'Approve contract'}
            </Button>
          </>
        }
      />

      <Card className="mb-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>{['Contract', 'Lot', 'Purchaser', 'Value', 'Status', 'Last change'].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {register.map((r) => (
              <tr key={r.id} className={cn('border-t border-slate-100', r.live && 'bg-brand-50/60')}>
                <td className="px-4 py-2 font-mono font-medium">{r.id}</td>
                <td className="px-4 py-2 font-mono">{r.lot}</td>
                <td className="px-4 py-2">{r.buyer}</td>
                <td className="px-4 py-2 tabular-nums">{vt(r.value)}</td>
                <td className="px-4 py-2"><Badge tone={tone[r.status]} dot>{r.status === 'Generated' ? 'Awaiting approval' : r.status}</Badge></td>
                <td className="px-4 py-2 text-slate-500">{r.updated ? relative(r.updated) : r.live ? '—' : 'synthetic'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3">
            <FileText size={18} className="text-[#4285f4]" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{c.status === 'Not generated' ? 'Template preview' : `${t.lotId}_SaleAgreement_v${c.version}_${t.buyerName.replace(/\s+/g, '')}`}</p>
              <p className="text-xs text-slate-500">{c.template}</p>
            </div>
            <Badge tone={tone[c.status]} dot>{c.status}</Badge>
            {c.driveFileId && (
              <Link to={`/documents/gd-025-ctr?file=${c.driveFileId}`} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">Open in Drive <ExternalLink size={11} /></Link>
            )}
          </div>
          <div className="bg-slate-100 p-6">
            <div className="mx-auto max-w-2xl bg-white px-12 py-10 font-serif text-[15px] leading-relaxed shadow">
              <p className="mb-5 rounded bg-amber-100 px-2 py-1 text-center font-sans text-[11px] font-semibold tracking-wider text-amber-900">SYNTHETIC DEMO DOCUMENT — NOT LEGAL ADVICE</p>
              <h2 className="text-center text-lg font-bold">RESIDENTIAL LOT SALE AGREEMENT</h2>
              <p className="mb-5 text-center font-sans text-xs text-slate-500">{IDS.contract} · {c.version ? `Version ${c.version}` : 'Draft template'}</p>
              <div className="space-y-2.5">
                <p><b>Vendor:</b> {COMPANY.name}, {COMPANY.location}</p>
                <p><b>Purchaser:</b> <Merge v={t.buyerName} on={c.version > 0} raw="{{buyer_name}}" /> (<Merge v={t.email} on={c.version > 0} raw="{{buyer_email}}" />)</p>
                <p><b>Property:</b> <Merge v={t.project} on={c.version > 0} raw="{{project}}" />, Lot <Merge v={t.lotId} on={c.version > 0} raw="{{lot_id}}" /></p>
                <p><b>Purchase price:</b> <Merge v={vt(t.salePrice)} on={c.version > 0} raw="{{sale_price}}" /></p>
                <p><b>Deposit:</b> <Merge v={vt(t.salePrice * 0.1)} on={c.version > 0} raw="{{deposit}}" /> within 7 days of approval</p>
                <p><b>Settlement date:</b> <Merge v={longDate(t.settlementDate)} on={c.version > 0} raw="{{settlement_date}}" /></p>
                <p className="pt-2 text-sm text-slate-600">1. Sale and purchase. 2. Deposit. 3. Settlement. 4. Title and lodgement. 5. Default. — Placeholder clauses for demonstration only.</p>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-8 font-sans text-xs">
                <div className="border-t border-slate-400 pt-1">{c.status === 'Approved' ? <span className="text-emerald-700">✓ Approved by {c.approver} · {c.approvedAt && dateTime(c.approvedAt)}</span> : 'Vendor approval pending'}</div>
                <div className="border-t border-slate-400 pt-1">Purchaser signature</div>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Approval</h3>
            <ol className="space-y-3 text-sm">
              <ApprovalStep done={c.status !== 'Not generated'} label="Generated from template" sub={c.generatedAt ? `${dateTime(c.generatedAt)} · Integration` : 'Waits for workflow step 6'} />
              <ApprovalStep done={c.status !== 'Not generated'} label="Filed to Google Drive" sub="LOT-025 — Alex Morgan › 04 Contracts" />
              <ApprovalStep done={c.status === 'Approved'} label={`Director approval — ${USERS.director}`} sub={c.approvedAt ? dateTime(c.approvedAt) : 'Workflow step 7 (approval task)'} />
              <ApprovalStep done={!!state.xero.invoice} label="Milestone released to Xero" sub={state.xero.invoice ? `${state.xero.invoice.number} · ${state.xero.invoice.status}` : 'Deposit invoice drafted after approval'} />
            </ol>
            {c.status === 'Generated' && (
              <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
                <textarea rows={2} className={inputCls} placeholder="Comment for the sales rep (required to request changes)" value={comment} onChange={(e) => setComment(e.target.value)} />
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={approve}><ThumbsUp size={13} /> Approve</Button>
                  <Button size="sm" disabled={!comment.trim()} onClick={() => { run((s) => requestContractChanges(s, USERS.director, comment.trim())); setComment('') }}>Request changes</Button>
                </div>
              </div>
            )}
            {c.comments.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs">
                {c.comments.map((cm, i) => <li key={i} className="flex gap-2"><MessageSquare size={13} className="mt-0.5 text-slate-400" /><span><b>{cm.user}</b> · {relative(cm.at)} — {cm.text}</span></li>)}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <h3 className="border-b border-slate-200 px-5 py-3 font-semibold">Merge field mapping</h3>
            <table className="w-full text-xs">
              <tbody>
                {merge.map(([k, v, src]) => (
                  <tr key={k} className="border-t border-slate-100 first:border-0">
                    <td className="px-4 py-2 font-mono text-violet-700">{k}</td>
                    <td className="px-2 py-2">{v}<span className="block text-[10px] text-slate-400">{src}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Merge({ v, raw, on }: { v: string; raw: string; on: boolean }) {
  return on ? <span className="rounded bg-emerald-50 px-0.5">{v}</span> : <span className="rounded bg-violet-50 px-0.5 font-mono text-[13px] text-violet-700">{raw}</span>
}

function ApprovalStep({ done, label, sub }: { done: boolean; label: string; sub: string }) {
  return (
    <li className="flex gap-3">
      <CheckCircle2 size={18} className={done ? 'text-emerald-500' : 'text-slate-300'} />
      <div>
        <p className={cn('font-medium', !done && 'text-slate-500')}>{label}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </li>
  )
}
