import { CheckCircle2, FlaskConical, Play, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, SectionTitle } from '../components/ui/primitives'
import { cn } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { runSuite, TEST_CASES, type TestResult } from '../store/uat'

const TEST_RECORDS = [
  ['HubSpot', 'Contact “TEST — Alex Morgan” (Buyer ID TEST-0142), deal “TEST LOT-999”', 'Tagged test_record = true; excluded from pipeline reports'],
  ['Process Street', 'Run “TEST Lot Sale — LOT-999” from the live workflow', 'Archived after sign-off'],
  ['Google Drive', 'Folder “_TEST — LOT-999” under a TEST shared-drive folder', 'Deleted after sign-off'],
  ['Xero', 'Contact “TEST Buyer”, draft invoice and draft bills only', 'Xero demo company first, then voided drafts in live org'],
  ['Shared inboxes', 'Sample supplier PDFs sent from a test address to both inboxes', 'Includes one deliberate duplicate'],
]

const CHECKLIST: { group: string; items: { id: string; label: string }[] }[] = [
  { group: 'Access & accounts', items: [
    { id: 'acc-1', label: 'Integration user/service account in HubSpot, Xero, Google Workspace, Process Street (not a personal login)' },
    { id: 'acc-2', label: 'Zapier Team account owned by Pacific Horizon; app connections authorised with the integration service account' },
    { id: 'acc-3', label: 'Xero organisation base currency confirmed as VUV; tax rates and account codes agreed with accountant' },
  ] },
  { group: 'Configuration', items: [
    { id: 'cfg-1', label: 'Custom HubSpot properties created: buyer_id, lot_id, settlement_date, process_street_run_id' },
    { id: 'cfg-2', label: 'Process Street workflow form fields mapped 1:1 to the field-mapping sheet' },
    { id: 'cfg-3', label: 'Contract template approved by solicitor; merge fields verified' },
    { id: 'cfg-4', label: 'Error alerts route to a named owner (email + Slack/Teams)' },
  ] },
  { group: 'Testing', items: [
    { id: 'tst-1', label: 'All UAT cases pass with test records (this page)' },
    { id: 'tst-2', label: 'Client walkthrough of one full test sale signed off by sales and finance' },
    { id: 'tst-3', label: 'Test records removed or archived' },
  ] },
  { group: 'Go-live & handover', items: [
    { id: 'go-1', label: 'Scenarios switched on in order: Drive → HubSpot → Contracts → Xero' },
    { id: 'go-2', label: 'First live lot monitored end to end (hypercare, 2 weeks)' },
    { id: 'go-3', label: 'Runbook and maintenance documentation handed over; team walkthrough done' },
  ] },
]

export default function Testing() {
  const { state, run } = useDemo()
  const [results, setResults] = useState<TestResult[] | null>(null)
  const [ranAt, setRanAt] = useState<string>('')
  const passed = results?.filter((r) => r.pass).length ?? 0
  const allItems = CHECKLIST.flatMap((g) => g.items)
  const done = allItems.filter((i) => state.goLive[i.id]).length
  const toggle = (id: string) => run((s) => ({ state: { ...s, goLive: { ...s.goLive, [id]: !s.goLive[id] } } }))

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <SectionTitle
        title="Testing & Go-live"
        subtitle="End-to-end tests with test records before go-live. The suite below executes the real automation logic against an isolated sandbox — the live demo data is untouched."
        actions={<Button variant="primary" onClick={() => { setResults(runSuite()); setRanAt(new Date().toLocaleTimeString('en-GB')) }}><Play size={15} /> Run end-to-end test suite</Button>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-slate-500">Test cases</p><p className="text-2xl font-semibold">{TEST_CASES.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Last run</p><p className={cn('text-2xl font-semibold', results && (passed === results.length ? 'text-emerald-600' : 'text-rose-600'))}>{results ? `${passed} / ${results.length} passed` : 'Not run yet'}</p>{ranAt && <p className="text-xs text-slate-500">at {ranAt}</p>}</Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Go-live checklist</p><p className="text-2xl font-semibold">{done} / {allItems.length}</p><div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${(done / allItems.length) * 100}%` }} /></div></Card>
      </div>

      <Card className="mb-5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3"><FlaskConical size={16} className="text-brand-700" /><h2 className="font-semibold">UAT cases</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>{['ID', 'Area', 'Scenario', 'Expected', 'Actual', 'Result'].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {TEST_CASES.map((t) => {
                const r = results?.find((x) => x.id === t.id)
                return (
                  <tr key={t.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2.5 font-mono text-xs">{t.id}</td>
                    <td className="px-4 py-2.5"><Badge tone="slate">{t.area}</Badge></td>
                    <td className="px-4 py-2.5 font-medium">{t.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{t.expected}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{r ? r.actual : '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {!r ? <span className="text-xs text-slate-400">Not run</span> : r.pass ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={15} /> Pass</span> : <span className="inline-flex items-center gap-1 text-rose-700"><XCircle size={15} /> Fail</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <h2 className="border-b border-slate-200 px-5 py-3 font-semibold">Test records used in the real systems</h2>
          <table className="w-full text-sm">
            <tbody>
              {TEST_RECORDS.map(([sys, rec, clean]) => (
                <tr key={sys} className="border-t border-slate-100 first:border-0 align-top">
                  <td className="px-5 py-2.5 font-medium whitespace-nowrap">{sys}</td>
                  <td className="px-2 py-2.5">{rec}<span className="block text-xs text-slate-500">{clean}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-slate-200 bg-slate-50 px-5 py-2.5 text-xs text-slate-500">Every test record carries a TEST prefix so it can be filtered out of reports and removed after sign-off.</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Go-live checklist</h2>
          <div className="space-y-4">
            {CHECKLIST.map((g) => (
              <div key={g.group}>
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">{g.group}</p>
                <ul className="space-y-1.5">
                  {g.items.map((i) => (
                    <li key={i.id}>
                      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                        <input type="checkbox" className="mt-0.5 size-4 text-brand-700" checked={!!state.goLive[i.id]} onChange={() => toggle(i.id)} />
                        <span className={cn(state.goLive[i.id] && 'text-slate-400 line-through')}>{i.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
