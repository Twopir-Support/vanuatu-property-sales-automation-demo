import { ArrowRight, Bot, ChevronDown, ChevronRight, ShieldCheck, Sparkles, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, SectionTitle } from '../components/ui/primitives'
import { USERS } from '../data/ids'
import { cn, longDate, vt } from '../lib/format'
import { useDemo } from '../store/DemoStore'

interface Idea {
  id: string
  title: string
  phase: 1 | 2 | 3
  value: string
  trigger: string
  ai: string
  human: string
  output: string
  systems: string[]
  effort: 'S' | 'M' | 'L'
}

const IDEAS: Idea[] = [
  { id: 'docs', title: 'Buyer document check', phase: 2, value: 'Cuts manual ID / proof-of-address review and catches expired or mismatched documents early.', trigger: 'File uploaded to Drive › 01/02 folders', ai: 'Classify the document, extract name, expiry and address, compare with the Process Street form', human: 'Sales rep confirms flagged mismatches before step 4 can complete', output: 'Document checklist status + exceptions note in HubSpot', systems: ['Drive', 'Process Street', 'HubSpot'], effort: 'M' },
  { id: 'email', title: 'Buyer update emails (EN / FR / Bislama)', phase: 2, value: 'Consistent, timely buyer communication in the buyer’s preferred language.', trigger: 'Deal stage change in HubSpot', ai: 'Draft a status update from deal, contract and invoice data', human: 'Rep reviews and sends from HubSpot — never auto-sent', output: 'Draft email on the HubSpot contact', systems: ['HubSpot'], effort: 'S' },
  { id: 'contract', title: 'Contract variance review', phase: 2, value: 'Flags non-standard terms before director approval.', trigger: 'Contract generated (step 6)', ai: 'Compare the generated agreement with the approved template and price list; summarise differences', human: 'Director sees the summary inside the approval task', output: 'Risk summary attached to step 7', systems: ['Drive', 'Process Street'], effort: 'M' },
  { id: 'hygiene', title: 'CRM data hygiene assistant', phase: 1, value: 'Keeps buyer records clean so matching rules keep working.', trigger: 'Nightly', ai: 'Suggest likely duplicates, missing Buyer IDs, inconsistent phone formats', human: 'Admin approves merges', output: 'Review queue', systems: ['HubSpot'], effort: 'S' },
  { id: 'recon', title: 'Deposit & settlement reconciliation', phase: 3, value: 'Faster month-end and fewer missed payments.', trigger: 'Xero bank feed line imported', ai: 'Match payments to invoices by reference, amount and buyer; explain low-confidence matches', human: 'Finance confirms suggested matches', output: 'Reconciled invoice + HubSpot payment note', systems: ['Xero', 'HubSpot'], effort: 'L' },
  { id: 'brief', title: 'Weekly sales briefing', phase: 3, value: 'Directors get a one-page view without building reports.', trigger: 'Every Monday 07:30 (Port Vila)', ai: 'Summarise pipeline movement, stuck deals, overdue tasks and cash expected', human: 'Read-only briefing', output: 'Email + Drive PDF', systems: ['HubSpot', 'Process Street', 'Xero'], effort: 'M' },
]

const PHASES = [
  { n: 1, name: 'Foundation', when: 'Weeks 1–4', text: 'Core integrations live: Process Street ↔ HubSpot upsert, Drive folder provisioning, contract generation, milestone-gated Xero invoices, monitoring and alerting.' },
  { n: 2, name: 'AI assistance', when: 'Weeks 5–8', text: 'Human-in-the-loop AI on documents, contracts and buyer communications using OpenAI or Claude via Make.com / Zapier.' },
  { n: 3, name: 'Optimisation', when: 'Weeks 9–12', text: 'Reconciliation support, executive briefings, and measured tuning based on run history.' },
]

export default function Roadmap() {
  const [open, setOpen] = useState<string>('email')
  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <SectionTitle title="AI Automation Roadmap" subtitle="Future AI-powered automations built on the same integration backbone. Proposals only — nothing here calls an AI service." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {PHASES.map((p) => (
          <Card key={p.n} className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">{p.n}</span>
              <p className="font-semibold">{p.name}</p>
              <Badge tone="slate" className="ml-auto">{p.when}</Badge>
            </div>
            <p className="text-sm text-slate-600">{p.text}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_440px]">
        <Card className="divide-y divide-slate-100">
          {IDEAS.map((i) => (
            <div key={i.id}>
              <button onClick={() => setOpen(open === i.id ? '' : i.id)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50">
                {open === i.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Sparkles size={16} className="text-violet-600" />
                <span className="flex-1 font-medium">{i.title}</span>
                <Badge tone="violet">Phase {i.phase}</Badge>
                <Badge tone="slate">Effort {i.effort}</Badge>
              </button>
              {open === i.id && (
                <div className="space-y-3 px-5 pb-5 pl-14">
                  <p className="text-sm text-slate-600">{i.value}</p>
                  <div className="grid gap-2 text-xs md:grid-cols-4">
                    {[
                      ['Trigger', i.trigger, Bot],
                      ['AI step', i.ai, Sparkles],
                      ['Human review', i.human, UserCheck],
                      ['Output', i.output, ArrowRight],
                    ].map(([label, text, Icon]) => {
                      const I = Icon as typeof Bot
                      return (
                        <div key={label as string} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="mb-1 flex items-center gap-1 font-semibold text-slate-700"><I size={12} /> {label as string}</p>
                          <p className="text-slate-600">{text as string}</p>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-slate-500">Systems: {i.systems.join(' · ')}</p>
                </div>
              )}
            </div>
          ))}
        </Card>

        <div className="space-y-5">
          <DraftPreview />
          <Card className="p-5">
            <h3 className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck size={16} className="text-emerald-600" /> Guardrails</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>AI drafts and suggests; people approve anything sent to buyers or posted to accounts.</li>
              <li>Only the fields needed for each task are sent to the model; no identity document images leave Drive without approval.</li>
              <li>Every AI step is logged in the Automation Monitor with its input reference and output.</li>
              <li>Provider choice (OpenAI or Claude) stays configurable per scenario.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

/** Deterministic, template-based preview of what an AI-drafted email could look like. */
function DraftPreview() {
  const { state } = useDemo()
  const [lang, setLang] = useState<'en' | 'fr' | 'bi'>('en')
  const [shown, setShown] = useState(false)
  const t = state.transaction
  const deal = state.hubspot.deals.find((d) => d.lotId === t.lotId)
  const first = t.buyerName.split(' ')[0]
  const body = {
    en: `Hi ${first},\n\nA quick update on ${t.lotId} at ${t.project}. Your sale is currently at the “${deal?.stage}” stage. ${state.contract.status === 'Approved' ? `Your contract has been approved and the deposit invoice of ${vt(t.salePrice * 0.1)} will follow shortly.` : 'Your contract is being prepared for approval and we will send it to you shortly.'}\n\nSettlement is planned for ${longDate(t.settlementDate)}.\n\nKind regards,\n${USERS.sales}`,
    fr: `Bonjour ${first},\n\nPoint d’étape concernant le ${t.lotId} à ${t.project}. Votre vente est actuellement à l’étape « ${deal?.stage} ». Le règlement est prévu le ${longDate(t.settlementDate)}.\n\nCordialement,\n${USERS.sales}`,
    bi: `Halo ${first},\n\nSmol update long ${t.lotId} long ${t.project}. Seil blong yu i stap long stej “${deal?.stage}”. Setelmen i plan blong ${longDate(t.settlementDate)}.\n\nTankyu tumas,\n${USERS.sales}`,
  }[lang]
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
        <Sparkles size={16} className="text-violet-600" />
        <h3 className="flex-1 font-semibold">Preview: buyer update draft</h3>
        <Badge tone="amber">Simulated · no AI call</Badge>
      </div>
      <div className="space-y-3 p-5">
        <div className="flex gap-1">
          {([['en', 'English'], ['fr', 'Français'], ['bi', 'Bislama']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setLang(k)} className={cn('rounded-full px-3 py-1 text-xs', lang === k ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600')}>{l}</button>
          ))}
        </div>
        {shown ? (
          <pre className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 font-sans text-sm whitespace-pre-wrap text-slate-800">{body}</pre>
        ) : (
          <Button onClick={() => setShown(true)}><Sparkles size={14} /> Generate draft from deal data</Button>
        )}
        <p className="text-[11px] text-slate-500">Built from live demo record fields with a fixed template to illustrate the flow. Translations are illustrative and would be reviewed by a fluent speaker.</p>
      </div>
    </Card>
  )
}
