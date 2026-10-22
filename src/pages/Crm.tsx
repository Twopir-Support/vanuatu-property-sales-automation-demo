import {
  AlertTriangle,
  Bell,
  BarChart3,
  Bookmark,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Filter,
  Handshake,
  Headphones,
  LayoutGrid,
  List,
  Mail,
  Megaphone,
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
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { ProductFrame } from '../components/ui/ProductFrame'
import { ActionMenu, ConfirmDialog } from '../components/ui/overlays'
import { IDS } from '../data/ids'
import { DEAL_STAGES, type HubSpotDeal, type HubSpotTimelineItem } from '../data/types'
import { cn, date, dateTime, initials, longDate, vt } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { addHubSpotNote, createHubSpotContact, findDuplicateContact, hubspotHasPendingChanges, setDealStage, syncHubSpot } from '../store/engine'

/* ------------------------------------------------------------------ */
/* Chrome                                                               */
/* ------------------------------------------------------------------ */

function HubSpotChrome({ children }: { children: ReactNode }) {
  const rail = [
    { Icon: Bookmark, label: 'Bookmarks' },
    { Icon: Users, label: 'CRM', active: true },
    { Icon: Megaphone, label: 'Marketing' },
    { Icon: Handshake, label: 'Sales' },
    { Icon: Headphones, label: 'Service' },
    { Icon: Zap, label: 'Automation' },
    { Icon: BarChart3, label: 'Reporting' },
  ]
  return (
    <ProductFrame product="HubSpot">
      <div className="flex min-h-0 flex-1 flex-col bg-hs-bg text-hs-text" style={{ fontFamily: "'Lexend Deca', Inter, sans-serif" }}>
        <div className="flex h-11 shrink-0 items-center gap-3 bg-hs-nav px-3 text-white">
          <span className="flex size-7 items-center justify-center rounded-full bg-hs-orange text-xs font-bold" title="CRM (simulated)">CRM</span>
          <div className="mx-auto flex h-7 w-full max-w-md items-center gap-2 rounded-sm bg-white/10 px-2.5 text-xs text-white/70">
            <Search size={13} /> Search HubSpot (simulated)
          </div>
          <Bell size={16} className="text-white/70" />
          <Settings size={16} className="text-white/70" />
          <span className="flex size-7 items-center justify-center rounded-full bg-hs-teal text-[10px] font-semibold">SW</span>
          <span className="hidden text-xs text-white/80 md:inline">Pacific Horizon (demo portal)</span>
        </div>
        <div className="flex min-h-0 flex-1">
          <nav className="hidden w-12 shrink-0 flex-col items-center gap-1 bg-hs-nav pt-2 sm:flex">
            {rail.map(({ Icon, label, active }) => (
              <span key={label} title={label} className={cn('flex size-9 items-center justify-center rounded', active ? 'bg-white/15 text-white' : 'text-white/55')}>
                <Icon size={17} />
              </span>
            ))}
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
    <HubSpotChrome>
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

function Collapsible({ title, children, defaultOpen = true, actions }: { title: string; children: ReactNode; defaultOpen?: boolean; actions?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-t border-hs-border">
      <div className="flex items-center gap-1 px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-1 text-left text-sm font-semibold">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />} {title}
        </button>
        {actions}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  )
}

function Prop({ label, value, mono, highlight }: { label: string; value: ReactNode; mono?: boolean; highlight?: boolean }) {
  return (
    <div className={cn('group -mx-2 rounded px-2 py-1.5 hover:bg-[#f5f8fa]', highlight && 'animate-flash')}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn('flex items-center justify-between text-sm', mono && 'font-mono text-[13px]')}>
        <span>{value || '—'}</span>
        <Pencil size={12} className="text-hs-link opacity-0 group-hover:opacity-100" />
      </p>
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

function RecordLayout({ left, middle, right }: { left: ReactNode; middle: ReactNode; right: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      <aside className="scroll-thin w-80 shrink-0 overflow-y-auto border-r border-hs-border bg-white">{left}</aside>
      <section className="scroll-thin min-w-0 flex-1 overflow-y-auto">{middle}</section>
      <aside className="scroll-thin hidden w-80 shrink-0 overflow-y-auto border-l border-hs-border bg-white xl:block">{right}</aside>
    </div>
  )
}

function MiddleTabs({ overview }: { overview: ReactNode }) {
  const { run } = useDemo()
  const [tab, setTab] = useState<'overview' | 'activities'>('overview')
  const [filter, setFilter] = useState<'all' | HubSpotTimelineItem['type']>('all')
  const [note, setNote] = useState('')
  return (
    <div>
      <div className="flex gap-6 border-b border-hs-border bg-white px-6 pt-3">
        {(['overview', 'activities'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('border-b-[3px] pb-2.5 text-sm font-medium capitalize', tab === t ? 'border-hs-text' : 'border-transparent text-hs-link')}>{t}</button>
        ))}
      </div>
      <div className="space-y-4 p-6">
        {tab === 'overview' ? (
          <>
            {overview}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Recent activities</h3>
                <button onClick={() => setTab('activities')} className="text-xs text-hs-link hover:underline">View all</button>
              </div>
              <Timeline filter="all" />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'integration', 'note', 'email', 'call', 'task', 'stage'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn('rounded-full border px-3 py-1 text-xs capitalize', filter === f ? 'border-hs-text bg-hs-text text-white' : 'border-hs-border bg-white')}>{f === 'all' ? 'Activity' : f}</button>
              ))}
            </div>
            <div className="rounded-sm border border-hs-border bg-white p-3">
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Start typing to leave a note…" className="w-full resize-none text-sm outline-none" />
              <div className="flex justify-end">
                <button disabled={!note.trim()} onClick={() => { run((s) => addHubSpotNote(s, note.trim())); setNote('') }} className="h-8 rounded-sm bg-hs-orange px-3 text-xs font-medium text-white disabled:opacity-40">Save note</button>
              </div>
            </div>
            <Timeline filter={filter} />
          </>
        )}
      </div>
    </div>
  )
}

function AssocCard({ title, count, children, onAdd }: { title: string; count: number; children?: ReactNode; onAdd?: boolean }) {
  return (
    <section className="border-b border-hs-border">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="flex items-center gap-1 text-sm font-semibold"><ChevronDown size={15} /> {title} ({count})</p>
        {onAdd !== false && <span className="inline-flex items-center gap-0.5 text-xs text-hs-link"><Plus size={12} /> Add</span>}
      </div>
      <div className="px-4 pb-4">{children ?? <p className="text-xs text-slate-500">No associated objects of this type exist.</p>}</div>
    </section>
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
  const deal = state.hubspot.deals.find((d) => d.id === IDS.hubspotDeal)!
  const contact = state.hubspot.contacts.find((c) => c.id === deal.contactId)
  const contract = state.contract
  const stageIdx = DEAL_STAGES.indexOf(deal.stage)
  const [pendingStage, setPendingStage] = useState<HubSpotDeal['stage'] | null>(null)
  const files = ['gd-f-passport', 'gd-f-address', 'gd-f-application', contract.driveFileId, contract.approvedFileId, contract.signedFileId]
    .map((id) => state.drive.files.find((x) => x.id === id))
    .filter((f): f is NonNullable<typeof f> => !!f)
  const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => undefined)

  return (
    <HubSpotChrome>
      <SyncBanner />
      {/* Record header */}
      <div className="shrink-0 border-b border-hs-border bg-white px-6 pt-3 pb-3">
        <div className="mb-2 flex items-center justify-between text-sm">
          <NavLink to="/crm?view=deals" className="inline-flex items-center gap-0.5 text-hs-link hover:underline"><ChevronLeft size={15} /> Deals</NavLink>
          <div className="flex items-center gap-2">
            <button onClick={() => copy(deal.id)} className="inline-flex items-center gap-1 font-mono text-xs text-[#516f90] hover:text-hs-link"><Copy size={11} /> {deal.id}</button>
            <ActionMenu
              trigger={<span className="inline-flex items-center gap-1 rounded-[3px] border border-hs-border px-3 py-1 text-sm text-hs-text">Actions <ChevronDown size={13} /></span>}
              items={[
                { label: 'Sync from Process Street', onClick: () => run((s) => syncHubSpot(s, 'HubSpot deal → Actions')) },
                { label: 'View Zap 3 (Xero)', onClick: () => window.location.assign('#/zaps?zap=z3') },
                { label: 'Open Drive folder', onClick: () => window.location.assign(`#/documents/${IDS.driveFolder}`) },
                { label: 'Delete', disabled: true, danger: true },
              ]}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[3px] bg-[#ffebe6] text-hs-orange"><Handshake size={20} /></span>
            <div>
              <h1 className="text-[22px] leading-tight font-semibold text-hs-text">{deal.name}</h1>
              <p className="text-xs text-[#516f90]">Lot Sales pipeline · created {dateTime(deal.createdAt)}</p>
            </div>
          </div>
          <dl className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div><dt className="text-xs text-[#516f90]">Amount</dt><dd className="font-semibold">{vt(deal.amount)}</dd></div>
            <div><dt className="text-xs text-[#516f90]">Close date</dt><dd>{longDate(deal.settlementDate)}</dd></div>
            <div><dt className="text-xs text-[#516f90]">Deal owner</dt><dd className="flex items-center gap-1.5"><span className="flex size-5 items-center justify-center rounded-full bg-hs-teal text-[9px] font-semibold text-white">SW</span>{deal.owner}</dd></div>
            <div>
              <dt className="text-xs text-[#516f90]">Deal stage</dt>
              <dd>
                <select value={deal.stage} onChange={(e) => setPendingStage(e.target.value as HubSpotDeal['stage'])} className="rounded-[3px] border border-hs-border bg-[#f5f8fa] px-2 py-1 text-sm font-semibold text-hs-text" aria-label="Deal stage">
                  {DEAL_STAGES.map((st) => <option key={st}>{st}</option>)}
                </select>
              </dd>
            </div>
          </dl>
        </div>
        <div className="mt-3 flex gap-1">
          {DEAL_STAGES.map((st, i) => (
            <div key={st} className="flex-1" title={st}>
              <div className={cn('h-1.5 rounded-full', i <= stageIdx ? 'bg-[#00bda5]' : 'bg-[#eaf0f6]')} />
              <p className={cn('mt-1 hidden truncate text-[10px] md:block', i === stageIdx ? 'font-semibold text-hs-text' : 'text-[#7c98b6]')}>{st}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <section className="scroll-thin min-w-0 flex-1 overflow-y-auto">
          <MiddleTabs
            overview={
              <>
                <div className="rounded-[3px] border border-hs-border bg-white">
                  <div className="flex items-center justify-between border-b border-hs-border px-4 py-2.5"><p className="text-sm font-semibold">Data highlights</p><ActionIcons compact /></div>
                  <div className="grid grid-cols-2 gap-4 p-4 text-xs md:grid-cols-4">
                    <div><p className="font-semibold text-[#516f90] uppercase">Create date</p><p className="text-sm">{dateTime(deal.createdAt)}</p></div>
                    <div><p className="font-semibold text-[#516f90] uppercase">Deal stage</p><p className="text-sm">{deal.stage}</p></div>
                    <div><p className="font-semibold text-[#516f90] uppercase">Last activity</p><p className="text-sm">{dateTime(state.hubspot.timeline[0]?.at ?? deal.updatedAt)}</p></div>
                    <div><p className="font-semibold text-[#516f90] uppercase">Xero invoice</p><p className="text-sm">{deal.xeroInvoice ?? '—'}</p></div>
                  </div>
                </div>
                <DuplicateCheckCard />
                <div className="grid gap-4 lg:grid-cols-3">
                  <AssocTile title="Contact" count={contact ? 1 : 0}>
                    {contact && (
                      <Link to="/crm/contact" className="flex items-center gap-2.5 hover:underline">
                        <span className="flex size-8 items-center justify-center rounded-full bg-[#eaf0f6] text-xs font-semibold">{initials(`${contact.firstName} ${contact.lastName}`)}</span>
                        <span className="min-w-0"><span className="block text-sm font-semibold text-hs-link">{contact.firstName} {contact.lastName}</span><span className="block truncate text-xs text-[#516f90]">{contact.email}</span></span>
                      </Link>
                    )}
                  </AssocTile>
                  <AssocTile title="Documents" count={files.length}>
                    {files.length ? (
                      <ul className="space-y-1 text-xs">{files.slice(0, 4).map((f) => <li key={f.id}><Link to={`/documents/${f.parentId}?file=${f.id}`} className="flex items-center gap-1.5 text-hs-link hover:underline"><FileText size={12} /><span className="truncate">{f.name}</span></Link></li>)}</ul>
                    ) : <p className="text-xs text-[#516f90]">Filed to Google Drive by Zap 2A at step 6.</p>}
                  </AssocTile>
                  <AssocTile title="Invoice" count={state.xero.invoice ? 1 : 0}>
                    {state.xero.invoice ? (
                      <Link to="/accounting/invoice" className="block text-sm hover:underline"><span className="font-semibold text-hs-link">{state.xero.invoice.number}</span> · <span className="text-xs">{state.xero.invoice.status} (Xero, simulated)</span></Link>
                    ) : <p className="text-xs text-[#516f90]">Zap 3 creates a Xero draft once the deal is Closed Won and the contract is signed.</p>}
                  </AssocTile>
                </div>
              </>
            }
          />
        </section>

        <aside className="scroll-thin hidden w-[320px] shrink-0 overflow-y-auto border-l border-hs-border bg-white lg:block">
          <Collapsible title="About this deal" actions={<span className="text-xs text-hs-link">Actions ▾</span>}>
            <PropRow label="Project" value={deal.project} />
            <PropRow label="Lot ID" value={deal.lotId} mono />
            <PropRow label="Buyer ID" value={deal.buyerId} mono />
            <PropRow label="Sale price" value={vt(deal.amount)} />
            <PropRow label="Currency" value={deal.currency} />
            <PropRow label="Settlement date" value={longDate(deal.settlementDate)} />
            <PropRow label="Sales representative" value={deal.owner} />
            <PropRow label="Pipeline" value={deal.pipeline} />
            <PropRow label="Deal key" value={`${deal.lotId}-${deal.buyerId}`} mono />
            <PropRow label="Contract status" value={contract.signature === 'Signed' ? 'Signed' : contract.status === 'Approved' ? 'Approved — out for signature' : contract.status === 'Generated' ? 'Draft' : 'Not generated'} />
            <PropRow label="Xero invoice number" value={deal.xeroInvoice ?? ''} mono />
            <PropRow label="Last modified date" value={dateTime(deal.updatedAt)} />
          </Collapsible>
          <Collapsible title="Integration references" defaultOpen={false}>
            <PropRow label="Process Street run" value={<Link className="text-hs-link" to="/workflow">{IDS.processStreetRun}</Link>} mono />
            <PropRow label="Transaction ID" value={IDS.transaction} mono />
            <PropRow label="Google Drive folder" value={<Link className="text-hs-link" to={`/documents/${IDS.driveFolder}`}>{IDS.driveFolder}</Link>} mono />
            <PropRow label="Contract" value={<Link className="text-hs-link" to="/contracts">{IDS.contract}</Link>} mono />
          </Collapsible>
          <AssocCard title="Contacts" count={contact ? 1 : 0}>
            {contact && (
              <Link to="/crm/contact" className="block rounded-[3px] border border-hs-border p-3 hover:border-hs-teal">
                <p className="text-sm font-semibold text-hs-link">{contact.firstName} {contact.lastName}</p>
                <p className="truncate text-xs">{contact.email} · {contact.phone}</p>
                <p className="mt-1 text-[11px] text-[#516f90]">Primary · Buyer · {contact.id}</p>
              </Link>
            )}
          </AssocCard>
          <AssocCard title="Companies" count={0} />
        </aside>
      </div>

      <ConfirmDialog
        open={!!pendingStage}
        title={`Move deal to “${pendingStage}”?`}
        confirmLabel="Move deal"
        confirmClassName="bg-hs-orange hover:bg-hs-orange hover:brightness-105"
        onCancel={() => setPendingStage(null)}
        onConfirm={() => { const st = pendingStage!; setPendingStage(null); run((s) => setDealStage(s, deal.id, st)) }}
      >
        {pendingStage === 'Closed Won'
          ? <>This triggers <b>Zap 3</b>. Its filter checks the contract is approved and signed before anything is created in Xero — moving the stage alone does not create an invoice.</>
          : <>The stage change is logged on the timeline. Zaps listen for specific stages only (Closed Won → Zap 3).</>}
      </ConfirmDialog>
    </HubSpotChrome>
  )
}

function AssocTile({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div className="rounded-[3px] border border-hs-border bg-white">
      <p className="border-b border-hs-border px-3 py-2 text-[13px] font-semibold">{title} <span className="font-normal text-[#516f90]">({count})</span></p>
      <div className="p-3">{children}</div>
    </div>
  )
}

export function ContactRecord() {
  const { state } = useDemo()
  const contact = state.hubspot.contacts.find((c) => c.id === IDS.hubspotContact)!
  const deals = state.hubspot.deals.filter((d) => d.contactId === contact.id)
  return (
    <HubSpotChrome>
      <SyncBanner />
      <RecordLayout
        left={
          <div>
            <div className="flex items-center justify-between px-4 pt-3 text-sm">
              <NavLink to="/crm?view=contacts" className="inline-flex items-center gap-0.5 text-hs-link hover:underline"><ChevronLeft size={15} /> Contacts</NavLink>
              <span className="inline-flex items-center gap-0.5 text-hs-link">Actions <ChevronDown size={14} /></span>
            </div>
            <div className="flex flex-col items-center px-4 pt-4 pb-4 text-center">
              <span className="mb-2 flex size-16 items-center justify-center rounded-full bg-[#eaf0f6] text-lg font-semibold">{initials(`${contact.firstName} ${contact.lastName}`)}</span>
              <h1 className="text-xl font-semibold">{contact.firstName} {contact.lastName}</h1>
              <p className="text-sm">Buyer · {state.transaction.project}</p>
              <p className="inline-flex items-center gap-1 text-sm text-hs-link">{contact.email} <Copy size={11} /></p>
            </div>
            <div className="pb-4"><ActionIcons /></div>
            <Collapsible title="About this contact">
              <Prop label="Email" value={contact.email} />
              <Prop label="Phone number" value={contact.phone} />
              <Prop label="Contact owner" value={contact.owner} />
              <Prop label="Buyer ID" value={contact.buyerId} mono />
              <Prop label="Lifecycle stage" value={contact.lifecycleStage} />
              <Prop label="Lead status" value={contact.leadStatus} />
              <Prop label="Country/Region" value={contact.country} />
              <Prop label="Create date" value={dateTime(contact.createdAt)} />
              <Prop label="Last modified date" value={dateTime(contact.updatedAt)} />
            </Collapsible>
          </div>
        }
        middle={<MiddleTabs overview={<DuplicateCheckCard />} />}
        right={
          <div>
            <AssocCard title="Companies" count={0} />
            <AssocCard title="Deals" count={deals.length}>
              {deals.map((d) => (
                <Link key={d.id} to="/crm/deal" className="block rounded-sm border border-hs-border p-3 hover:border-hs-teal">
                  <p className="text-sm font-semibold text-hs-link">{d.name}</p>
                  <p className="text-xs">Amount: {vt(d.amount)}</p>
                  <p className="text-xs">Close date: {date(d.settlementDate)}</p>
                  <p className="text-xs">Stage: {d.stage}</p>
                </Link>
              ))}
            </AssocCard>
            <AssocCard title="Tickets" count={0} />
          </div>
        }
      />
    </HubSpotChrome>
  )
}
