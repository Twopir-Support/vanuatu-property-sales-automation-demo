import { RotateCcw, ShieldAlert, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { cn } from '../../lib/format'
import { useDemo } from '../../store/DemoStore'
import { Toaster } from '../ui/Toaster'
import { ConfirmDialog } from '../ui/overlays'

/** Persistent demo banner. Only demo controls live here: reset and an API-outage switch for showing errors. */
export function DemoBanner() {
  const { state, run, reset } = useDemo()
  const [confirmReset, setConfirmReset] = useState(false)
  const outage = state.settings.simulateFailure
  const ctl = 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-normal hover:bg-amber-500/60'
  return (
    <div className="relative z-[70] flex min-h-7 shrink-0 items-center justify-center gap-2 bg-amber-400 px-3 py-1 text-center text-[10px] font-semibold tracking-wider text-amber-950 sm:text-[11px]" role="note">
      <ShieldAlert size={13} />
      <span className="hidden sm:inline">DEMO ENVIRONMENT · SYNTHETIC DATA · SIMULATED INTEGRATIONS</span>
      <span className="sm:hidden">DEMO · SYNTHETIC DATA</span>
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5">
        <button onClick={() => run((s) => ({ state: { ...s, settings: { ...s.settings, simulateFailure: !outage } }, notice: { kind: outage ? 'info' : 'warning', title: outage ? 'API outage off' : 'API outage on (simulated)', message: outage ? 'Zaps run normally again.' : 'The next Zap run will error so you can show retry in Zap history.' } }))}
          className={cn(ctl, outage && 'bg-rose-600 text-white hover:bg-rose-600')} title="Simulate an API outage"><TriangleAlert size={12} /> Outage{outage ? ' · on' : ''}</button>
        <button onClick={() => setConfirmReset(true)} className={ctl} aria-label="Reset demo scenario" title="Reset demo scenario"><RotateCcw size={12} /> Reset</button>
      </div>
      <ConfirmDialog open={confirmReset} title="Reset the demo scenario?" confirmLabel="Reset demo" tone="danger" onCancel={() => setConfirmReset(false)} onConfirm={() => { setConfirmReset(false); reset() }}>
        LOT-025 returns to the start: Zap 1 ready to run, no contract, no Drive folder, no Xero invoice. Nothing outside this browser is affected.
      </ConfirmDialog>
    </div>
  )
}

export function AppShell() {
  return (
    <div className="flex h-full flex-col">
      <DemoBanner />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
