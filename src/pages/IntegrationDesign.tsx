import { AlertTriangle, ExternalLink, HelpCircle, Lightbulb } from 'lucide-react'
import { Badge, Card, SectionTitle, type Tone } from '../components/ui/primitives'

type Method = 'Native' | 'Zapier' | 'Built-in feature'
const methodTone: Record<Method, Tone> = { Native: 'green', Zapier: 'violet', 'Built-in feature': 'slate' }

const CONNECTIONS: { zap: string; from: string; to: string; trigger: string; does: string; method: Method; why: string }[] = [
  { zap: 'Zap 1', from: 'Process Street', to: 'HubSpot', trigger: 'Step 5 checked', does: 'Find or create contact (Buyer ID, then email) and deal (Lot ID + Buyer ID); associate them', method: 'Zapier', why: 'Process Street documents Zapier and webhooks as its HubSpot routes; Zapier search steps with “create if not found” give a clean find-or-create.' },
  { zap: 'Zap 2A', from: 'Process Street → HubSpot', to: 'Google Drive / Docs', trigger: 'Step 6 checked', does: 'Find/create transaction folder; upload supporting documents; populate approved template → DRAFT; route for review', method: 'Zapier', why: 'Folder structure and naming are specific to the client.' },
  { zap: '—', from: 'Process Street', to: 'Process Street', trigger: 'Draft ready', does: 'Director review as an approval task; stop tasks block later steps', method: 'Built-in feature', why: 'Approvals and stop tasks are part of the workflow itself.' },
  { zap: 'Zap 2B', from: 'Process Street', to: 'Drive + e-signature + HubSpot', trigger: 'Step 7 approved', does: 'Approved PDF to Drive; send to buyer for e-signature; deal → Out for Signature', method: 'Zapier', why: 'E-signature tool chosen with the client (Dropbox Sign, DocuSign or PandaDoc all have Zapier apps).' },
  { zap: 'Zap 2C', from: 'E-signature', to: 'Drive + HubSpot', trigger: 'Buyer signed', does: 'Signed PDF to Drive; deal → Closed Won', method: 'Zapier', why: 'Closes the loop so “won” always means a signed contract.' },
  { zap: 'Zap 3', from: 'HubSpot', to: 'Xero', trigger: 'Deal → Closed Won', does: 'Filter on business rules; find/create Xero contact; create DRAFT deposit invoice (VUV); write invoice no. back', method: 'Zapier', why: 'HubSpot’s native Xero sync doesn’t support VUV and doesn’t sync drafts — see finding.' },
  { zap: 'Zap 4', from: 'Xero', to: 'HubSpot', trigger: 'Payment received', does: 'Payment note on the deal', method: 'Zapier', why: 'Same currency constraint as above.' },
  { zap: 'Zap 6', from: 'Shared inboxes ×2', to: 'Xero', trigger: 'New email with PDF/image', does: 'Create DRAFT supplier bill with attachment', method: 'Zapier', why: 'Option B below; option A is Xero’s native email-to-bills.' },
]

const QUESTIONS = [
  'Is VUV the base currency of the Xero organisation, and are any sales invoiced in AUD/NZD?',
  'Which Process Street plan is in use (webhooks and approvals availability)?',
  'Is the HubSpot pipeline already set up, and which tier (Sales Hub / Data Hub)?',
  'Who approves contracts, and is e-signature needed (e.g. a signing step before approval)?',
  'VAT treatment of deposits and fees — confirm with the accountant.',
  'Are the two shared inboxes on Google Workspace or Microsoft 365? Roughly how many supplier invoices per month?',
  'Should supplier bills be coded to tracking categories (e.g. Stage 1 / Stage 2)?',
  'Which Zapier plan? Multi-step Zaps, Filters, Paths and Storage need a paid plan; task volume per month sets the tier.',
]

const SOURCES = [
  { label: 'HubSpot Knowledge Base — Connect HubSpot and Xero (data sync)', url: 'https://knowledge.hubspot.com/integrations/connect-hubspot-and-xero-data-sync' },
  { label: 'Process Street Help — HubSpot (webhooks and Zapier)', url: 'https://www.process.st/help/docs/hubspot/' },
  { label: 'Zapier — HubSpot + Process Street integrations', url: 'https://zapier.com/apps/hubspot/integrations/process-street' },
  { label: 'Email PDF bills into your Xero organisation (third-party guide)', url: 'https://trinitygroup.com.au/post/email-pdf-bills-into-your-xero-organisation/' },
]

function Diagram() {
  const node = (x: number, y: number, label: string, sub: string, color: string) => (
    <g key={label}>
      <rect x={x - 80} y={y - 26} width={160} height={52} rx={10} fill="white" stroke={color} strokeWidth={2} />
      <text x={x} y={y - 3} textAnchor="middle" fontSize={13} fontWeight={600} fill="#0f172a">{label}</text>
      <text x={x} y={y + 14} textAnchor="middle" fontSize={10} fill="#64748b">{sub}</text>
    </g>
  )
  const line = (x1: number, y1: number, x2: number, y2: number, dashed = false) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray={dashed ? '5 4' : undefined} markerEnd="url(#arrow)" />
  )
  return (
    <svg viewBox="0 0 760 330" className="h-auto w-full" role="img" aria-label="Integration architecture diagram">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" /></marker>
      </defs>
      <rect x={290} y={120} width={180} height={80} rx={14} fill="#fff1eb" stroke="#ff4f00" strokeWidth={2} />
      <text x={380} y={152} textAnchor="middle" fontSize={14} fontWeight={700} fill="#b33a00">Zapier</text>
      <text x={380} y={170} textAnchor="middle" fontSize={10} fill="#c2410c">Zaps · filters · Zap history</text>
      <text x={380} y={185} textAnchor="middle" fontSize={10} fill="#c2410c">Storage by Zapier (no duplicates)</text>
      {node(110, 60, 'Process Street', 'workflow · form · approvals', '#2f80ed')}
      {node(650, 60, 'HubSpot', 'contacts · deals', '#ff5c35')}
      {node(110, 270, 'Google Drive / Docs', 'folders · contract PDFs', '#0f9d58')}
      {node(650, 270, 'Xero', 'invoices · draft bills', '#1a7bc4')}
      {node(380, 280, 'Shared inboxes ×2', 'accounts@ · site@ (later phase)', '#e11d48')}
      {line(190, 75, 290, 135)}
      {line(570, 75, 470, 135)}
      {line(290, 185, 190, 255)}
      {line(470, 185, 570, 255)}
      {line(380, 254, 380, 205, true)}
      <path d="M 190 48 Q 380 0 570 48" fill="none" stroke="#2f80ed" strokeWidth={1.5} strokeDasharray="4 3" markerStart="url(#arrow)" />
      <text x={380} y={22} textAnchor="middle" fontSize={10} fill="#2f80ed">webhook: deal stage → start run</text>
    </svg>
  )
}

export default function IntegrationDesign() {
  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <SectionTitle title="Integration Design" subtitle="How each connection would be built — native features where they fit, Zapier as the middleware for everything else" />

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-5"><Diagram /></Card>
        <Card className="border-amber-300 bg-amber-50/60 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-amber-900"><AlertTriangle size={17} /> Key finding: native HubSpot ↔ Xero sync doesn’t fit VUV</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-amber-950">
            <li>HubSpot’s Xero data-sync app supports six currencies — <b>USD, CAD, EUR, GBP, AUD and NZD</b>. Vatu (VUV) is not on the list.</li>
            <li>It syncs HubSpot invoices to Xero only once they are <b>Open</b>; draft invoices are not synced. The design here creates a <b>draft</b> in Xero for finance to approve.</li>
            <li>So the deposit invoice is created by Zap 3 using Zapier’s Xero app, keyed on the transaction ID so it can only be created once.</li>
            <li>The native app may still be useful for contact sync — to confirm once the currency setup is known.</li>
          </ul>
          <p className="mt-3 text-xs text-amber-800">Per HubSpot’s knowledge base at the time of writing; re-check before build.</p>
        </Card>
      </div>

      <Card className="mb-5 overflow-hidden">
        <h2 className="border-b border-slate-200 px-5 py-3 font-semibold">Connections</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>{['Zap', 'From → To', 'Trigger', 'What it does', 'Method', 'Why this method'].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {CONNECTIONS.map((c, i) => (
                <tr key={i} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{c.zap}</td>
                  <td className="px-4 py-2.5 font-medium">{c.from} → {c.to}</td>
                  <td className="px-4 py-2.5 text-slate-600">{c.trigger}</td>
                  <td className="px-4 py-2.5">{c.does}</td>
                  <td className="px-4 py-2.5"><Badge tone={methodTone[c.method]}>{c.method}</Badge></td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{c.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Lightbulb size={16} className="text-brand-700" /> Supplier bills (later phase): two options</h2>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="font-semibold">A · Xero’s own email-to-bills address <Badge tone="green" className="ml-1">Native</Badge></p>
              <p className="mt-1 text-slate-600">Each shared inbox auto-forwards supplier mail to the organisation’s Xero bills address; Xero creates draft bills with the attachment. Lowest cost and quickest to set up.</p>
              <p className="mt-1 text-xs text-slate-500">Trade-offs: little control over coding, no cross-inbox duplicate check before the draft exists, no review queue.</p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3">
              <p className="font-semibold">B · Zapier Zap with extraction <Badge tone="violet" className="ml-1">Shown in this demo</Badge></p>
              <p className="mt-1 text-slate-600">Poll both inboxes, extract supplier / invoice number / amounts, match the Xero supplier, check supplier + invoice number across both inboxes and existing bills, then create a draft bill with the PDF attached. Low-confidence reads go to a review queue.</p>
              <p className="mt-1 text-xs text-slate-500">Recommended when the same invoice often reaches both inboxes or bills need coding to development cost accounts.</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><HelpCircle size={16} className="text-brand-700" /> To confirm in discovery</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
            {QUESTIONS.map((q) => <li key={q}>{q}</li>)}
          </ol>
          <h3 className="mt-5 mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Sources</h3>
          <ul className="space-y-1 text-xs">
            {SOURCES.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">{s.label} <ExternalLink size={10} /></a></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
