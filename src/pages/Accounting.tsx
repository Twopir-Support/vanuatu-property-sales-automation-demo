import { Bell, Check, ChevronDown, ChevronRight, HelpCircle, Lock, Plus, Printer, Search, Trash2, Zap } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ProductFrame } from '../components/ui/ProductFrame'
import { IDS, USERS } from '../data/ids'
import type { InvoiceLine, InvoiceStatus, XeroInvoice } from '../data/types'
import { cn, date, dateTime, num, uid } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { setInvoiceStatus, updateInvoiceLines } from '../store/engine'

const VAT = 0.15

export function invoiceTotals(lines: InvoiceLine[]) {
  const subtotal = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0)
  const tax = lines.reduce((a, l) => a + (l.taxRate === 'VAT 15%' ? l.qty * l.unitPrice * VAT : 0), 0)
  return { subtotal, tax, total: subtotal + tax }
}

const statusCls: Record<InvoiceStatus, string> = {
  Draft: 'bg-[#e6e9ec] text-[#404b57]',
  'Awaiting Approval': 'bg-[#fff2d5] text-[#7a4d00]',
  'Awaiting Payment': 'bg-[#dcebfb] text-[#0b4f8a]',
  Paid: 'bg-[#dcf5e3] text-[#0b6b2f]',
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  return <span className={cn('inline-block rounded px-2 py-0.5 text-xs font-semibold', statusCls[status])}>{status}</span>
}

function XeroChrome({ crumbs, title, actions, children }: { crumbs: { label: string; to?: string }[]; title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const menu = ['Home', 'Sales', 'Purchases', 'Reporting', 'Payroll', 'Accounting', 'Tax', 'Contacts']
  return (
    <ProductFrame product="Xero">
      <div className="flex min-h-0 flex-1 flex-col bg-xr-bg text-[#000a1e]" style={{ fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif" }}>
        <div className="flex h-12 shrink-0 items-center gap-1 bg-xr-nav px-3 text-sm text-white">
          <span className="mr-2 flex items-center gap-2 rounded px-2 py-1 font-semibold hover:bg-white/10">
            <span className="flex size-7 items-center justify-center rounded bg-white text-[11px] font-bold text-xr-nav">PH</span>
            <span className="hidden md:inline">Pacific Horizon Developments (Demo)</span>
            <ChevronDown size={14} />
          </span>
          <nav className="hidden items-center lg:flex">
            {menu.map((m) => (
              <span key={m} className={cn('rounded px-3 py-1.5', m === 'Sales' ? 'bg-xr-navdark font-semibold' : 'hover:bg-white/10')}>{m}</span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-white/85">
            <Plus size={18} />
            <Search size={18} />
            <HelpCircle size={18} />
            <Bell size={18} />
            <span className="flex size-7 items-center justify-center rounded-full bg-[#00b0a3] text-[11px] font-semibold">MT</span>
          </div>
        </div>
        <div className="shrink-0 border-b border-[#d6dade] bg-white px-6 pt-3 pb-3">
          <div className="mb-1 flex items-center gap-1 text-xs text-xr-blue">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-1">
                {c.to ? <Link to={c.to} className="hover:underline">{c.label}</Link> : <span className="text-slate-600">{c.label}</span>}
                {i < crumbs.length - 1 && <ChevronRight size={12} className="text-slate-400" />}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
          </div>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </ProductFrame>
  )
}

const xBtn = 'inline-flex h-9 items-center gap-1.5 rounded border px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const xPrimary = `${xBtn} border-xr-green bg-xr-green text-white hover:brightness-110`
const xSecondary = `${xBtn} border-[#a6aeb7] bg-white text-[#000a1e] hover:bg-[#f2f4f6]`

/* ------------------------------------------------------------------ */

export function InvoicesList() {
  const { state } = useDemo()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as InvoiceStatus | 'All' | null) ?? 'All'
  const inv = state.xero.invoice
  const all = [
    ...(inv ? [{ number: inv.number, reference: inv.reference, to: inv.contactName, date: inv.date, dueDate: inv.dueDate, total: invoiceTotals(inv.lines).total, status: inv.status, live: true }] : []),
    ...state.xero.otherInvoices.map((o) => ({ ...o, live: false })),
  ]
  const rows = tab === 'All' ? all : all.filter((r) => r.status === tab)
  const count = (s: InvoiceStatus) => all.filter((r) => r.status === s).length
  const tabs: (InvoiceStatus | 'All')[] = ['All', 'Draft', 'Awaiting Approval', 'Awaiting Payment', 'Paid']

  return (
    <XeroChrome
      crumbs={[{ label: 'Sales overview' }, { label: 'Invoices' }]}
      title="Invoices"
      actions={
        <>
          <button className={xSecondary}>Import</button>
          <button className={xPrimary} disabled={!inv} onClick={() => navigate('/accounting/invoice')} title={inv ? '' : 'Demo invoices are created by the integration'}>
            New invoice <ChevronDown size={14} />
          </button>
        </>
      }
    >
      <div className="space-y-4 p-6">
        {!inv && (
          <div className="flex items-start gap-3 rounded border border-[#c8d7e6] bg-[#eef5fc] p-4 text-sm">
            <Lock size={18} className="mt-0.5 text-xr-blue" />
            <div className="flex-1">
              <p className="font-semibold">Waiting for the correct sales milestone</p>
              <p className="text-slate-700">
                The deposit invoice for {IDS.lot} ({IDS.xeroInvoice}) is drafted automatically only after contract {IDS.contract} is approved (Process Street step 7). Accounting is never touched by early-stage pipeline changes.
              </p>
            </div>
            <Link to="/workflow?step=7" className={xSecondary}>Go to approval step</Link>
          </div>
        )}
        <div className="overflow-hidden rounded border border-[#d6dade] bg-white">
          <div className="flex flex-wrap border-b border-[#d6dade] px-2">
            {tabs.map((t) => (
              <button key={t} onClick={() => setParams(t === 'All' ? {} : { tab: t })} className={cn('border-b-[3px] px-3 py-3 text-sm', tab === t ? 'border-xr-blue font-semibold text-xr-blue' : 'border-transparent text-slate-700 hover:text-xr-blue')}>
                {t}
                {t !== 'All' && t !== 'Paid' && <span className="ml-1 text-slate-500">({count(t)})</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-b border-[#d6dade] px-4 py-2.5">
            <div className="flex h-8 w-64 items-center gap-2 rounded border border-[#a6aeb7] px-2 text-sm text-slate-500"><Search size={14} /> Search</div>
            <span className="ml-auto text-xs text-slate-500">{rows.length} items · amounts in VUV</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f6f7f8] text-left text-xs text-slate-600">
                <tr>
                  <th className="w-8 px-4 py-2.5"><input type="checkbox" disabled /></th>
                  {['Number', 'Ref', 'To', 'Date', 'Due date', 'Paid', 'Due', 'Status'].map((h) => (
                    <th key={h} className={cn('px-3 py-2.5 font-semibold whitespace-nowrap', ['Paid', 'Due'].includes(h) && 'text-right')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.number} onClick={() => r.live && navigate('/accounting/invoice')} className={cn('border-t border-[#e6e9ec]', r.live ? 'cursor-pointer bg-[#fffbe6] hover:bg-[#fff6cc]' : 'hover:bg-[#f6f7f8]')}>
                    <td className="px-4 py-2.5"><input type="checkbox" disabled /></td>
                    <td className="px-3 py-2.5 font-medium text-xr-blue">{r.number}</td>
                    <td className="px-3 py-2.5">{r.reference}</td>
                    <td className="px-3 py-2.5">{r.to}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{date(r.date)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{date(r.dueDate)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(r.status === 'Paid' ? r.total : 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(r.status === 'Paid' ? 0 : r.total)}</td>
                    <td className="px-3 py-2.5"><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </XeroChrome>
  )
}

/* ------------------------------------------------------------------ */

export function InvoiceEditor() {
  const { state, run } = useDemo()
  const inv = state.xero.invoice
  const [lines, setLines] = useState<InvoiceLine[]>(inv?.lines ?? [])
  useEffect(() => setLines(inv?.lines ?? []), [inv?.lines])

  if (!inv) {
    return (
      <XeroChrome crumbs={[{ label: 'Sales overview' }, { label: 'Invoices', to: '/accounting' }]} title={`Invoice ${IDS.xeroInvoice}`}>
        <div className="flex flex-col items-center px-6 py-20 text-center">
          <Lock size={40} className="text-slate-400" />
          <p className="mt-3 text-lg font-semibold">Not created yet</p>
          <p className="max-w-md text-sm text-slate-600">Xero is waiting for the “Contract approved” milestone. Approve the contract in the workflow to create this draft invoice automatically.</p>
          <Link to="/workflow?step=7" className={cn(xPrimary, 'mt-4')}>Open step 7 — Contract approved</Link>
        </div>
      </XeroChrome>
    )
  }

  const editable = inv.status === 'Draft'
  const dirty = JSON.stringify(lines) !== JSON.stringify(inv.lines)
  const totals = invoiceTotals(lines)
  const upd = (id: string, patch: Partial<InvoiceLine>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const cell = 'w-full rounded-sm border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none hover:border-[#a6aeb7] focus:border-xr-blue focus:bg-white disabled:hover:border-transparent'

  const actions =
    inv.status === 'Draft' ? (
      <>
        <button className={xSecondary} disabled={!dirty} onClick={() => run((s) => updateInvoiceLines(s, lines))}>Save draft</button>
        <button className={xSecondary} onClick={() => { if (dirty) run((s) => updateInvoiceLines(s, lines)); run((s) => setInvoiceStatus(s, 'Awaiting Approval')) }}>Submit for approval</button>
        <button className={xPrimary} onClick={() => { if (dirty) run((s) => updateInvoiceLines(s, lines)); run((s) => setInvoiceStatus(s, 'Awaiting Payment')) }}><Check size={15} /> Approve</button>
      </>
    ) : inv.status === 'Awaiting Approval' ? (
      <>
        <button className={xSecondary} onClick={() => run((s) => setInvoiceStatus(s, 'Draft'))}>Back to draft</button>
        <button className={xPrimary} onClick={() => run((s) => setInvoiceStatus(s, 'Awaiting Payment'))}><Check size={15} /> Approve</button>
      </>
    ) : inv.status === 'Awaiting Payment' ? (
      <>
        <button className={xSecondary}><Printer size={14} /> Print PDF</button>
        <button className={xPrimary} onClick={() => run((s) => setInvoiceStatus(s, 'Paid'))}>Record payment (demo)</button>
      </>
    ) : (
      <button className={xSecondary}><Printer size={14} /> Print PDF</button>
    )

  return (
    <XeroChrome
      crumbs={[{ label: 'Sales overview' }, { label: 'Invoices', to: '/accounting' }]}
      title={<span className="flex items-center gap-3">Invoice {inv.number} <StatusPill status={inv.status} /></span>}
      actions={<><span className="mr-2 inline-flex items-center gap-1 text-sm text-xr-blue">Invoice options <ChevronDown size={14} /></span>{actions}</>}
    >
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-2 rounded border border-[#d9ccf5] bg-[#f6f2ff] px-4 py-2 text-xs text-[#4b2a99]">
          <Zap size={14} /> Created automatically from HubSpot deal <Link className="font-semibold underline" to="/crm/deal">{IDS.hubspotDeal}</Link> when contract {IDS.contract} was approved · idempotency key <code>xero.invoice:{IDS.transaction}:deposit</code>
        </div>

        <StatusFlow status={inv.status} />

        <div className="rounded border border-[#d6dade] bg-white">
          <div className="grid gap-4 border-b border-[#e6e9ec] p-5 sm:grid-cols-2 lg:grid-cols-6">
            <XField label="To" className="lg:col-span-2"><div className="rounded border border-[#a6aeb7] px-2.5 py-1.5 text-sm"><span className="font-semibold">{inv.contactName}</span><span className="block text-xs text-slate-500">{state.transaction.email} · Account {state.transaction.buyerId}</span></div></XField>
            <XField label="Issue date"><Read v={date(inv.date)} /></XField>
            <XField label="Due date"><Read v={date(inv.dueDate)} /></XField>
            <XField label="Invoice number"><Read v={inv.number} /></XField>
            <XField label="Reference"><Read v={inv.reference} /></XField>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-xs text-slate-600">
            <span>Branding theme: <b>Standard</b> · Currency: <b>VUV Vanuatu Vatu</b></span>
            <span>Amounts are <b>Tax exclusive</b></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-y border-[#d6dade] bg-[#f6f7f8] text-left text-xs text-slate-600">
                <tr>
                  <th className="w-24 px-3 py-2 font-semibold">Item</th>
                  <th className="px-3 py-2 font-semibold">Description</th>
                  <th className="w-16 px-3 py-2 text-right font-semibold">Qty.</th>
                  <th className="w-32 px-3 py-2 text-right font-semibold">Price</th>
                  <th className="w-48 px-3 py-2 font-semibold">Account</th>
                  <th className="w-32 px-3 py-2 font-semibold">Tax rate</th>
                  <th className="w-28 px-3 py-2 text-right font-semibold">Tax amount</th>
                  <th className="w-32 px-3 py-2 text-right font-semibold">Amount VUV</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b border-[#e6e9ec] align-top">
                    <td className="px-2 py-1.5"><input className={cn(cell, 'font-mono text-xs')} value={l.item} disabled={!editable} onChange={(e) => upd(l.id, { item: e.target.value })} /></td>
                    <td className="px-2 py-1.5"><textarea rows={2} className={cn(cell, 'resize-none')} value={l.description} disabled={!editable} onChange={(e) => upd(l.id, { description: e.target.value })} /></td>
                    <td className="px-2 py-1.5"><input type="number" min={0} className={cn(cell, 'text-right')} value={l.qty} disabled={!editable} onChange={(e) => upd(l.id, { qty: Number(e.target.value) })} /></td>
                    <td className="px-2 py-1.5"><input type="number" min={0} className={cn(cell, 'text-right tabular-nums')} value={l.unitPrice} disabled={!editable} onChange={(e) => upd(l.id, { unitPrice: Number(e.target.value) })} /></td>
                    <td className="px-2 py-1.5">
                      <select className={cell} value={l.account} disabled={!editable} onChange={(e) => upd(l.id, { account: e.target.value })}>
                        <option>610 - Customer Deposits</option>
                        <option>200 - Sales</option>
                        <option>260 - Other Revenue</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <select className={cell} value={l.taxRate} disabled={!editable} onChange={(e) => upd(l.id, { taxRate: e.target.value as InvoiceLine['taxRate'] })}>
                        <option>Tax Exempt</option>
                        <option>VAT 15%</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(l.taxRate === 'VAT 15%' ? l.qty * l.unitPrice * VAT : 0)}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{num(l.qty * l.unitPrice)}</td>
                    <td className="py-2">{editable && <button onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} className="rounded p-1 text-slate-400 hover:text-rose-600" aria-label="Remove line"><Trash2 size={14} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-6 p-5">
            {editable ? (
              <button onClick={() => setLines((ls) => [...ls, { id: uid('l'), item: '', description: '', qty: 1, unitPrice: 0, account: '200 - Sales', taxRate: 'VAT 15%' }])} className={xSecondary}>
                <Plus size={14} /> Add a new line
              </button>
            ) : (
              <span className="text-xs text-slate-500">Line items are locked once an invoice is approved.</span>
            )}
            <dl className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{num(totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Total VAT 15%</dt><dd className="tabular-nums">{num(totals.tax)}</dd></div>
              <div className="flex justify-between border-t-2 border-[#000a1e] pt-2 text-lg font-bold"><dt>Total</dt><dd className="tabular-nums">{num(totals.total)}</dd></div>
              {inv.status === 'Paid' && <div className="flex justify-between text-sm text-xr-green"><dt>Less payment</dt><dd className="tabular-nums">-{num(totals.total)}</dd></div>}
              <div className="flex justify-between text-sm font-semibold"><dt>Amount due</dt><dd className="tabular-nums">{num(inv.status === 'Paid' ? 0 : totals.total)}</dd></div>
            </dl>
          </div>
          <p className="border-t border-[#e6e9ec] px-5 py-2.5 text-[11px] text-slate-500">Tax treatment shown is illustrative only (synthetic). Final VAT handling of deposits and fees to be confirmed with Pacific Horizon’s accountant.</p>
        </div>

        <div className="rounded border border-[#d6dade] bg-white">
          <p className="border-b border-[#e6e9ec] px-5 py-3 text-sm font-semibold">History and notes</p>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-600">
              <tr>{['Changes', 'Date', 'User', 'Details'].map((h) => <th key={h} className="px-5 py-2 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {inv.history.map((h, i) => (
                <tr key={i} className="border-t border-[#e6e9ec]">
                  <td className="px-5 py-2 font-medium">{h.action}</td>
                  <td className="px-5 py-2 whitespace-nowrap">{dateTime(h.at)}</td>
                  <td className="px-5 py-2">{h.user === USERS.integration ? 'Integration (simulated)' : h.user}</td>
                  <td className="px-5 py-2 text-slate-600">{h.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </XeroChrome>
  )
}

function StatusFlow({ status }: { status: XeroInvoice['status'] }) {
  const steps: InvoiceStatus[] = ['Draft', 'Awaiting Approval', 'Awaiting Payment', 'Paid']
  const idx = steps.indexOf(status)
  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {steps.map((s, i) => (
        <li key={s} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1', i < idx ? 'border-xr-green bg-[#dcf5e3] text-[#0b6b2f]' : i === idx ? 'border-xr-blue bg-[#dcebfb] font-semibold text-[#0b4f8a]' : 'border-[#d6dade] bg-white text-slate-500')}>
          {i < idx && <Check size={12} />} {s}
        </li>
      ))}
    </ol>
  )
}

function XField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-1 text-xs font-semibold text-slate-600">{label}</p>
      {children}
    </div>
  )
}

function Read({ v }: { v: string }) {
  return <div className="rounded border border-[#a6aeb7] bg-[#f6f7f8] px-2.5 py-1.5 text-sm">{v}</div>
}
