import { BookOpen, Download } from 'lucide-react'
import { Button, Card, SectionTitle } from '../components/ui/primitives'
import { INBOXES } from '../data/bills'
import { FIELD_MAPPING } from '../data/mapping'

interface Scenario {
  name: string
  trigger: string
  steps: string[]
  key: string
  onFailure: string
  owner: string
}

const SYSTEMS_OF_RECORD: [string, string, string][] = [
  ['Buyer & sale details', 'Process Street run form', 'Edited only in the run; pushed to HubSpot'],
  ['Pipeline stage, owner, activity', 'HubSpot deal', 'Sales team works here day to day'],
  ['Documents & contracts', 'Google Drive shared drive', 'One folder per lot sale, fixed sub-folders'],
  ['Invoices, bills, payments', 'Xero', 'Finance approves every draft'],
  ['Automation logic & run history', 'Zapier (Zaps + Zap history)', 'Account owned by Pacific Horizon, not the consultant'],
]

const SCENARIOS: Scenario[] = [
  { name: 'Zap 1 · Lot-sale checklist → HubSpot buyer & deal', trigger: 'Process Street: step 5 “CRM record synchronized” checked', steps: ['Filter: checked, Buyer ID + Lot ID + email present', 'Formatter: trim/lowercase email, number, date', 'HubSpot Find Contact by buyer_id, then email — create if not found', 'HubSpot Find Deal by deal_key (Lot ID + Buyer ID) — create if not found', 'Update deal amount, close date, owner; associate contact'], key: 'hs.upsert:<transaction id>:<payload hash>', onFailure: 'Replay from Zap history; never create the contact by hand first', owner: 'Sales admin' },
  { name: 'Zap 2A · Generate contract → Drive → review', trigger: 'Process Street: step 6 “Contract generated” checked', steps: ['Storage check: not generated before', 'HubSpot Find Deal', 'Google Drive Find Folder “LOT-xxx — Buyer” (create if not found) + 5 sub-folders', 'Upload supporting documents from the run', 'Google Docs Create Document From Template → 04 Contracts (DRAFT)', 'Process Street: write draft link to the run for the approver'], key: 'contract.generate:<transaction id>:v<n>', onFailure: 'Check template merge fields; replay', owner: 'Sales manager' },
  { name: 'Zap 2B · Contract approved → send for signature', trigger: 'Process Street: step 7 approval = Approved', steps: ['Copy approved PDF to 04 Contracts', 'E-signature: send signature request to buyer', 'HubSpot deal stage → Out for Signature'], key: 'contract.approve:<transaction id>:v<n>', onFailure: 'Replay; check signer email', owner: 'Sales manager' },
  { name: 'Zap 2C · Contract signed → Drive + deal won', trigger: 'E-signature: request signed by all signers', steps: ['Upload signed PDF to 04 Contracts', 'HubSpot deal stage → Closed Won, contract_status = Signed', 'Process Street: mark contract signed'], key: 'contract.signed:<transaction id>:v<n>', onFailure: 'Replay; signed PDF stays in the e-signature tool', owner: 'Sales admin' },
  { name: 'Zap 3 · Deal won → Xero draft invoice', trigger: 'HubSpot: deal stage → Closed Won (Lot Sales pipeline)', steps: ['HubSpot Find Deal (all properties)', 'Filter: approved, signed, Buyer ID + Lot ID, amount > 0, VUV, no invoice yet', 'Xero Find Contact by email (create if not found)', 'Xero Create Sales Invoice — status DRAFT', 'HubSpot: write invoice number back to the deal'], key: 'xero.invoice:<transaction id>:deposit', onFailure: 'Replay; if a draft was created manually, delete it first', owner: 'Finance' },
  { name: 'Zap 4 · Xero payment → HubSpot', trigger: 'Xero: new payment on a deposit invoice', steps: ['Find deal by xero_invoice_number', 'Add payment note'], key: 'xero.paid:<invoice number>', onFailure: 'Non-critical; add note manually', owner: 'Finance' },
  { name: 'Zap 6 · Shared inboxes → Xero draft bills (later phase)', trigger: `New email with attachment: ${INBOXES.accounts.address}, ${INBOXES.site.address}`, steps: ['Extract supplier, invoice no., dates, amounts', 'Storage check: supplier + invoice no. not seen in either inbox', 'Low confidence → review queue', 'Xero Create Bill — status DRAFT, PDF attached'], key: 'xero.bill:<supplier id>:<invoice number>', onFailure: 'Email stays unprocessed and is retried', owner: 'Finance' },
]

const HOWTOS: { title: string; steps: string[] }[] = [
  { title: 'Release a new stage of lots', steps: ['Add the lots to the price list sheet', 'Add the new Lot IDs to the HubSpot “lot_id” dropdown', 'No scenario changes needed — folders and deals key off Lot ID'] },
  { title: 'Update the sale contract template', steps: ['Edit a copy of the template in Drive › Templates', 'Keep every {{merge_field}} unchanged (see field mapping)', 'Run UAT-06 with a TEST record, then replace the live template'] },
  { title: 'Re-run a failed automation', steps: ['Open Zapier → Zap history and filter by the Zap name', 'Read the error; fix the cause (e.g. expired connection)', 'Use “Replay” on the run — Storage by Zapier keys stop duplicates'] },
  { title: 'A supplier bill was held for review', steps: ['Open the review queue', 'Check fields against the attached PDF', 'Approve to create the Xero draft, or reject'] },
  { title: 'Reconnect an expired connection', steps: ['Sign in with the integration service account (not a personal login)', 'Re-authorise the app connection in Zapier → Apps', 'Retry any failed runs from the last 24 h'] },
  { title: 'Staff member leaves', steps: ['Reassign their HubSpot deals and Process Street tasks', 'Confirm no connection was authorised with their login', 'Update alert recipients'] },
]

const ALERTS = [
  'Any failed run → email + chat alert to the scenario owner within 5 minutes',
  'Three failures in a row → scenario pauses automatically; owner is alerted',
  'Daily 07:30 summary: runs, failures, duplicates suppressed, bills held for review',
  'Connections expiring within 14 days → reminder to the admin',
]

function toMarkdown() {
  const out: string[] = ['# Property Sales Automation — Runbook', '', '_Pacific Horizon Developments · maintained by the internal team. Synthetic example from the demo._', '']
  out.push('## Systems of record', '', '| Data | Lives in | Notes |', '|---|---|---|', ...SYSTEMS_OF_RECORD.map((r) => `| ${r.join(' | ')} |`), '')
  out.push('## Automation scenarios', '')
  for (const s of SCENARIOS) {
    out.push(`### ${s.name}`, '', `- **Trigger:** ${s.trigger}`, `- **Idempotency key:** \`${s.key}\``, `- **Owner:** ${s.owner}`, `- **If it fails:** ${s.onFailure}`, '', ...s.steps.map((x, i) => `${i + 1}. ${x}`), '')
  }
  out.push('## Field mapping', '', '| Process Street | HubSpot | Xero | Contract |', '|---|---|---|---|', ...FIELD_MAPPING.map((r) => `| ${r.join(' | ')} |`), '')
  out.push('## Alerts', '', ...ALERTS.map((a) => `- ${a}`), '')
  out.push('## How-to', '')
  for (const h of HOWTOS) out.push(`### ${h.title}`, '', ...h.steps.map((x, i) => `${i + 1}. ${x}`), '')
  return out.join('\n')
}

function download() {
  const blob = new Blob([toMarkdown()], { type: 'text/markdown' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'property-sales-automation-runbook.md'
  a.click()
  URL.revokeObjectURL(a.href)
}

const TOC = [
  ['sor', 'Systems of record'],
  ['scenarios', 'Automation scenarios'],
  ['mapping', 'Field mapping'],
  ['alerts', 'Error handling & alerts'],
  ['howto', 'How-to procedures'],
]

export default function Documentation() {
  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <SectionTitle
        title="Documentation"
        subtitle="Handover runbook so the Pacific Horizon team can maintain the integrations without the consultant"
        actions={<Button variant="primary" onClick={download}><Download size={15} /> Download runbook (.md)</Button>}
      />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="h-fit space-y-1 lg:sticky lg:top-6">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase"><BookOpen size={13} /> Contents</p>
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }} className="block rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-white hover:text-slate-900">{label}</a>
          ))}
        </nav>

        <div className="space-y-5">
          <Card id="sor" className="overflow-hidden">
            <h2 className="border-b border-slate-200 px-5 py-3 font-semibold">1. Systems of record</h2>
            <table className="w-full text-sm">
              <tbody>
                {SYSTEMS_OF_RECORD.map(([d, w, n]) => (
                  <tr key={d} className="border-t border-slate-100 first:border-0"><td className="px-5 py-2.5 font-medium">{d}</td><td className="px-3 py-2.5">{w}</td><td className="px-3 py-2.5 text-xs text-slate-500">{n}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card id="scenarios" className="p-5">
            <h2 className="mb-3 font-semibold">2. Automation scenarios</h2>
            <div className="grid gap-3 xl:grid-cols-2">
              {SCENARIOS.map((s) => (
                <div key={s.name} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-semibold">{s.name}</p>
                  <p className="mb-2 text-xs text-slate-500">Trigger: {s.trigger}</p>
                  <ol className="mb-2 list-decimal space-y-0.5 pl-5 text-sm">{s.steps.map((x) => <li key={x}>{x}</li>)}</ol>
                  <dl className="grid gap-1 text-xs">
                    <div><dt className="inline text-slate-500">Idempotency key: </dt><dd className="inline font-mono">{s.key}</dd></div>
                    <div><dt className="inline text-slate-500">If it fails: </dt><dd className="inline">{s.onFailure}</dd></div>
                    <div><dt className="inline text-slate-500">Owner: </dt><dd className="inline">{s.owner}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
          </Card>

          <Card id="mapping" className="overflow-hidden">
            <h2 className="border-b border-slate-200 px-5 py-3 font-semibold">3. Field mapping</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>{['Process Street', 'HubSpot', 'Xero', 'Contract'].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>{FIELD_MAPPING.map((r) => <tr key={r[0]} className="border-t border-slate-100">{r.map((c, i) => <td key={i} className={`px-5 py-2 ${i ? 'font-mono text-xs text-slate-600' : 'font-medium'}`}>{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </Card>

          <Card id="alerts" className="p-5">
            <h2 className="mb-3 font-semibold">4. Error handling & alerts</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">{ALERTS.map((a) => <li key={a}>{a}</li>)}</ul>
            <p className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600">Every Zap checks and then writes its key in Storage by Zapier. A replay or retry with a key that already succeeded is skipped, so “run it again” is always safe.</p>
          </Card>

          <Card id="howto" className="p-5">
            <h2 className="mb-3 font-semibold">5. How-to procedures</h2>
            <div className="grid gap-3 xl:grid-cols-2">
              {HOWTOS.map((h) => (
                <div key={h.title} className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-1.5 font-semibold">{h.title}</p>
                  <ol className="list-decimal space-y-0.5 pl-5 text-sm text-slate-700">{h.steps.map((x) => <li key={x}>{x}</li>)}</ol>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
