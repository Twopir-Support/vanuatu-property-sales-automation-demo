import { Bell, Check, ChevronDown, ChevronRight, CircleX, HelpCircle, Lock, Plus, Printer, Search, Trash2, Zap } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ProductFrame } from '../components/ui/ProductFrame'
import { IDS, USERS } from '../data/ids'
import type { InvoiceLine, InvoiceStatus, XeroInvoice } from '../data/types'
import { cn, date, dateTime, num, time, uid } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { createXeroInvoice, invoiceRules, setInvoiceStatus, updateInvoiceLines } from '../store/engine'
import { Spinner } from '../components/ui/overlays'

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

export function StatusPill({ status }: { status: InvoiceStatus }) {
  return <span className={cn('inline-block rounded px-2 py-0.5 text-xs font-semibold', statusCls[status])}>{status}</span>
}

const XERO_SIDE: [string, [string, string?][]][] = [
  ['Sales', [['Invoices', '/accounting'], ['Quotes'], ['Credit notes'], ['Customers', '/accounting?view=contacts'], ['Products and services']]],
  ['Purchases', [['Bills to pay', '/bills?view=xero'], ['Suppliers']]],
  ['Reports', [['Reports', '/accounting?view=reports']]],
]

export function XeroChrome({ crumbs, title, actions, children, active = 'Sales', subActive }: { crumbs: { label: string; to?: string }[]; title: ReactNode; actions?: ReactNode; children: ReactNode; active?: string; subActive?: string }) {
  const menu: [string, string][] = [['Home', '/accounting'], ['Sales', '/accounting'], ['Purchases', '/bills?view=xero'], ['Reporting', '/accounting?view=reports'], ['Accounting', '/accounting'], ['Contacts', '/accounting?view=contacts']]
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
            {menu.map(([m, to]) => (
              <Link key={m} to={to} className={cn('rounded px-3 py-1.5', m === active ? 'bg-xr-navdark font-semibold' : 'hover:bg-white/10')}>{m}</Link>
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
        <div className="flex min-h-0 flex-1">
        <nav className="scroll-thin hidden w-48 shrink-0 overflow-y-auto border-r border-[#d6dade] bg-white py-3 text-[13px] lg:block" aria-label="Accounting">
          {XERO_SIDE.map(([group, items]) => (
            <div key={group} className="mb-3">
              <p className="px-4 pb-1 font-semibold text-[#000a1e]">{group}</p>
              {items.map(([label, to]) => {
                const on = label === (subActive ?? 'Invoices')
                return to
                  ? <Link key={label} to={to} className={cn('block border-l-[3px] px-4 py-1.5', on ? 'border-xr-blue bg-[#eef5fc] font-semibold text-xr-blue' : 'border-transparent text-slate-700 hover:bg-slate-50')}>{label}</Link>
                  : <span key={label} className="block border-l-[3px] border-transparent px-4 py-1.5 text-slate-500">{label}</span>
              })}
            </div>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-end border-b border-[#d6dade] bg-[#fffbeb] px-4 py-1"><span className="text-[10px] font-bold tracking-wider text-amber-900">SIMULATED XERO TRANSACTION — NOT POSTED TO XERO</span></div>
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
        </div>
      </div>
    </ProductFrame>
  )
}

export const xBtn = 'inline-flex h-9 items-center gap-1.5 rounded border px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
export const xPrimary = `${xBtn} border-xr-green bg-xr-green text-white hover:brightness-110`
export const xSecondary = `${xBtn} border-[#a6aeb7] bg-white text-[#000a1e] hover:bg-[#f2f4f6]`

/* ------------------------------------------------------------------ */

export function InvoicesList() {
  const [params] = useSearchParams()
  const view = params.get('view')
  if (view === 'contacts') return <XeroContacts />
  if (view === 'reports') return <XeroReports />
  return <InvoiceTable />
}

function InvoiceTable() {
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
        <Zap3Panel />
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
            <span className="ml-auto text-xs text-slate-500">{rows.length} items · amounts in VUV (Vanuatu vatu)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f6f7f8] text-left text-xs text-slate-600">
                <tr>
                  <th className="w-8 px-4 py-2.5"><input type="checkbox" disabled /></th>
                  {['Invoice', 'Contact', 'Reference', 'Date', 'Due', 'Amount', 'Status'].map((h) => (
                    <th key={h} className={cn('px-3 py-2.5 font-semibold whitespace-nowrap', h === 'Amount' && 'text-right')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.number} onClick={() => r.live && navigate('/accounting/invoice')} className={cn('border-t border-[#e6e9ec]', r.live ? 'cursor-pointer bg-[#fffbe6] hover:bg-[#fff6cc]' : 'hover:bg-[#f6f7f8]')}>
                    <td className="px-4 py-2.5"><input type="checkbox" disabled /></td>
                    <td className="px-3 py-2.5 font-medium text-xr-blue">{r.number}</td>
                    <td className="px-3 py-2.5">{r.to}</td>
                    <td className="px-3 py-2.5">{r.reference}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{date(r.date)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{date(r.dueDate)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(r.total)}</td>
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
  const [confirmApprove, setConfirmApprove] = useState(false)
  useEffect(() => setLines(inv?.lines ?? []), [inv?.lines])

  if (!inv) {
    return (
      <XeroChrome crumbs={[{ label: 'Sales overview' }, { label: 'Invoices', to: '/accounting' }]} title={`Invoice ${IDS.xeroInvoice}`}>
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-3 rounded border border-[#d6dade] bg-white px-4 py-6">
            <Lock size={28} className="text-slate-400" />
            <div><p className="font-semibold">{IDS.xeroInvoice} has not been created</p><p className="text-sm text-slate-600">It only exists once Zap 3’s rules pass. Nothing is posted to Xero by this demo.</p></div>
          </div>
          <Zap3Panel />
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
        <button className={cn(xSecondary, 'border-xr-blue text-xr-blue')} disabled={!dirty} onClick={() => run((s) => updateInvoiceLines(s, lines))}>Save</button>
        <button className={cn(xSecondary, 'border-xr-blue text-xr-blue')} onClick={() => { if (dirty) run((s) => updateInvoiceLines(s, lines)); run((s) => setInvoiceStatus(s, 'Awaiting Approval')) }}>Submit for approval <ChevronDown size={13} /></button>
        <button className={xPrimary} onClick={() => setConfirmApprove(true)}><Check size={15} /> Approve draft</button>
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
      actions={<>{actions}<button className={cn(xSecondary, 'px-2')} aria-label="Invoice options">⋯</button></>}
    >
      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0 space-y-4">
        <div className="flex items-center gap-2 rounded border border-[#d9ccf5] bg-[#f6f2ff] px-4 py-2 text-xs text-[#4b2a99]">
          <Zap size={14} /> Created by Zap 3 from HubSpot deal <Link className="font-semibold underline" to="/crm/deal">{IDS.hubspotDeal}</Link> after the contract was approved and signed.
        </div>

        <StatusFlow status={inv.status} />

        <div className="rounded border border-[#d6dade] bg-white">
          <div className="grid gap-4 border-b border-[#e6e9ec] p-5 sm:grid-cols-2 lg:grid-cols-6">
            <XField label="To" className="lg:col-span-2"><div className="rounded border border-[#a6aeb7] px-2.5 py-1.5 text-sm"><span className="font-semibold">{inv.contactName}</span><span className="block text-xs text-slate-500">{state.transaction.email} · Account {state.transaction.buyerId}</span></div></XField>
            <XField label="Invoice date"><Read v={date(inv.date)} /></XField>
            <XField label="Due date"><Read v={date(inv.dueDate)} /></XField>
            <XField label="Invoice number"><Read v={inv.number} /></XField>
            <XField label="Reference"><Read v={inv.reference} /></XField>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-xs text-slate-600">
            <span>Branding theme: <b>Standard</b> · Currency: <b>VUV Vanuatu Vatu</b></span>
            <span>Amounts are <b>Tax exclusive</b></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-sm">
              <thead className="border-y border-[#d6dade] bg-[#f6f7f8] text-left text-xs text-slate-600">
                <tr>
                  <th className="w-20 px-3 py-2 font-semibold">Item</th>
                  <th className="px-3 py-2 font-semibold">Description</th>
                  <th className="w-20 px-3 py-2 text-right font-semibold">Quantity</th>
                  <th className="w-32 px-3 py-2 text-right font-semibold">Unit price</th>
                  <th className="w-44 px-3 py-2 font-semibold">Account</th>
                  <th className="w-32 px-3 py-2 font-semibold">Tax</th>
                  <th className="w-32 px-3 py-2 text-right font-semibold">Amount</th>
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
              <div className="flex justify-between"><dt>Tax (VAT 15%)</dt><dd className="tabular-nums">{num(totals.tax)}</dd></div>
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
      <AutomationPanel />
      </div>
      {confirmApprove && (
        <div className="fixed inset-0 top-7 z-[60] flex items-center justify-center bg-[#000a1e]/40 p-4" onMouseDown={() => setConfirmApprove(false)}>
          <div className="w-full max-w-md rounded bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()} role="alertdialog">
            <p className="border-b border-[#e6e9ec] px-5 py-3 font-semibold">Approve draft {inv.number}?</p>
            <p className="px-5 py-4 text-sm text-slate-700">Finance approval moves the invoice to <b>Awaiting Payment</b>. In this demo nothing is posted to Xero.</p>
            <div className="flex justify-end gap-2 border-t border-[#e6e9ec] bg-[#f6f7f8] px-5 py-3">
              <button className={xSecondary} onClick={() => setConfirmApprove(false)}>Cancel</button>
              <button className={xPrimary} onClick={() => { setConfirmApprove(false); if (dirty) run((s) => updateInvoiceLines(s, lines)); run((s) => setInvoiceStatus(s, 'Awaiting Payment')) }}>Approve</button>
            </div>
          </div>
        </div>
      )}
    </XeroChrome>
  )
}

/** Where this invoice came from and which checks Zap 3 ran before creating it. */
function AutomationPanel() {
  const { state } = useDemo()
  const deal = state.hubspot.deals.find((d) => d.id === IDS.hubspotDeal)
  const run = state.events.find((e) => e.idempotencyKey === `xero.invoice:${IDS.transaction}:deposit` && e.status === 'success')
  const checks = ['Customer matched (email)', 'Lot ID matched', 'Amount validated', 'Duplicate invoice check passed']
  return (
    <aside className="h-fit rounded border border-[#d6dade] bg-white text-[13px]">
      <p className="border-b border-[#e6e9ec] px-4 py-2.5 font-semibold">Invoice from automation</p>
      <dl className="space-y-1.5 px-4 py-3">
        <div className="grid grid-cols-[70px_1fr] gap-2"><dt className="text-slate-500">Source</dt><dd>HubSpot (via Zap 3)</dd></div>
        <div className="grid grid-cols-[70px_1fr] gap-2"><dt className="text-slate-500">Deal</dt><dd><Link to="/crm/deal" className="text-xr-blue hover:underline">{deal?.name}</Link></dd></div>
        <div className="grid grid-cols-[70px_1fr] gap-2"><dt className="text-slate-500">Trigger</dt><dd>Deal marked Closed Won</dd></div>
        <div className="grid grid-cols-[70px_1fr] gap-2"><dt className="text-slate-500">Run</dt><dd>{run ? dateTime(run.at) : '—'}</dd></div>
      </dl>
      <ul className="space-y-1.5 border-t border-[#e6e9ec] px-4 py-3">
        {checks.map((c) => <li key={c} className="flex items-center gap-2"><span className="flex size-4 items-center justify-center rounded-full bg-xr-green text-white"><Check size={10} strokeWidth={3.5} /></span>{c}</li>)}
      </ul>
      <p className="border-t border-[#e6e9ec] px-4 py-2.5 text-[11px] font-semibold tracking-wide text-rose-700">SIMULATED XERO TRANSACTION — NOT POSTED TO XERO</p>
    </aside>
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

/** Zap 3's filter, shown where finance would look: the invoice only exists once every rule passes. */
function Zap3Panel() {
  const { state, runDelayed, busy } = useDemo()
  const [confirm, setConfirm] = useState(false)
  const rules = invoiceRules(state)
  const inv = state.xero.invoice
  const last = state.events.find((e) => e.scenario.startsWith('Zap 3') && (!e.transaction || e.transaction === IDS.transaction))
  const pass = rules.every((r) => r.pass)
  return (
    <div className="overflow-hidden rounded border border-[#d6dade] bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e6e9ec] px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded bg-[#ff4f00] text-white"><Zap size={14} /></span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Zap 3 validation · {IDS.lot} → {IDS.xeroInvoice}</p>
          <p className="text-xs text-slate-600">{inv ? `Draft ${inv.number} exists — Zap 3 will not create another.` : 'Runs when the HubSpot deal is Closed Won. Every rule must pass before anything is created in Xero.'}</p>
        </div>
        {busy === 'zap3' ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-xr-blue"><Spinner size={13} /> Validating…</span>
        ) : inv ? (
          <Link to="/accounting/invoice" className={xSecondary}>Open {inv.number}</Link>
        ) : (
          <button className={xPrimary} onClick={() => setConfirm(true)}>CREATE DRAFT INVOICE</button>
        )}
      </div>
      <ul className="grid gap-px bg-[#e6e9ec] text-[13px] sm:grid-cols-2 xl:grid-cols-4">
        {rules.map((r) => (
          <li key={r.label} className="flex items-start gap-2 bg-white px-4 py-2">
            {r.pass ? <Check size={15} strokeWidth={3} className="mt-0.5 shrink-0 text-xr-green" /> : <CircleX size={15} className="mt-0.5 shrink-0 text-rose-500" />}
            <span className="min-w-0">
              <span className={cn('block', r.pass ? 'text-slate-700' : 'font-semibold text-slate-900')}>{r.label}</span>
              <span className="block truncate text-xs text-slate-500">{r.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      {last && (
        <p className={cn('border-t border-[#e6e9ec] px-4 py-2 text-xs', last.status === 'success' ? 'bg-[#f0faf3] text-[#0b6b2f]' : last.status === 'blocked' ? 'bg-amber-50 text-amber-900' : last.status === 'failed' ? 'bg-rose-50 text-rose-800' : 'bg-slate-50 text-slate-700')}>
          Last run {time(last.at)} · {last.status === 'blocked' ? 'Stopped by filter' : last.status === 'duplicate' ? 'Skipped (already created)' : last.status === 'failed' ? 'Failed' : 'Success'} — {last.result}
        </p>
      )}
      {confirm && (
        <div className="fixed inset-0 top-7 z-[60] flex items-center justify-center bg-[#000a1e]/40 p-4" onMouseDown={() => setConfirm(false)}>
          <div className="w-full max-w-md rounded bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()} role="alertdialog">
            <p className="border-b border-[#e6e9ec] px-5 py-3 font-semibold">Create draft invoice in Xero?</p>
            <div className="px-5 py-4 text-sm text-slate-700">
              {pass ? 'All rules pass. Zap 3 will find or create the Xero contact, create a DRAFT invoice in VUV and write the invoice number back to the HubSpot deal.' : `${rules.filter((r) => !r.pass).length} rule(s) are not met. Zap 3 will run, but its filter will stop before anything is created in Xero.`}
            </div>
            <div className="flex justify-end gap-2 border-t border-[#e6e9ec] bg-[#f6f7f8] px-5 py-3">
              <button className={xSecondary} onClick={() => setConfirm(false)}>Cancel</button>
              <button className={xPrimary} onClick={() => { setConfirm(false); runDelayed('zap3', (s) => createXeroInvoice(s, 'Xero screen — CREATE DRAFT INVOICE'), 900) }}>Run Zap 3</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function XeroContacts() {
  const { state } = useDemo()
  const rows = [
    ...state.xero.contacts.map((c) => ({ name: c.name, email: c.email, acct: c.accountNumber, id: c.id, src: 'Created by Zap 3' })),
    { name: 'Priya Nair', email: 'priya.nair@example.com', acct: 'BUY-0131', id: 'XC-PRIY-0131', src: 'Existing' },
    { name: 'Jordan Lee', email: 'jordan.lee@example.com', acct: 'BUY-0119', id: 'XC-JORD-0119', src: 'Existing' },
    { name: 'Kiri Holdings Ltd (demo)', email: 'accounts@kiri.example', acct: 'BUY-0101', id: 'XC-KIRI-0101', src: 'Existing' },
  ]
  return (
    <XeroChrome crumbs={[{ label: 'Contacts' }]} title="Contacts" subActive="Contacts" active="Contacts">
      <div className="p-6">
        <div className="overflow-hidden rounded border border-[#d6dade] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#f6f7f8] text-left text-xs text-slate-600"><tr>{['Contact', 'Email', 'Account number', 'ID', 'Source'].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[#e6e9ec]">
                  <td className="px-4 py-2.5 font-medium text-xr-blue">{r.name}</td><td className="px-4 py-2.5">{r.email}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.acct}</td><td className="px-4 py-2.5 font-mono text-xs">{r.id}</td><td className="px-4 py-2.5 text-xs text-slate-600">{r.src}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {state.xero.contacts.length === 0 && <p className="border-t border-[#e6e9ec] px-4 py-2.5 text-xs text-slate-500">Alex Morgan is not in Xero yet — Zap 3 finds or creates the contact (matched on email) when the deal is won.</p>}
        </div>
      </div>
    </XeroChrome>
  )
}

function XeroReports() {
  return (
    <XeroChrome crumbs={[{ label: 'Reporting' }]} title="Reports" subActive="Reports" active="Reporting">
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <p className="text-lg font-semibold">Reports are outside this demo</p>
        <p className="max-w-md text-sm text-slate-600">The integration only creates draft invoices and draft bills; finance reporting stays in Xero as today.</p>
        <Link to="/accounting" className={cn(xSecondary, 'mt-4')}>Back to invoices</Link>
      </div>
    </XeroChrome>
  )
}
