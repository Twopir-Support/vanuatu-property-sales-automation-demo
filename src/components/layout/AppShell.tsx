import {
  Activity,
  BookOpen,
  BrainCircuit,
  CheckSquare,
  ChevronDown,
  FileSignature,
  FlaskConical,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  Map,
  Network,
  PlayCircle,
  Presentation,
  Receipt,
  RotateCcw,
  Settings,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '../../lib/format'
import { useDemo } from '../../store/DemoStore'
import { Toaster } from '../ui/Toaster'
import { ConfirmDialog } from '../ui/overlays'
import { DemoGuide } from './DemoGuide'

type NavItem = { to: string; label: string; Icon: typeof Activity; sub?: string; end?: boolean }
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Demo pages', items: [
    { to: '/', label: 'Overview', sub: 'Demo control center', Icon: LayoutDashboard, end: true },
    { to: '/lots', label: 'Lot Sales', Icon: Map },
  ] },
  { group: 'Product screens (simulated)', items: [
    { to: '/workflow', label: 'Process Street', sub: 'Workflow run', Icon: CheckSquare },
    { to: '/crm/deal', label: 'HubSpot', sub: 'Deal record', Icon: Users },
    { to: '/contracts', label: 'Contracts', sub: 'Generate · approval', Icon: FileSignature },
    { to: '/documents/GD-FLD-LOT025', label: 'Google Drive', sub: 'Transaction folder', Icon: FolderOpen },
    { to: '/zaps', label: 'Zapier', sub: 'Zaps', Icon: Zap },
    { to: '/accounting', label: 'Xero', sub: 'Invoices', Icon: Receipt },
  ] },
  { group: 'Operations & delivery', items: [
    { to: '/monitor', label: 'Automation Monitor', Icon: Activity },
    { to: '/design', label: 'Integration Design', Icon: Network },
    { to: '/testing', label: 'Testing & Go-live', Icon: FlaskConical },
    { to: '/docs', label: 'Documentation', Icon: BookOpen },
  ] },
  { group: 'Later phase', items: [
    { to: '/bills', label: 'Supplier Bills', sub: 'Shared inboxes → Xero', Icon: Inbox },
    { to: '/roadmap', label: 'AI Automation Roadmap', Icon: BrainCircuit },
    { to: '/settings', label: 'Settings', Icon: Settings },
  ] },
]

/** Demo-only page switcher. There is no demo sidebar: every screen is shown full width, like the real apps. */
function AppSwitcher({ failures }: { failures: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname, loc.search])
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="inline-flex items-center gap-1 rounded bg-amber-950/90 px-2 py-0.5 text-[11px] font-semibold tracking-normal text-amber-50 hover:bg-amber-950">
        Switch app <ChevronDown size={12} />
        {failures > 0 && <span className="ml-0.5 rounded-full bg-rose-500 px-1 text-[9px]">{failures}</span>}
      </button>
      {open && (
        <div role="menu" className="scroll-thin absolute top-full left-0 mt-1.5 max-h-[80vh] w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1.5 text-left tracking-normal text-slate-700 shadow-xl">
          {NAV.map((section) => (
            <div key={section.group} className="pb-1">
              <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">{section.group}</p>
              {section.items.map(({ to, label, sub, Icon, end }) => (
                <NavLink key={to} to={to} end={end} role="menuitem" className={({ isActive }) => cn('flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-normal', isActive ? 'bg-brand-50 text-brand-900' : 'hover:bg-slate-50')}>
                  <Icon size={15} className="shrink-0 text-slate-500" />
                  <span className="flex-1">{label}{sub && <span className="text-slate-400"> · {sub}</span>}</span>
                  {to === '/monitor' && failures > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">{failures}</span>}
                </NavLink>
              ))}
            </div>
          ))}
          <p className="border-t border-slate-100 px-3 pt-2 pb-1 text-[10px] leading-snug text-slate-400">Demo navigation only — not part of any product. Concept demo, not affiliated with or endorsed by Process Street, HubSpot, Xero, Zapier or Google.</p>
        </div>
      )}
    </div>
  )
}

export function DemoBanner() {
  const { state, reset, interviewMode, setInterviewMode, guideOpen, setGuideOpen } = useDemo()
  const [confirmReset, setConfirmReset] = useState(false)
  // Failures still awaiting a successful retry (a retried key is recorded in processedKeys).
  const failures = state.events.filter((e) => e.status === 'failed' && !state.processedKeys.includes(e.idempotencyKey)).length
  const ctl = 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-normal hover:bg-amber-500/60'
  return (
    <div className="relative z-[70] flex min-h-7 shrink-0 items-center justify-center gap-2 bg-amber-400 px-3 py-1 text-center text-[10px] font-semibold tracking-wider text-amber-950 sm:text-[11px]" role="note">
      <div className="absolute top-1/2 left-2 -translate-y-1/2"><AppSwitcher failures={failures} /></div>
      <ShieldAlert size={13} />
      <span className="hidden sm:inline">DEMO ENVIRONMENT · SYNTHETIC DATA · SIMULATED INTEGRATIONS</span>
      <span className="sm:hidden">DEMO · SYNTHETIC DATA</span>
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5">
        <button onClick={() => setGuideOpen(!guideOpen)} className={cn(ctl, guideOpen && 'bg-amber-500/60')} title="Guided end-to-end demo"><PlayCircle size={12} /> Guide</button>
        <button onClick={() => { setInterviewMode(!interviewMode); if (!interviewMode) setGuideOpen(true) }} className={cn(ctl, interviewMode && 'bg-amber-500/60')} title="Interview Demo Mode"><Presentation size={12} /> Interview{interviewMode ? ' · on' : ''}</button>
        {!interviewMode && <button onClick={() => setConfirmReset(true)} className={ctl} aria-label="Reset demo scenario" title="Reset demo scenario"><RotateCcw size={12} /></button>}
      </div>
      <ConfirmDialog open={confirmReset} title="Reset the demo scenario?" confirmLabel="Reset demo" tone="danger" onCancel={() => setConfirmReset(false)} onConfirm={() => { setConfirmReset(false); reset() }}>
        All synthetic records return to the starting point: steps 1–5 complete, deal in Contract Approval, no contract, no Drive folder, no Xero invoice. Nothing outside this browser is affected.
      </ConfirmDialog>
    </div>
  )
}

export function AppShell() {
  const { interviewMode, guideOpen } = useDemo()
  useEffect(() => {
    // Interview Demo Mode: fixed laptop layout and dev-only controls hidden (see index.css).
    if (interviewMode) document.documentElement.dataset.interview = 'on'
    else delete document.documentElement.dataset.interview
  }, [interviewMode])
  const loc = useLocation()
  const productView = /^\/(workflow|crm|documents|accounting|zaps|bills)/.test(loc.pathname)

  return (
    <div className="flex h-full flex-col">
      <DemoBanner />
      <main className={cn('min-h-0 flex-1', productView ? 'flex flex-col overflow-hidden' : 'scroll-thin overflow-y-auto', guideOpen && !productView && 'pb-28', guideOpen && productView && 'pb-[88px]')}>
        <Outlet />
      </main>
      <DemoGuide />
      <Toaster />
    </div>
  )
}
