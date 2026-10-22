import {
  AlertTriangle,
  Building2,
  Bell,
  BarChart3,
  Bookmark,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Filter,
  Handshake,
  Headphones,
  LayoutGrid,
  List,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  StickyNote,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ProductFrame } from '../components/ui/ProductFrame'
import { ActionMenu, ConfirmDialog } from '../components/ui/overlays'
import { IDS } from '../data/ids'
import { DEAL_STAGES, type HubSpotDeal, type HubSpotTimelineItem } from '../data/types'
import { cn, date, dateTime, initials, longDate, time, vt } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { addHubSpotNote, createHubSpotContact, findDuplicateContact, hubspotHasPendingChanges, setDealStage, syncHubSpot } from '../store/engine'

/* ------------------------------------------------------------------ */
/* Chrome                                                               */
/* ------------------------------------------------------------------ */

type HsNav = 'Dashboard' | 'Contacts' | 'Companies' | 'Deals' | 'Tickets' | 'Tasks' | 'Meetings' | 'Playbooks' | 'Reports'

function HubSpotChrome({ children, active = 'Deals' }: { children: ReactNode; active?: HsNav }) {
  const side: { label: HsNav; Icon: typeof Users; to?: string }[] = [
    { label: 'Dashboard', Icon: LayoutGrid },
    { label: 'Contacts', Icon: Users, to: '/crm?view=contacts' },
    { label: 'Companies', Icon: Building2 },
    { label: 'Deals', Icon: Handshake, to: '/crm' },
    { label: 'Tickets', Icon: Headphones },
    { label: 'Tasks', Icon: CheckCircle2 },
    { label: 'Meetings', Icon: Calendar },
    { label: 'Playbooks', Icon: Bookmark },
    { label: 'Reports', Icon: BarChart3 },
  ]
  const top = ['Contacts', 'Conversations', 'Marketing', 'Sales', 'Service', 'Automation', 'Reports']
  return (
    <ProductFrame product="HubSpot">
      <div className="flex min-h-0 flex-1 flex-col bg-hs-bg text-hs-text" style={{ fontFamily: "'Lexend Deca', Inter, sans-serif" }}>
        <div className="flex h-11 shrink-0 items-center gap-1 bg-hs-nav px-3 text-[13px] text-white">
          <span className="mr-3 flex size-7 items-center justify-center rounded-full bg-hs-orange" title="CRM (simulated — no vendor logo)"><Users size={14} /></span>
          <nav className="hidden items-center lg:flex">
            {top.map((m) => (
              <span key={m} className={cn('inline-flex items-center gap-0.5 rounded-[3px] px-2.5 py-1.5', m === 'Contacts' ? 'text-white' : 'text-white/80 hover:bg-white/10')}>{m} <ChevronDown size={12} className="opacity-70" /></span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-white/80">
            <Search size={16} />
            <Bell size={16} />
            <Settings size={16} />
            <span className="flex size-7 items-center justify-center rounded-full bg-hs-teal text-[10px] font-semibold text-white">SW</span>
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <nav className="hidden w-44 shrink-0 flex-col gap-0.5 bg-[#2e3f50] py-2 text-[13px] text-white/80 sm:flex" aria-label="CRM">
            {side.map(({ label, Icon, to }) => {
              const cls = cn('mx-2 flex items-center gap-2.5 rounded-[3px] px-2.5 py-2', label === active ? 'bg-[#425b76] font-medium text-white' : 'hover:bg-white/5')
              return to ? <Link key={label} to={to} className={cls}><Icon size={15} />{label}</Link> : <span key={label} className={cls}><Icon size={15} />{label}</span>
            })}
          </nav>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </ProductFrame>
  )
}

/* ------------------------------------------------------------------ */
/* Index: deals board + contacts list                                   */
/* ------------------------------------------------------------------ */

export function CrmIndex() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'contacts' ? 'contacts' : 'deals'
  return (
    <HubSpotChrome active={view === 'contacts' ? 'Contacts' : 'Deals'}>
      <div className="flex shrink-0 items-center gap-6 border-b border-hs-border bg-white px-5 pt-3">
        {(['contacts', 'deals'] as const).map((v) => (
          <button key={v} onClick={() => setParams({ view: v })} className={cn('border-b-[3px] pb-2.5 text-sm font-medium capitalize', view === v ? 'border-hs-text text-hs-text' : 'border-transparent text-hs-link hover:text-hs-text')}>
            {v}
          </button>
        ))}
      </div>
      {view === 'deals' ? <DealsBoard /> : <ContactsList />}
    </HubSpotChrome>
  )
}

function DealsBoard() {
  const { state } = useDemo()
  const [layout, setLayout] = useState<'board' | 'table'>('board')
  const deals = state.hubspot.deals
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-hs-border bg-white px-5 py-3">
        <h1 className="text-xl font-semibold">Deals</h1>
        <span className="text-xs text-slate-500">{deals.length} records</span>
        <div className="ml-4 flex items-center gap-1 text-sm">
          Pipeline: <b className="inline-flex items-center gap-0.5">Lot Sales <ChevronDown size={14} /></b>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex overflow-hidden rounded-sm border border-hs-border">
            <button onClick={() => setLayout('table')} className={cn('p-1.5', layout === 'table' ? 'bg-hs-bg' : 'bg-white')} aria-label="Table"><List size={15} /></button>
            <button onClick={() => setLayout('board')} className={cn('p-1.5', layout === 'board' ? 'bg-hs-bg' : 'bg-white')} aria-label="Board"><LayoutGrid size={15} /></button>
          </div>
          <button className="h-8 rounded-sm bg-hs-orange px-3 text-sm font-medium text-white">Create deal</button>
        </div>
      </div>
      <div className="flex items-center gap-2 border-b border-hs-border bg-white px-5 py-2 text-xs">
        <span className="rounded-sm border border-hs-border px-2 py-1">Deal owner ▾</span>
        <span className="rounded-sm border border-hs-border px-2 py-1">Create date ▾</span>
        <span className="rounded-sm border border-hs-border px-2 py-1">Close date ▾</span>
        <span className="inline-flex items-center gap-1 text-hs-link"><Filter size={12} /> Advanced filters</span>
      </div>
      {layout === 'board' ? (
        <div className="scroll-thin flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
          {DEAL_STAGES.map((stage) => {
            const col = deals.filter((d) => d.stage === stage)
            return (
              <div key={stage} className="flex w-60 shrink-0 flex-col rounded-sm bg-[#eaf0f6]">
                <div className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold tracking-wide uppercase">
                  <span>{stage}</span>
                  <span className="rounded-full bg-white px-1.5 text-[11px] text-slate-500">{col.length}</span>
                </div>
                <div className="scroll-thin flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                  {col.map((d) => (
                    <DealCard key={d.id} deal={d} />
                  ))}
                </div>
                <div className="border-t border-hs-border px-3 py-2 text-xs">
                  Total: <b>{vt(col.reduce((a, d) => a + d.amount, 0))}</b>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="scroll-thin min-h-0 flex-1 overflow-auto p-4">
          <table className="w-full border border-hs-border bg-white text-sm">
            <thead className="bg-[#f5f8fa] text-left text-xs uppercase">
              <tr>{['Deal name', 'Deal stage', 'Close date', 'Deal owner', 'Amount', 'Record ID'].map((h) => <th key={h} className="border-b border-hs-border px-3 py-2 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b border-hs-border last:border-0 hover:bg-[#f5f8fa]">
                  <td className="px-3 py-2"><DealLink deal={d} /></td>
                  <td className="px-3 py-2">{d.stage}</td>
                  <td className="px-3 py-2">{date(d.settlementDate)}</td>
                  <td className="px-3 py-2">{d.owner}</td>
                  <td className="px-3 py-2">{vt(d.amount)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{d.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DealLink({ deal }: { deal: HubSpotDeal }) {
  if (deal.id === IDS.hubspotDeal) return <Link to="/crm/deal" className="font-medium text-hs-link hover:underline">{deal.name}</Link>
  return <span className="font-medium text-hs-link" title="Only LOT-025 is fully wired in this demo">{deal.name}</span>
}

function DealCard({ deal }: { deal: HubSpotDeal }) {
  const isDemo = deal.id === IDS.hubspotDeal
  const body = (
    <div className={cn('rounded-sm border bg-white p-3 text-xs shadow-sm', isDemo ? 'border-hs-teal ring-1 ring-hs-teal' : 'border-hs-border')}>
      <p className="mb-1 text-sm font-semibold text-hs-link">{deal.name}</p>
      <p>Amount: <b>{vt(deal.amount)}</b></p>
      <p>Close date: {date(deal.settlementDate)}</p>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>{deal.owner}</span>
        {isDemo && <span className="rounded bg-[#e5f8f6] px-1 text-[#00a38d]">Demo record</span>}
      </div>
    </div>
  )
  return isDemo ? <Link to="/crm/deal" className="block">{body}</Link> : body
}

function ContactsList() {
  const { state } = useDemo()
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const contacts = state.hubspot.contacts.filter((c) => `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-hs-border bg-white px-5 py-3">
        <h1 className="text-xl font-semibold">Contacts</h1>
        <span className="text-xs text-slate-500">{state.hubspot.contacts.length} records</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-8 items-center gap-1.5 rounded-sm border border-hs-border bg-white px-2 text-sm">
            <Search size={14} className="text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email" className="w-44 outline-none" />
          </div>
          <button onClick={() => setCreating(true)} className="h-8 rounded-sm bg-hs-orange px-3 text-sm font-medium text-white">Create contact</button>
        </div>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-auto p-4">
        <table className="w-full border border-hs-border bg-white text-sm">
          <thead className="bg-[#f5f8fa] text-left text-xs uppercase">
            <tr>{['Name', 'Email', 'Phone number', 'Contact owner', 'Lifecycle stage', 'Buyer ID', 'Create date'].map((h) => <th key={h} className="border-b border-hs-border px-3 py-2 font-semibold whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-hs-border last:border-0 hover:bg-[#f5f8fa]">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#eaf0f6] text-[10px] font-semibold">{initials(`${c.firstName} ${c.lastName}`)}</span>
                    {c.id === IDS.hubspotContact ? <Link to="/crm/contact" className="font-medium text-hs-link hover:underline">{c.firstName} {c.lastName}</Link> : <span className="font-medium text-hs-link">{c.firstName} {c.lastName}</span>}
                  </span>
                </td>
                <td className="px-3 py-2">{c.email}</td>
                <td className="px-3 py-2 whitespace-nowrap">{c.phone}</td>
                <td className="px-3 py-2">{c.owner}</td>
                <td className="px-3 py-2">{c.lifecycleStage}</td>
                <td className="px-3 py-2 font-mono text-xs">{c.buyerId || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{date(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && <CreateContactPanel onClose={() => setCreating(false)} />}
    </div>
  )
}

function CreateContactPanel({ onClose }: { onClose: () => void }) {
  const { state, run } = useDemo()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: 'Alex.Morgan@example.com ', firstName: 'Alex', lastName: 'Morgan', phone: '+678 555 0142' })
  const [dupOpen, setDupOpen] = useState(false)
  const [why, setWhy] = useState(false)
  const dup = findDuplicateContact(state, form.email)
  const input = 'w-full rounded-[3px] border border-hs-border bg-[#f5f8fa] px-2.5 py-1.5 text-sm outline-none focus:border-hs-teal focus:bg-white focus:shadow-[0_0_4px_1px_rgba(0,208,228,.3)]'
  const submit = () => {
    if (dup) { setDupOpen(true); setWhy(false); return }
    run((s) => createHubSpotContact(s, form))
    onClose()
  }
  return (
    <div className="absolute inset-0 z-20 flex justify-end bg-hs-nav/30">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-hs-teal px-5 py-3 text-white">
          <h2 className="font-semibold">Create contact</h2>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="scroll-thin flex-1 space-y-4 overflow-y-auto p-5 text-sm">
          <p className="rounded-[3px] bg-[#f5f8fa] px-3 py-2 text-xs text-slate-600">Prefilled with a re-submitted website enquiry. HubSpot-side matching normalises email (trim, lower-case) and checks Buyer ID before anything is created.</p>
          <label className="block"><span className="mb-1 block text-xs font-semibold">Email</span><input className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          {dup && <p className="-mt-2 flex items-center gap-1.5 text-xs text-amber-800"><AlertTriangle size={13} /> Matches an existing contact</p>}
          <label className="block"><span className="mb-1 block text-xs font-semibold">First name</span><input className={input} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold">Last name</span><input className={input} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold">Phone number</span><input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold">Contact owner</span><select className={input} disabled><option>Sarah Williams</option></select></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold">Lifecycle stage</span><select className={input} disabled><option>Lead</option></select></label>
        </div>
        <div className="flex gap-2 border-t border-hs-border p-4">
          <button onClick={submit} className="h-9 rounded-[3px] bg-hs-orange px-4 text-sm font-medium text-white hover:brightness-105">Create</button>
          <button onClick={onClose} className="h-9 rounded-[3px] border border-hs-orange px-4 text-sm font-medium text-hs-orange">Cancel</button>
        </div>
      </div>

      {dupOpen && dup && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-hs-nav/40 p-4" onMouseDown={() => setDupOpen(false)}>
          <div className="w-full max-w-lg rounded-[3px] bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <div className="flex items-center justify-between bg-hs-teal px-5 py-3 text-white">
              <h3 className="font-semibold">Possible duplicate contact found</h3>
              <button onClick={() => setDupOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-3 p-5 text-sm">
              <p>A contact with the same email already exists. Matching ignores case and spaces, so <code className="rounded bg-slate-100 px-1">{form.email.trim()}</code> is treated as <code className="rounded bg-slate-100 px-1">{form.email.trim().toLowerCase()}</code>.</p>
              <div className="flex items-center gap-3 rounded-[3px] border border-hs-border p-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-[#eaf0f6] text-sm font-semibold">{initials(`${dup.firstName} ${dup.lastName}`)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-hs-link">{dup.firstName} {dup.lastName}</p>
                  <p className="text-xs text-slate-600">{dup.email} · {dup.phone}</p>
                  <p className="text-xs text-slate-500">Buyer ID {dup.buyerId || '—'} · {dup.id} · owner {dup.owner}</p>
                </div>
                <span className="rounded bg-[#e5f8f6] px-2 py-0.5 text-xs font-medium text-[#00a38d]">1 open deal</span>
              </div>
              {why && (
                <div className="rounded-[3px] border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                  <p className="mb-1 font-semibold">Blocked by the integration rule — here is why</p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    <li>The buyer’s calls, emails and deal history would be split across two records.</li>
                    <li>Zap 1 matches on Buyer ID then email — two matches makes the next sync ambiguous.</li>
                    <li>Zap 3 could create a second Xero contact and invoice for the same buyer.</li>
                  </ul>
                  <p className="mt-1.5">The attempt has been logged in the Automation Monitor. An admin can merge records if a genuine second buyer shares this email.</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-hs-border px-5 py-3">
              <button onClick={() => setDupOpen(false)} className="h-9 rounded-[3px] border border-hs-border px-4 text-sm">Cancel</button>
              <button onClick={() => { run((s) => createHubSpotContact(s, form)); setWhy(true) }} disabled={why} className="h-9 rounded-[3px] border border-hs-orange px-4 text-sm font-medium text-hs-orange disabled:opacity-40">Create new contact</button>
              <button onClick={() => navigate(dup.id === IDS.hubspotContact ? '/crm/contact' : '/crm?view=contacts')} className="h-9 rounded-[3px] bg-hs-orange px-4 text-sm font-medium text-white">Use existing contact</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Record pages                                                         */
/* ------------------------------------------------------------------ */

function ActionIcons({ compact }: { compact?: boolean } = {}) {
  const items = [
    { Icon: StickyNote, label: 'Note' },
    { Icon: Mail, label: 'Email' },
    { Icon: Phone, label: 'Call' },
    { Icon: CheckCircle2, label: 'Task' },
    { Icon: Calendar, label: 'Meeting' },
    { Icon: MoreHorizontal, label: 'More' },
  ]
  if (compact) {
    return (
      <div className="flex gap-1">
        {items.slice(0, 5).map(({ Icon, label }) => (
          <span key={label} title={label} className="flex size-7 items-center justify-center rounded-full border border-hs-border bg-[#f5f8fa] text-hs-text hover:bg-[#eaf0f6]"><Icon size={13} /></span>
        ))}
      </div>
    )
  }
  return (
    <div className="flex justify-center gap-3">
      {items.map(({ Icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <span className="flex size-9 items-center justify-center rounded-full border border-hs-border bg-[#f5f8fa] text-hs-text hover:bg-[#eaf0f6]"><Icon size={15} /></span>
          <span className="text-[11px]">{label}</span>
        </div>
      ))}
    </div>
  )
}

const timelineIcon: Record<HubSpotTimelineItem['type'], { Icon: typeof Mail; cls: string }> = {
  integration: { Icon: Zap, cls: 'bg-[#e5f5f8] text-[#0091ae]' },
  note: { Icon: StickyNote, cls: 'bg-[#fef8f0] text-[#dbae60]' },
  email: { Icon: Mail, cls: 'bg-[#eaf0f6] text-hs-text' },
  task: { Icon: CheckCircle2, cls: 'bg-[#fdedee] text-[#f2545b]' },
  stage: { Icon: ChevronRight, cls: 'bg-[#e5f8f6] text-[#00bda5]' },
  call: { Icon: Phone, cls: 'bg-[#eaf0f6] text-hs-text' },
}

function Timeline({ filter }: { filter: 'all' | HubSpotTimelineItem['type'] }) {
  const { state } = useDemo()
  const items = state.hubspot.timeline.filter((t) => filter === 'all' || t.type === filter)
  const groups = useMemo(() => {
    const g = new Map<string, HubSpotTimelineItem[]>()
    for (const it of items) {
      const k = new Date(it.at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      g.set(k, [...(g.get(k) ?? []), it])
    }
    return [...g.entries()]
  }, [items])
  return (
    <div className="space-y-4">
      {groups.map(([month, list]) => (
        <div key={month}>
          <p className="mb-2 text-xs font-semibold text-slate-500">{month}</p>
          <ul className="space-y-2">
            {list.map((t) => {
              const { Icon, cls } = timelineIcon[t.type]
              return (
                <li key={t.id} className="rounded-sm border border-hs-border bg-white p-3">
                  <div className="flex items-start gap-3">
                    <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', cls)}><Icon size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold">{t.title}</p>
                        <p className="text-xs text-slate-500">{dateTime(t.at)}</p>
                      </div>
                      {t.body && <p className="mt-0.5 text-sm text-slate-600">{t.body}</p>}
                      <p className="mt-1 text-[11px] text-slate-500">{t.type === 'integration' ? 'via Property Sales Automation (simulated integration)' : `by ${t.actor}`}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-slate-500">No activities match this filter.</p>}
    </div>
  )
}

function DuplicateCheckCard() {
  const { state } = useDemo()
  const t = state.transaction
  const contactMatches = state.hubspot.contacts.filter((c) => c.buyerId === t.buyerId || c.email.toLowerCase() === t.email.toLowerCase()).length
  const dealMatches = state.hubspot.deals.filter((d) => d.lotId === t.lotId && d.buyerId === t.buyerId).length
  return (
    <div className="rounded-sm border border-hs-border bg-white">
      <div className="flex items-center justify-between border-b border-hs-border px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-[#00bda5]" /> Duplicate Check: <span className="text-[#00a38d]">{state.hubspot.duplicateCheck.toUpperCase()}</span></p>
        <span className="rounded bg-[#e5f8f6] px-2 py-0.5 text-xs font-medium text-[#00a38d]">{contactMatches} contact · {dealMatches} deal</span>
      </div>
      <dl className="grid gap-3 p-4 text-xs sm:grid-cols-2">
        <div className="sm:col-span-2"><dt className="font-semibold">Matching rule</dt><dd className="text-slate-600">Buyer ID + Email + Lot ID / Deal Key</dd></div>
        <div><dt className="font-semibold">Contact matching</dt><dd className="text-slate-600">1. Stable Buyer ID <code>{t.buyerId}</code><br />2. Normalised email <code>{t.email.toLowerCase()}</code></dd></div>
        <div><dt className="font-semibold">Deal uniqueness rule</dt><dd className="text-slate-600">One open deal per <code>Lot ID + Buyer ID</code> ({t.lotId} + {t.buyerId}). Re-sync updates, never inserts.</dd></div>
        <div><dt className="font-semibold">Idempotency</dt><dd className="text-slate-600">Each sync carries <code>hs.upsert:{t.id}:&lt;payload hash&gt;</code>. Replays are ignored.</dd></div>
        <div><dt className="font-semibold">Last sync</dt><dd className="text-slate-600">{state.hubspot.lastSyncedAt ? dateTime(state.hubspot.lastSyncedAt) : '—'}</dd></div>
      </dl>
    </div>
  )
}

function SyncBanner() {
  const { state, run } = useDemo()
  if (!hubspotHasPendingChanges(state)) return null
  return (
    <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-6 py-2 text-sm text-amber-900">
      <AlertTriangle size={15} /> Process Street run {IDS.processStreetRun} has changes that are not yet in HubSpot.
      <button onClick={() => run((s) => syncHubSpot(s, 'Sync banner on HubSpot record'))} className="ml-auto rounded-sm bg-hs-orange px-3 py-1 text-xs font-medium text-white">Sync now</button>
    </div>
  )
}

function PropRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="group -mx-2 rounded-[3px] px-2 py-1.5 hover:bg-[#f5f8fa]">
      <p className="text-xs text-[#516f90]">{label}</p>
      <p className={cn('flex items-center justify-between gap-2 text-sm text-hs-text', mono && 'font-mono text-[13px]')}>
        <span className="min-w-0 break-words">{value || '—'}</span>
        <Pencil size={12} className="shrink-0 text-hs-link opacity-0 group-hover:opacity-100" />
      </p>
    </div>
  )
}

export function DealRecord() {
  const { state, run } = useDemo()
  const navigate = useNavigate()
  const deal = state.hubspot.deals.find((d) => d.id === IDS.hubspotDeal)!
  const contact = state.hubspot.contacts.find((c) => c.id === deal.contactId)
  const contract = state.contract
  const won = deal.stage === 'Closed Won'
  const [pendingStage, setPendingStage] = useState<HubSpotDeal['stage'] | null>(null)
  const [tab, setTab] = useState<'Overview' | 'Activities' | 'Contacts' | 'Companies' | 'Deals' | 'Attachments'>('Overview')
  const [note, setNote] = useState('')
  const files = ['gd-f-passport', 'gd-f-address', 'gd-f-application', contract.driveFileId, contract.approvedFileId, contract.signedFileId]
    .map((id) => state.drive.files.find((x) => x.id === id))
    .filter((f): f is NonNullable<typeof f> => !!f)
  const btn = 'inline-flex h-8 items-center gap-1 rounded-[3px] border px-3 text-[13px] font-medium'

  return (
    <HubSpotChrome active="Deals">
      <SyncBanner />
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {/* Record header */}
        <div className="border-b border-hs-border bg-white px-6 pt-3 pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <p><Link to="/crm" className="text-hs-link hover:underline">Deals</Link> <span className="mx-1 text-[#7c98b6]">›</span> {deal.name}</p>
            <div className="flex items-center gap-1.5">
              <ActionMenu
                trigger={<span className={cn(btn, 'border-hs-border bg-white text-hs-text')}>Actions <ChevronDown size={13} /></span>}
                items={[
                  { label: 'Sync from Process Street', onClick: () => run((s) => syncHubSpot(s, 'HubSpot deal → Actions')) },
                  { label: 'View Zap 3 (Xero)', onClick: () => navigate('/zaps?zap=z3') },
                  { label: 'Open Drive folder', onClick: () => navigate(`/documents/${IDS.driveFolder}`) },
                  { label: 'Delete', disabled: true, danger: true },
                ]}
              />
              <button className={cn(btn, 'border-hs-border bg-white text-hs-text')} onClick={() => navigate('/workflow?step=1')}>Edit</button>
              {won ? (
                <button className={cn(btn, 'border-hs-link bg-hs-link text-white')} onClick={() => navigate('/accounting')}>{deal.xeroInvoice ? `View invoice ${deal.xeroInvoice}` : 'Create invoice'}</button>
              ) : (
                <button className={cn(btn, 'border-hs-orange bg-hs-orange text-white')} onClick={() => setPendingStage('Closed Won')}>Mark as won</button>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] leading-tight font-semibold text-hs-text">{deal.name}</h1>
            {won && <span className="rounded-[3px] bg-[#00bda5] px-2 py-0.5 text-xs font-semibold text-white">Closed Won</span>}
          </div>
          <p className="mt-1 text-[13px] text-[#516f90]">Amount: <b className="text-hs-text">{vt(deal.amount)}</b> <span className="mx-2">|</span> Close date: {date(deal.settlementDate)} <span className="mx-2">|</span> <span className="font-mono">{deal.id}</span></p>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[13px]">
            <label className="flex items-center gap-1.5">Pipeline: <select className="rounded-[3px] border border-hs-border bg-white px-1.5 py-0.5" disabled><option>{deal.pipeline}</option></select></label>
            <label className="flex items-center gap-1.5">Stage:
              <select value={deal.stage} onChange={(e) => setPendingStage(e.target.value as HubSpotDeal['stage'])} aria-label="Deal stage" className={cn('rounded-[3px] border px-1.5 py-0.5 font-medium', won ? 'border-[#00bda5] bg-[#e5f8f6] text-[#00826d]' : 'border-hs-border bg-white')}>
                {DEAL_STAGES.map((st) => <option key={st}>{st}</option>)}
              </select>
            </label>
            <span className="flex items-center gap-1.5">Owner: <span className="flex size-5 items-center justify-center rounded-full bg-hs-teal text-[9px] font-semibold text-white">SW</span>{deal.owner}</span>
          </div>
          <div className="mt-3 flex gap-6 text-[13px]">
            {(['Overview', 'Activities', 'Contacts', 'Companies', 'Deals', 'Attachments'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn('border-b-[3px] pb-2 font-medium', tab === t ? 'border-hs-link text-hs-text' : 'border-transparent text-hs-link')}>{t}{t === 'Attachments' ? ` (${files.length})` : ''}</button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {tab === 'Overview' && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <section className="rounded-[3px] border border-hs-border bg-white">
                  <h2 className="border-b border-hs-border px-4 py-3 text-sm font-semibold">About this deal</h2>
                  <dl className="grid gap-x-6 px-4 py-2 text-[13px] sm:grid-cols-2">
                    {([
                      ['Deal name', deal.name], ['Amount', vt(deal.amount)], ['Project', deal.project], ['Lot ID', deal.lotId], ['Buyer ID', deal.buyerId], ['Currency', deal.currency],
                      ['Deal stage', <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', won ? 'bg-[#e5f8f6] text-[#00a38d]' : 'bg-[#fef1e6] text-[#c25d00]')}>{deal.stage}</span>],
                      ['Owner', deal.owner], ['Settlement date', longDate(deal.settlementDate)], ['Deal key', <span className="font-mono">{deal.lotId}-{deal.buyerId}</span>],
                      ['Contract status', contract.signature === 'Signed' ? 'Signed' : contract.status === 'Approved' ? 'Approved — out for signature' : contract.status === 'Generated' ? 'Draft' : 'Not generated'],
                      ['Xero invoice', deal.xeroInvoice ?? '—'],
                    ] as [string, ReactNode][]).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[110px_1fr] gap-2 border-b border-[#eaf0f6] py-2 last:border-0"><dt className="text-[#516f90]">{k}</dt><dd className="text-hs-text">{v}</dd></div>
                    ))}
                  </dl>
                </section>
                <DuplicateCheckCard />
              </div>
              <div className="space-y-4">
                <section className="rounded-[3px] border border-hs-border bg-white">
                  <div className="flex items-center justify-between border-b border-hs-border px-4 py-3"><h2 className="text-sm font-semibold">Associated contact</h2><span className="text-xs text-hs-link">Edit</span></div>
                  {contact && (
                    <div className="flex items-start gap-3 p-4">
                      <span className="flex size-11 items-center justify-center rounded-full bg-[#4f81bd] text-sm font-semibold text-white">{initials(`${contact.firstName} ${contact.lastName}`)}</span>
                      <div className="min-w-0 flex-1 text-[13px]">
                        <Link to="/crm/contact" className="text-[15px] font-semibold text-hs-link hover:underline">{contact.firstName} {contact.lastName}</Link>
                        <p className="text-hs-link">{contact.email}</p>
                        <p className="text-[#516f90]">{contact.phone} · {contact.buyerId}</p>
                      </div>
                      <Link to="/crm/contact" className="rounded-[3px] border border-hs-link px-2.5 py-1 text-xs font-medium text-hs-link hover:bg-[#e5f5f8]">View contact</Link>
                    </div>
                  )}
                </section>
                <section className="rounded-[3px] border border-hs-border bg-white">
                  <div className="flex items-center justify-between border-b border-hs-border px-4 py-3"><h2 className="text-sm font-semibold">{won ? 'Deal activity' : 'Timeline'}</h2><button onClick={() => setTab('Activities')} className="rounded-[3px] border border-hs-border px-2 py-0.5 text-xs">Filter ▾</button></div>
                  <ol className="px-4 py-3">
                    {state.hubspot.timeline.slice(0, 7).map((t) => (
                      <li key={t.id} className="relative grid grid-cols-[14px_44px_1fr] gap-2 pb-2.5 text-[13px] last:pb-0">
                        <span className="mt-1.5 size-2 rounded-full bg-[#00bda5]" />
                        <span className="tabular-nums text-[#516f90]">{time(t.at)}</span>
                        <span>{t.title}{t.type === 'stage' && t.body ? <span className="block text-xs text-[#516f90]">{t.body}</span> : null}</span>
                      </li>
                    ))}
                  </ol>
                </section>
                <section className="rounded-[3px] border border-hs-border bg-white">
                  <h2 className="border-b border-hs-border px-4 py-3 text-sm font-semibold">Associated records</h2>
                  <ul className="divide-y divide-[#eaf0f6] text-[13px]">
                    <li className="flex justify-between px-4 py-2"><span>Documents (Google Drive)</span><span className="text-[#516f90]">{files.length ? `${files.length} files` : 'After Zap 2A'}</span></li>
                    <li className="flex justify-between px-4 py-2"><span>Invoice (Xero)</span>{state.xero.invoice ? <Link to="/accounting/invoice" className="text-hs-link">{state.xero.invoice.number} · {state.xero.invoice.status}</Link> : <span className="text-[#516f90]">After deal won</span>}</li>
                    <li className="flex justify-between px-4 py-2"><span>Process Street run</span><Link to="/workflow" className="font-mono text-hs-link">{IDS.processStreetRun}</Link></li>
                  </ul>
                </section>
              </div>
            </div>
          )}
          {tab === 'Activities' && (
            <div className="max-w-3xl space-y-3">
              <div className="rounded-[3px] border border-hs-border bg-white p-3">
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Start typing to leave a note…" className="w-full resize-none text-sm outline-none" />
                <div className="flex justify-end"><button disabled={!note.trim()} onClick={() => { run((s) => addHubSpotNote(s, note.trim())); setNote('') }} className="h-8 rounded-[3px] bg-hs-orange px-3 text-xs font-medium text-white disabled:opacity-40">Save note</button></div>
              </div>
              <Timeline filter="all" />
            </div>
          )}
          {tab === 'Contacts' && contact && <div className="max-w-md"><DealSummaryContact name={`${contact.firstName} ${contact.lastName}`} email={contact.email} /></div>}
          {tab === 'Attachments' && (
            <ul className="max-w-2xl divide-y divide-[#eaf0f6] rounded-[3px] border border-hs-border bg-white text-[13px]">
              {files.length === 0 && <li className="px-4 py-6 text-center text-[#516f90]">No attachments yet — Zap 2A files them when the contract is generated.</li>}
              {files.map((f) => <li key={f.id}><Link to={`/documents/${f.parentId}?file=${f.id}`} className="flex items-center gap-2 px-4 py-2.5 text-hs-link hover:bg-[#f5f8fa]"><FileText size={14} /> {f.name}</Link></li>)}
            </ul>
          )}
          {(tab === 'Companies' || tab === 'Deals') && <p className="py-8 text-center text-sm text-[#516f90]">No associated {tab.toLowerCase()}.</p>}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingStage}
        title={pendingStage === 'Closed Won' ? 'Mark this deal as won?' : `Move deal to “${pendingStage}”?`}
        confirmLabel={pendingStage === 'Closed Won' ? 'Mark as won' : 'Move deal'}
        confirmClassName="bg-hs-orange hover:bg-hs-orange hover:brightness-105"
        onCancel={() => setPendingStage(null)}
        onConfirm={() => { const st = pendingStage!; setPendingStage(null); run((s) => setDealStage(s, deal.id, st)) }}
      >
        {pendingStage === 'Closed Won'
          ? <>This triggers <b>Zap 3</b>. Its filter checks the contract is approved and signed before anything is created in Xero — marking the deal won alone does not create an invoice.</>
          : <>The stage change is logged on the timeline. Zaps listen for specific stages only (Closed Won → Zap 3).</>}
      </ConfirmDialog>
    </HubSpotChrome>
  )
}

function DealSummaryContact({ name, email }: { name: string; email: string }) {
  return (
    <Link to="/crm/contact" className="flex items-center gap-3 rounded-[3px] border border-hs-border bg-white p-4 hover:border-hs-teal">
      <span className="flex size-10 items-center justify-center rounded-full bg-[#4f81bd] text-sm font-semibold text-white">{initials(name)}</span>
      <span><span className="block font-semibold text-hs-link">{name}</span><span className="text-xs text-[#516f90]">{email} · Primary buyer</span></span>
    </Link>
  )
}

export function ContactRecord() {
  const { state } = useDemo()
  const contact = state.hubspot.contacts.find((c) => c.id === IDS.hubspotContact)!
  const deals = state.hubspot.deals.filter((d) => d.contactId === contact.id)
  const [tab, setTab] = useState<'About' | 'Activity' | 'Companies' | 'Deals' | 'Tickets'>('About')
  const name = `${contact.firstName} ${contact.lastName}`
  const lastContact = state.hubspot.timeline.find((t) => t.type !== 'integration')?.at ?? contact.updatedAt
  return (
    <HubSpotChrome active="Contacts">
      <SyncBanner />
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-4 text-sm">
          <p><Link to="/crm?view=contacts" className="text-hs-link hover:underline">Contacts</Link> <span className="mx-1 text-[#7c98b6]">›</span> {name}</p>
          <ActionMenu
            trigger={<span className="inline-flex items-center gap-1 rounded-[3px] border border-hs-border bg-white px-3 py-1 text-sm text-hs-text">Actions <ChevronDown size={13} /></span>}
            items={[{ label: 'View deal', onClick: () => window.location.assign('#/crm/deal') }, { label: 'Merge', disabled: true }, { label: 'Delete', disabled: true, danger: true }]}
          />
        </div>
        <div className="grid gap-5 px-6 py-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-[3px] border border-hs-border bg-white">
            <div className="flex flex-wrap items-start gap-4 px-6 pt-5 pb-4">
              <span className="flex size-16 items-center justify-center rounded-full bg-[#4f81bd] text-2xl font-semibold text-white">{initials(name)}</span>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold text-hs-text">{name}</h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-hs-link"><Mail size={13} /> {contact.email} <Copy size={11} className="text-[#7c98b6]" /></p>
                <p className="flex items-center gap-1.5 text-sm text-[#516f90]"><Phone size={13} /> {contact.phone}</p>
              </div>
            </div>
            <div className="border-b border-hs-border px-6 pb-4"><ActionIcons /></div>
            <div className="flex gap-6 border-b border-hs-border px-6 text-sm">
              {(['About', 'Activity', 'Companies', 'Deals', 'Tickets'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={cn('border-b-[3px] py-2.5 font-medium', tab === t ? 'border-hs-text text-hs-text' : 'border-transparent text-hs-link')}>{t}{t === 'Deals' ? ` (${deals.length})` : ''}</button>
              ))}
            </div>
            <div className="p-6">
              {tab === 'About' && (
                <div className="grid gap-x-8 sm:grid-cols-2">
                  {([
                    ['Email', contact.email], ['Phone', contact.phone], ['Country', contact.country], ['Lifecycle stage', contact.lifecycleStage],
                    ['Last contacted', dateTime(lastContact)], ['Buyer ID', contact.buyerId], ['Contact owner', contact.owner], ['Lead status', contact.leadStatus],
                    ['Record ID', contact.id], ['Create date', dateTime(contact.createdAt)],
                  ] as [string, string][]).map(([k, v]) => <PropRow key={k} label={k} value={v} mono={k === 'Buyer ID' || k === 'Record ID'} />)}
                </div>
              )}
              {tab === 'Activity' && <Timeline filter="all" />}
              {tab === 'Deals' && deals.map((d) => <DealSummary key={d.id} deal={d} />)}
              {(tab === 'Companies' || tab === 'Tickets') && <p className="py-6 text-center text-sm text-[#516f90]">No associated {tab.toLowerCase()}.</p>}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-[3px] border border-hs-border bg-white">
              <div className="flex items-center justify-between border-b border-hs-border px-4 py-3">
                <p className="flex items-center gap-1 text-sm font-semibold"><ChevronDown size={15} /> Deals ({deals.length})</p>
                <span className="inline-flex items-center gap-0.5 text-xs text-hs-link"><Plus size={12} /> Add</span>
              </div>
              <div className="p-4">{deals.map((d) => <DealSummary key={d.id} deal={d} />)}</div>
            </div>
          </aside>
          <div className="xl:col-span-1"><DuplicateCheckCard /></div>
        </div>
      </div>
    </HubSpotChrome>
  )
}

function DealSummary({ deal }: { deal: HubSpotDeal }) {
  return (
    <div className="rounded-[3px] border border-hs-border p-4">
      <Link to="/crm/deal" className="text-sm font-semibold text-hs-link hover:underline">{deal.name}</Link>
      <p className="mt-1 text-sm font-semibold">VUV {deal.amount.toLocaleString('en-US')}</p>
      <dl className="mt-2 space-y-1.5 text-xs">
        <div className="flex items-center gap-2"><dt className="w-20 text-[#516f90]">Stage</dt><dd><span className={cn('rounded-full px-2 py-0.5 font-medium', deal.stage === 'Closed Won' ? 'bg-[#e5f8f6] text-[#00a38d]' : 'bg-[#fef1e6] text-[#c25d00]')}>{deal.stage}</span></dd></div>
        <div className="flex gap-2"><dt className="w-20 text-[#516f90]">Close date</dt><dd>{date(deal.settlementDate)}</dd></div>
        <div className="flex gap-2"><dt className="w-20 text-[#516f90]">Pipeline</dt><dd>{deal.pipeline}</dd></div>
      </dl>
      <Link to="/crm/deal" className="mt-3 inline-block rounded-[3px] border border-hs-link px-3 py-1 text-xs font-medium text-hs-link hover:bg-[#e5f5f8]">View deal</Link>
    </div>
  )
}
