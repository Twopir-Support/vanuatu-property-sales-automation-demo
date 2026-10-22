import {
  Activity,
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
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { COMPANY } from '../../data/ids'
import { cn } from '../../lib/format'
import { useDemo } from '../../store/DemoStore'
import { hubspotHasPendingChanges } from '../../store/engine'
import { Toaster } from '../ui/Toaster'

const NAV = [
  { to: '/', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/lots', label: 'Lot Sales', Icon: Map },
  { to: '/workflow', label: 'Workflow', Icon: CheckSquare, hint: 'Process Street' },
  { to: '/crm', label: 'CRM', Icon: Users, hint: 'HubSpot' },
  { to: '/contracts', label: 'Contracts', Icon: FileSignature },
  { to: '/documents', label: 'Documents', Icon: FolderOpen, hint: 'Google Drive' },
  { to: '/accounting', label: 'Accounting', Icon: Receipt, hint: 'Xero' },
  { to: '/monitor', label: 'Automation Monitor', Icon: Activity },
  { to: '/roadmap', label: 'AI Automation Roadmap', Icon: BrainCircuit },
  { to: '/settings', label: 'Settings', Icon: Settings },
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
  const { state, reset } = useDemo()
  const [mobileOpen, setMobileOpen] = useState(false)
  const loc = useLocation()
  const productView = /^\/(workflow|crm|documents|accounting)/.test(loc.pathname)
  // Failures still awaiting a successful retry (a retried key is recorded in processedKeys).
  const failures = state.events.filter((e) => e.status === 'failed' && !state.processedKeys.includes(e.idempotencyKey)).length
  const pendingSync = hubspotHasPendingChanges(state)

  const sidebar = (
    <nav className="flex h-full w-60 flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <img src="./favicon.svg" alt="" className="size-8" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Property Sales Automation</p>
          <p className="text-[11px] text-slate-400">{COMPANY.name}</p>
        </div>
      </div>
      <div className="mx-3 mb-3 rounded-md bg-slate-800/70 px-3 py-2 text-[11px] text-slate-400">
        <span className="text-slate-200">{COMPANY.development}</span>
        <br />
        {COMPANY.location}
      </div>
      <div className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-2">
        {NAV.map(({ to, label, Icon, end, hint }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                isActive ? 'bg-brand-700 text-white' : 'hover:bg-slate-800 hover:text-white',
              )
            }
          >
            <Icon size={17} className="shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {to === '/monitor' && failures > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">{failures}</span>}
            {to === '/crm' && pendingSync && <span className="size-2 rounded-full bg-amber-400" title="HubSpot has unsynced changes" />}
            {hint && <span className="hidden text-[10px] text-slate-500 group-hover:text-slate-300 group-aria-[current=page]:text-teal-100 xl:inline">{hint}</span>}
          </NavLink>
        ))}
      </div>
      <div className="border-t border-slate-800 p-3">
        <button
          onClick={() => {
            if (window.confirm('Reset all synthetic demo data to the starting scenario?')) reset()
          }}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <RotateCcw size={14} /> Reset demo scenario
        </button>
        <p className="px-2.5 pt-1 text-[10px] leading-snug text-slate-500">Concept demo. Not affiliated with or endorsed by Process Street, HubSpot, Xero or Google.</p>
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
          <main className={cn('min-h-0 flex-1', productView ? 'flex flex-col overflow-hidden' : 'scroll-thin overflow-y-auto')}>
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
