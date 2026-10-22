import { KeyRound, Plug, RotateCcw } from 'lucide-react'
import { Badge, Button, Card, SectionTitle } from '../components/ui/primitives'
import { FIELD_MAPPING as MAPPING } from '../data/mapping'
import type { DemoSettings } from '../data/types'
import { SystemIcon } from '../lib/systems'
import { useDemo } from '../store/DemoStore'

const CONNECTIONS = [
  { system: 'process-street' as const, name: 'Process Street', scope: 'Workflow runs, form fields, task completion webhooks', auth: 'API key (Zapier app connection)' },
  { system: 'hubspot' as const, name: 'HubSpot CRM', scope: 'Contacts, deals, associations, timeline events', auth: 'Private app token / OAuth' },
  { system: 'drive' as const, name: 'Google Drive & Docs', scope: 'Shared drive folders, template merge, file labels', auth: 'Google OAuth (service account)' },
  { system: 'xero' as const, name: 'Xero', scope: 'Contacts and draft invoices only', auth: 'Xero OAuth 2.0' },
  { system: 'automation' as const, name: 'Zapier (middleware)', scope: 'Zaps, filters, Storage by Zapier, Zap history, error alerts', auth: 'Team account owned by Pacific Horizon' },
]


export default function Settings() {
  const { state, run, reset } = useDemo()
  const set = (patch: Partial<DemoSettings>) => run((s) => ({ state: { ...s, settings: { ...s.settings, ...patch } } }))
  const toggles: { key: keyof DemoSettings; label: string; help: string }[] = [
    { key: 'autoSyncOnSave', label: 'Auto-sync to HubSpot when the form is saved', help: 'Otherwise sync happens on step 5 or the “Sync to HubSpot” button.' },
    { key: 'enforceStopTasks', label: 'Enforce stop tasks', help: 'Steps 6–8 cannot be completed until all earlier steps are complete.' },
    { key: 'simulateFailure', label: 'Simulate an API outage', help: 'Next integration runs fail with a 503 so you can demo alerting and retry.' },
  ]
  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <SectionTitle title="Settings" subtitle="Demo behaviour, simulated connections and field mapping" actions={<Button onClick={() => window.confirm('Reset all synthetic demo data?') && reset()}><RotateCcw size={14} /> Reset demo scenario</Button>} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Demo behaviour</h2>
          <ul className="space-y-4">
            {toggles.map((t) => (
              <li key={t.key} className="flex items-start gap-3">
                <button
                  role="switch"
                  aria-checked={state.settings[t.key]}
                  onClick={() => set({ [t.key]: !state.settings[t.key] })}
                  className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${state.settings[t.key] ? (t.key === 'simulateFailure' ? 'bg-rose-500' : 'bg-brand-600') : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${state.settings[t.key] ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.help}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-md bg-slate-50 p-3 text-xs text-slate-600">State is kept in this browser only (localStorage). No backend, no credentials, no network calls to any vendor.</p>
        </Card>

        <Card className="overflow-hidden">
          <h2 className="flex items-center gap-2 border-b border-slate-200 px-5 py-3 font-semibold"><Plug size={16} /> Connections (simulated)</h2>
          <ul className="divide-y divide-slate-100">
            {CONNECTIONS.map((c) => (
              <li key={c.name} className="flex items-start gap-3 px-5 py-3">
                <SystemIcon system={c.system} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.scope}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400"><KeyRound size={11} /> {c.auth}</p>
                </div>
                <Badge tone={state.settings.simulateFailure && c.system !== 'automation' ? 'red' : 'green'} dot>{state.settings.simulateFailure && c.system !== 'automation' ? 'Outage (sim)' : 'Simulated'}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-hidden lg:col-span-2">
          <h2 className="border-b border-slate-200 px-5 py-3 font-semibold">Field mapping</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>{['Process Street form field (source of truth)', 'HubSpot property', 'Xero', 'Contract merge field'].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {MAPPING.map((r) => (
                  <tr key={r[0]} className="border-t border-slate-100">
                    {r.map((c, i) => <td key={i} className={`px-5 py-2 ${i > 0 ? 'font-mono text-xs text-slate-600' : 'font-medium'}`}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 border-t border-slate-200 p-5 text-sm md:grid-cols-3">
            <div><p className="font-semibold">Contact matching</p><p className="text-slate-600">Buyer ID first; normalised email as fallback. Never match on name alone.</p></div>
            <div><p className="font-semibold">Deal uniqueness</p><p className="text-slate-600">One open deal per Lot ID + Buyer ID. Sync updates the existing deal.</p></div>
            <div><p className="font-semibold">Idempotency</p><p className="text-slate-600">Each side effect carries a deterministic key; processed keys are skipped on replay.</p></div>
          </div>
        </Card>
      </div>
    </div>
  )
}
