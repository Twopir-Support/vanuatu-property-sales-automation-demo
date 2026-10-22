import {
  Activity,
  PlayCircle,
  Presentation,
  BookOpen,
  FlaskConical,
  Inbox,
  Network,
  Zap,
  BrainCircuit,
  CheckSquare,
  FileSignature,
  FolderOpen,
  LayoutDashboard,
  Map,
  Menu,
  Receipt,
  RotateCcw,
  Settings,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { COMPANY } from '../../data/ids'
import { cn } from '../../lib/format'
import { useDemo } from '../../store/DemoStore'
import { hubspotHasPendingChanges } from '../../store/engine'
import { Toaster } from '../ui/Toaster'
import { ConfirmDialog } from '../ui/overlays'
import { DemoGuide } from './DemoGuide'

type NavItem = { to: string; label: string; Icon: typeof Activity; sub?: string; end?: boolean }
const NAV: { group?: string; items: NavItem[] }[] = [
  { items: [
    { to: '/', label: 'Overview', Icon: LayoutDashboard, end: true },
    { to: '/lots', label: 'Lot Sales', Icon: Map },
  ] },
  { group: 'Sales systems', items: [
    { to: '/workflow', label: 'Workflow', sub: 'Process Street', Icon: CheckSquare },
    { to: '/crm', label: 'CRM', sub: 'HubSpot', Icon: Users },
    { to: '/contracts', label: 'Contracts', sub: 'Template · review · e-signature', Icon: FileSignature },
    { to: '/documents', label: 'Documents', sub: 'Google Drive', Icon: FolderOpen },
    { to: '/accounting', label: 'Accounting', sub: 'Xero', Icon: Receipt },
  ] },
  { group: 'Zapier automation', items: [
    { to: '/zaps', label: 'Zaps', sub: 'Flows 1 · 2 · 3', Icon: Zap },
    { to: '/monitor', label: 'Automation Monitor', Icon: Activity },
    { to: '/design', label: 'Integration Design', Icon: Network },
  ] },
  { group: 'Delivery', items: [
    { to: '/testing', label: 'Testing & Go-live', Icon: FlaskConical },
    { to: '/docs', label: 'Documentation', Icon: BookOpen },
  ] },
  { group: 'Later phase', items: [
    { to: '/bills', label: 'Supplier Bills', sub: 'Shared inboxes → Xero', Icon: Inbox },
    { to: '/roadmap', label: 'AI Automation Roadmap', Icon: BrainCircuit },
  ] },
  { items: [{ to: '/settings', label: 'Settings', Icon: Settings }] },
]

export function DemoBanner() {
  return (
    <div className="relative z-[70] flex min-h-7 shrink-0 items-center justify-center gap-2 bg-amber-400 px-3 py-1 text-center text-[10px] font-semibold tracking-wider text-amber-950 sm:text-[11px]" role="note">
      <ShieldAlert size={13} />
      DEMO ENVIRONMENT · SYNTHETIC DATA · SIMULATED INTEGRATIONS
    </div>
  )
}

export function AppShell() {
  const { state, reset, interviewMode, setInterviewMode, guideOpen, setGuideOpen } = useDemo()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    // Interview Demo Mode: fixed laptop layout and dev-only controls hidden (see index.css).
    if (interviewMode) document.documentElement.dataset.interview = 'on'
    else delete document.documentElement.dataset.interview
  }, [interviewMode])
  const loc = useLocation()
  const productView = /^\/(workflow|crm|documents|accounting|zaps|bills)/.test(loc.pathname)
  // Failures still awaiting a successful retry (a retried key is recorded in processedKeys).
  const failures = state.events.filter((e) => e.status === 'failed' && !state.processedKeys.includes(e.idempotencyKey)).length
  const pendingSync = hubspotHasPendingChanges(state)

  const sidebar = (
    <nav className="flex h-full w-60 flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <img src="./favicon.svg" alt="" className="size-8" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Property Sales Automation</p>
          <p className="text-[11px] text-slate-400">{COMPANY.name} · {COMPANY.development}</p>
        </div>
      </div>
      <div className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-2">
        {NAV.map((section, si) => (
          <div key={si} className={cn(si > 0 && 'mt-2')}>
            {section.group && <p className="px-2.5 pb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{section.group}</p>}
            {section.items.map(({ to, label, Icon, end, sub }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn('flex items-center gap-2.5 rounded-md px-2.5 py-[5px] text-sm transition-colors', isActive ? 'bg-brand-700 text-white' : 'hover:bg-slate-800 hover:text-white')
                }
              >
                <Icon size={17} className="shrink-0" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate">{label}</span>
                  {sub && <span className="block truncate text-[11px] opacity-70">{sub}</span>}
                </span>
                {to === '/monitor' && failures > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">{failures}</span>}
                {to === '/crm' && pendingSync && <span className="size-2 rounded-full bg-amber-400" title="HubSpot has unsynced changes" />}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-slate-800 px-2 py-2">
        <div className="flex gap-1">
          <button onClick={() => setGuideOpen(!guideOpen)} title="Guided end-to-end demo" className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] hover:bg-slate-800 hover:text-white', guideOpen ? 'bg-slate-800 text-teal-300' : 'text-slate-300')}>
            <PlayCircle size={13} /> Guide
          </button>
          <button onClick={() => { setInterviewMode(!interviewMode); if (!interviewMode) setGuideOpen(true) }} title="Interview Demo Mode" className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] hover:bg-slate-800 hover:text-white', interviewMode ? 'bg-slate-800 text-teal-300' : 'text-slate-300')}>
            <Presentation size={13} /> Interview{interviewMode ? ' · on' : ''}
          </button>
          {!interviewMode && (
            <button onClick={() => setConfirmReset(true)} title="Reset demo scenario" aria-label="Reset demo scenario" className="flex items-center justify-center rounded-md px-2 py-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
              <RotateCcw size={13} />
            </button>
          )}
        </div>
        <p className="px-1.5 pt-1 text-[10px] leading-snug text-slate-500">Concept demo · not affiliated with Process Street, HubSpot, Xero, Zapier or Google.</p>
      </div>
    </nav>
  )

  return (
    <div className="flex h-full flex-col">
      <DemoBanner />
      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:block">{sidebar}</div>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
            <div className="absolute inset-y-0 left-0">{sidebar}</div>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-11 items-center gap-2 border-b border-slate-200 bg-white px-3 lg:hidden">
            <button onClick={() => setMobileOpen((o) => !o)} className="rounded p-1.5 hover:bg-slate-100" aria-label="Menu">
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="text-sm font-semibold">Property Sales Automation</span>
          </div>
          <main className={cn('min-h-0 flex-1', productView ? 'flex flex-col overflow-hidden' : 'scroll-thin overflow-y-auto', guideOpen && !productView && 'pb-28', guideOpen && productView && 'pb-[88px]')}>
            <Outlet />
          </main>
        </div>
      </div>
      <DemoGuide />
      <Toaster />
      <ConfirmDialog open={confirmReset} title="Reset the demo scenario?" confirmLabel="Reset demo" tone="danger" onCancel={() => setConfirmReset(false)} onConfirm={() => { setConfirmReset(false); reset() }}>
        All synthetic records return to the starting point: steps 1–5 complete, deal in Contract Approval, no contract, no Drive folder, no Xero invoice. Nothing outside this browser is affected.
      </ConfirmDialog>
    </div>
  )
}
