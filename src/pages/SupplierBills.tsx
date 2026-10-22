import { AlertTriangle, ArrowRight, Check, CheckCircle2, CopyX, FileText, Inbox, Mail, Paperclip, Play, ScanText, Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, type Tone } from '../components/ui/primitives'
import { ProductFrame } from '../components/ui/ProductFrame'
import { INBOXES } from '../data/bills'
import { USERS } from '../data/ids'
import type { InboxEmail, InboxId, XeroBill } from '../data/types'
import { cn, date, dateTime, driveDate, num, vt } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { createDraftBill, processInbox, REVIEW_THRESHOLD, setBillStatus } from '../store/engine'
import { StatusPill, XeroChrome, xPrimary, xSecondary } from './Accounting'

const statusTone: Record<InboxEmail['status'], Tone> = { New: 'blue', 'Needs review': 'amber', 'Draft bill created': 'green', Duplicate: 'violet' }

export default function SupplierBills() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'xero' ? 'xero' : 'inbox'
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
        <Badge tone="violet">Later phase</Badge>
        <p className="text-sm font-semibold">Supplier invoices → Xero draft bills</p>
        <p className="hidden text-xs text-slate-500 lg:block">Two shared inboxes · extraction · duplicate check across inboxes · draft bills only, finance approves</p>
        <div className="ml-auto flex overflow-hidden rounded-md border border-slate-300 text-sm">
          <button onClick={() => setParams({})} className={cn('px-3 py-1.5', view === 'inbox' ? 'bg-slate-900 text-white' : 'bg-white')}>Shared inboxes</button>
          <button onClick={() => setParams({ view: 'xero' })} className={cn('px-3 py-1.5', view === 'xero' ? 'bg-slate-900 text-white' : 'bg-white')}>Xero · Bills</button>
        </div>
      </div>
      {view === 'inbox' ? <InboxView /> : <XeroBills />}
    </div>
  )
}

function InboxView() {
  const { state, run } = useDemo()
  const [box, setBox] = useState<InboxId | 'all'>('all')
  const [openId, setOpenId] = useState<string>('em-1')
  const emails = state.bills.emails.filter((m) => box === 'all' || m.inbox === box).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  const open = state.bills.emails.find((m) => m.id === openId)
  const unread = (b: InboxId) => state.bills.emails.filter((m) => m.inbox === b && m.status === 'New').length

  return (
    <ProductFrame product="mailbox" label="Simulated shared mailboxes (Gmail or Microsoft 365 in production) · synthetic suppliers and invoices">
      <div className="flex min-h-0 flex-1 bg-white">
        {/* Folders */}
        <nav className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50 p-3 md:flex">
          <Button variant="primary" onClick={() => run((s) => processInbox(s, box === 'all' ? undefined : box))} className="mb-3">
            <Play size={14} /> Run inbox poll now
          </Button>
          <p className="mb-1 px-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Shared mailboxes</p>
          {(['all', 'accounts', 'site'] as const).map((b) => (
            <button key={b} onClick={() => setBox(b)} className={cn('flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm', box === b ? 'bg-white font-medium shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/70')}>
              <Inbox size={15} className="shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{b === 'all' ? 'All supplier mail' : INBOXES[b].label}</span>
                {b !== 'all' && <span className="block truncate text-[11px] font-normal text-slate-500">{INBOXES[b].address}</span>}
              </span>
              {b !== 'all' && unread(b) > 0 && <span className="rounded-full bg-sky-600 px-1.5 text-[10px] font-semibold text-white">{unread(b)}</span>}
            </button>
          ))}
          <div className="mt-auto space-y-2 rounded-md border border-slate-200 bg-white p-3 text-[11px] text-slate-600">
            <p className="font-semibold text-slate-800">Scenario rules</p>
            <p>Poll both inboxes every 15 min for PDF/image attachments.</p>
            <p>Duplicate key: supplier + invoice number, checked across <b>both</b> inboxes and existing Xero bills.</p>
            <p>Confidence &lt; {REVIEW_THRESHOLD * 100}% or missing due date → held for review.</p>
            <p>Bills are only ever created as <b>Draft</b>.</p>
          </div>
        </nav>

        {/* Message list */}
        <div className="scroll-thin w-full max-w-sm shrink-0 overflow-y-auto border-r border-slate-200">
          <div className="sticky top-0 flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5 text-sm">
            <Search size={14} className="text-slate-400" />
            <span className="text-slate-400">Search mail</span>
            <span className="ml-auto text-xs text-slate-500">{emails.length} messages</span>
          </div>
          <ul>
            {emails.map((m) => (
              <li key={m.id}>
                <button onClick={() => setOpenId(m.id)} className={cn('block w-full border-b border-slate-100 px-4 py-3 text-left', openId === m.id ? 'bg-sky-50' : 'hover:bg-slate-50', m.status === 'New' && 'border-l-[3px] border-l-sky-600')}>
                  <div className="flex items-baseline gap-2">
                    <span className={cn('flex-1 truncate text-sm', m.status === 'New' ? 'font-semibold' : 'text-slate-700')}>{m.fromName}</span>
                    <span className="text-[11px] text-slate-500">{driveDate(m.receivedAt)}</span>
                  </div>
                  <p className="truncate text-sm text-slate-800">{m.subject}</p>
                  <p className="truncate text-xs text-slate-500">{m.snippet}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 text-[10px] text-slate-600">{m.inbox}@</span>
                    <Paperclip size={11} className="text-slate-400" />
                    <Badge tone={statusTone[m.status]} className="ml-auto">{m.status}</Badge>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Reading pane */}
        <div className="scroll-thin hidden min-w-0 flex-1 overflow-y-auto lg:block">{open ? <EmailDetail m={open} /> : <p className="p-6 text-sm text-slate-500">Select a message.</p>}</div>
      </div>
    </ProductFrame>
  )
}

function EmailDetail({ m }: { m: InboxEmail }) {
  const { state, run } = useDemo()
  const x = m.extracted
  const bill = state.bills.xeroBills.find((b) => b.id === m.billId)
  const low = x.confidence < REVIEW_THRESHOLD
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold">{m.subject}</h2>
      <div className="mt-2 mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold">{m.fromName[0]}</span>
        <div className="min-w-0 flex-1">
          <p><b>{m.fromName}</b> <span className="text-slate-500">&lt;{m.from}&gt;</span></p>
          <p className="text-xs text-slate-500">To {INBOXES[m.inbox].address} · {dateTime(m.receivedAt)}</p>
        </div>
        <Badge tone={statusTone[m.status]} dot>{m.status}</Badge>
      </div>
      <p className="mb-4 text-sm text-slate-700">{m.snippet}</p>
      <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
        <FileText size={16} className="text-rose-600" /> {m.attachment.name} <span className="text-xs text-slate-500">{m.attachment.sizeKb} KB</span>
      </div>

      <div className="grid gap-5 2xl:grid-cols-2">
        {/* Attachment mock */}
        <div className="rounded-lg bg-slate-100 p-4">
          <div className="mx-auto max-w-sm bg-white p-6 text-xs shadow">
            <p className="mb-3 rounded bg-amber-100 px-2 py-0.5 text-center text-[10px] font-semibold text-amber-900">SYNTHETIC SUPPLIER INVOICE</p>
            <p className="text-base font-bold">{x.supplier}</p>
            <p className="mb-3 text-slate-500">TAX INVOICE</p>
            <div className="mb-3 grid grid-cols-2 gap-1">
              <span className="text-slate-500">Invoice no.</span><span>{x.invoiceNumber}</span>
              <span className="text-slate-500">Date</span><span>{date(x.invoiceDate)}</span>
              <span className="text-slate-500">Due</span><span>{x.dueDate ? date(x.dueDate) : <i className="text-slate-400">not stated</i>}</span>
              <span className="text-slate-500">Bill to</span><span>Pacific Horizon Developments</span>
            </div>
            {x.lines.map((l) => (
              <div key={l.description} className="flex justify-between border-t border-slate-100 py-1"><span>{l.description}</span><span className="tabular-nums">{num(l.amount)}</span></div>
            ))}
            <div className="mt-2 space-y-0.5 border-t border-slate-300 pt-2 text-right">
              <p>Subtotal {num(x.subtotal)}</p>
              <p>VAT 15% {num(x.tax)}</p>
              <p className="font-bold">Total VUV {num(x.total)}</p>
            </div>
          </div>
        </div>

        {/* Extraction */}
        <div className="rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
            <ScanText size={16} className="text-violet-600" />
            <p className="flex-1 text-sm font-semibold">Extracted by automation</p>
            <span className={cn('text-xs font-medium', low ? 'text-amber-700' : 'text-emerald-700')}>{Math.round(x.confidence * 100)}% confidence</span>
          </div>
          <div className="px-4 pt-3"><div className="h-1.5 rounded-full bg-slate-100"><div className={cn('h-full rounded-full', low ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${x.confidence * 100}%` }} /></div></div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 p-4 text-sm">
            {[
              ['Supplier (matched)', `${x.supplier}`],
              ['Supplier ID', x.supplierId],
              ['Invoice number', x.invoiceNumber],
              ['Invoice date', date(x.invoiceDate)],
              ['Due date', x.dueDate ? date(x.dueDate) : '⚠ Missing'],
              ['Account code', x.account],
              ['Subtotal', vt(x.subtotal)],
              ['VAT', vt(x.tax)],
              ['Total', vt(x.total)],
              ['Duplicate key', `${x.supplierId} + ${x.invoiceNumber}`],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className={cn('font-medium', v.startsWith('⚠') && 'text-amber-700')}>{v}</dd></div>
            ))}
          </dl>
          <div className="border-t border-slate-200 px-4 py-3">
            {m.status === 'New' && (
              <Button variant="primary" onClick={() => run((s) => createDraftBill(s, m.id, 'Manual run on email'))}><ArrowRight size={14} /> Create draft bill in Xero</Button>
            )}
            {m.status === 'Needs review' && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs text-amber-800"><AlertTriangle size={13} /> Low confidence{x.dueDate ? '' : ' and no due date (default terms of 14 days will be used)'}. Check the fields against the attachment.</p>
                <Button variant="primary" onClick={() => run((s) => createDraftBill(s, m.id, 'Approved after review', USERS.finance))}><Check size={14} /> Confirm fields &amp; create draft bill</Button>
              </div>
            )}
            {m.status === 'Draft bill created' && bill && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 size={15} /> Draft bill {bill.invoiceNumber} created in Xero · {bill.status}</p>
            )}
            {m.status === 'Duplicate' && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm text-violet-700"><CopyX size={15} /> Skipped: {x.supplier} {x.invoiceNumber} already exists as a Xero bill. No second bill was created.</p>
                <Button size="sm" className="dev-only" onClick={() => run((s) => createDraftBill(s, m.id, 'Manual re-run (idempotency test)'))}>Re-run (idempotency test)</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function XeroBills() {
  const { state, run } = useDemo()
  const [tab, setTab] = useState<XeroBill['status'] | 'All'>('All')
  const bills = state.bills.xeroBills
  const rows = tab === 'All' ? bills : bills.filter((b) => b.status === tab)
  const tabs: (XeroBill['status'] | 'All')[] = ['All', 'Draft', 'Awaiting Approval', 'Awaiting Payment', 'Paid']
  return (
    <XeroChrome active="Purchases" subActive="Bills to pay" crumbs={[{ label: 'Purchases overview' }, { label: 'Bills to pay' }]} title="Bills to pay" actions={<button className={xPrimary}>New bill</button>}>
      <div className="space-y-4 p-6">
        <div className="flex items-start gap-3 rounded border border-[#d9ccf5] bg-[#f6f2ff] p-4 text-sm text-[#3b2479]">
          <Mail size={18} className="mt-0.5" />
          <p>Bills marked <b>“Email to …@”</b> were created by the automation from the two shared inboxes. They are always <b>Draft</b> — finance reviews, codes and approves them here. Duplicates sent to both inboxes are skipped.</p>
        </div>
        <div className="overflow-hidden rounded border border-[#d6dade] bg-white">
          <div className="flex flex-wrap border-b border-[#d6dade] px-2">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn('border-b-[3px] px-3 py-3 text-sm', tab === t ? 'border-xr-blue font-semibold text-xr-blue' : 'border-transparent text-slate-700')}>
                {t}{t !== 'All' && t !== 'Paid' && <span className="ml-1 text-slate-500">({bills.filter((b) => b.status === t).length})</span>}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f6f7f8] text-left text-xs text-slate-600">
                <tr>{['From', 'Ref / invoice no.', 'Date', 'Due date', 'Account', 'Total VUV', 'Source', 'Status', ''].map((h) => <th key={h} className={cn('px-3 py-2.5 font-semibold whitespace-nowrap', h === 'Total VUV' && 'text-right')}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className={cn('border-t border-[#e6e9ec]', b.source.startsWith('Email') && b.status === 'Draft' && 'bg-[#fffbe6]')}>
                    <td className="px-3 py-2.5 font-medium">{b.supplier}</td>
                    <td className="px-3 py-2.5"><span className="font-medium text-xr-blue">{b.invoiceNumber}</span><span className="block max-w-56 truncate text-xs text-slate-500">{b.reference}</span></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{date(b.date)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{date(b.dueDate)}</td>
                    <td className="px-3 py-2.5 text-xs">{b.account}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(b.total)}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{b.source}</td>
                    <td className="px-3 py-2.5"><StatusPill status={b.status} /></td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {b.status === 'Draft' && <button className={cn(xSecondary, 'h-7 px-2 text-xs')} onClick={() => run((s) => setBillStatus(s, b.id, 'Awaiting Payment'))}>Approve</button>}
                    </td>
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
