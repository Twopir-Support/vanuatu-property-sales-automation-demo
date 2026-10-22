/**
 * End-to-end test suite. Each case runs the real integration engine against a fresh,
 * isolated sandbox seeded with test records, so the live demo state is never touched.
 */
import { createSeedState } from '../data/seed'
import { IDS, USERS } from '../data/ids'
import type { DemoState } from '../data/types'
import {
  approveContract,
  createDraftBill,
  createHubSpotContact,
  createXeroInvoice,
  generateContract,
  markEventFixed,
  processInbox,
  replayEvent,
  setDealStage,
  signContract,
  syncHubSpot,
  toggleStep,
  updateTransaction,
} from './engine'

export interface TestCase {
  id: string
  area: 'CRM' | 'Contracts' | 'Accounting' | 'Resilience' | 'Supplier bills'
  name: string
  expected: string
  run: () => { pass: boolean; actual: string }
}

const sandbox = (): DemoState => createSeedState()
const deal = (s: DemoState) => s.hubspot.deals.find((d) => d.id === IDS.hubspotDeal)!
const approved = () => approveContract(generateContract(sandbox()).state, USERS.director).state
const signed = () => signContract(approved()).state

export const TEST_CASES: TestCase[] = [
  {
    id: 'UAT-01', area: 'CRM', name: 'Existing buyer is matched, not duplicated',
    expected: 'Contact count unchanged; contact matched on Buyer ID',
    run: () => {
      const s0 = sandbox()
      const s = syncHubSpot(s0, 'UAT').state
      const ok = s.hubspot.contacts.length === s0.hubspot.contacts.length && s.events[0].result.includes('matched')
      return { pass: ok, actual: `${s.hubspot.contacts.length} contacts · ${s.events[0].result}` }
    },
  },
  {
    id: 'UAT-02', area: 'CRM', name: 'Repeat sync with the same data is ignored',
    expected: 'Second run = duplicate suppressed; deal count unchanged',
    run: () => {
      let s = syncHubSpot(sandbox(), 'UAT').state
      const deals = s.hubspot.deals.length
      s = syncHubSpot(s, 'UAT').state
      return { pass: s.events[0].status === 'duplicate' && s.hubspot.deals.length === deals, actual: `${s.events[0].status} · ${s.hubspot.deals.length} deals` }
    },
  },
  {
    id: 'UAT-03', area: 'CRM', name: 'Price change updates the same deal',
    expected: 'Deal amount VT 12,800,000; no new deal',
    run: () => {
      const s0 = sandbox()
      let s = updateTransaction(s0, { salePrice: 12_800_000 }).state
      s = syncHubSpot(s, 'UAT').state
      return { pass: deal(s).amount === 12_800_000 && s.hubspot.deals.length === s0.hubspot.deals.length, actual: `amount ${deal(s).amount.toLocaleString()} · ${s.hubspot.deals.length} deals` }
    },
  },
  {
    id: 'UAT-04', area: 'CRM', name: 'Same email with different case/spacing is caught',
    expected: 'Manual create of “ Alex.Morgan@Example.com ” is blocked',
    run: () => {
      const s0 = sandbox()
      const s = createHubSpotContact(s0, { firstName: 'Alex', lastName: 'Morgan', email: ' Alex.Morgan@Example.com ', phone: '' }).state
      return { pass: s.hubspot.contacts.length === s0.hubspot.contacts.length, actual: `${s.hubspot.contacts.length - s0.hubspot.contacts.length} contacts created` }
    },
  },
  {
    id: 'UAT-05', area: 'Contracts', name: 'Contract cannot be generated before CRM step',
    expected: 'Generation blocked while step 5 is open',
    run: () => {
      let s = toggleStep(sandbox(), 5, USERS.sales).state // reopen step 5
      s = generateContract(s).state
      return { pass: s.events[0].status === 'blocked' && s.contract.status === 'Not generated', actual: `${s.events[0].status} · contract ${s.contract.status}` }
    },
  },
  {
    id: 'UAT-06', area: 'Contracts', name: 'Contract generated exactly once',
    expected: 'One contract file in Drive after two runs',
    run: () => {
      let s = generateContract(sandbox()).state
      s = generateContract(s).state
      const files = s.drive.files.filter((f) => f.parentId === 'gd-025-ctr').length
      return { pass: files === 1 && s.events[0].status === 'duplicate', actual: `${files} file(s) · 2nd run ${s.events[0].status}` }
    },
  },
  {
    id: 'UAT-07', area: 'Contracts', name: 'Flow 2 files draft, approved and signed contract in Drive',
    expected: 'Folder created once; DRAFT, APPROVED and SIGNED files in 04 Contracts; supporting docs copied',
    run: () => {
      const s = signed()
      const names = s.drive.files.filter((f) => f.parentId === 'gd-025-ctr').map((f) => f.name.split('_').pop())
      const folders = s.drive.files.filter((f) => f.id === IDS.driveFolder).length
      const support = s.documents.filter((d) => d.id !== 'doc-contract' && d.driveFileId).length
      return { pass: folders === 1 && names.length === 3 && support === 3, actual: `${folders} folder · ${names.join(', ')} · ${support} supporting docs` }
    },
  },
  {
    id: 'UAT-08', area: 'Accounting', name: 'Approval alone does not touch Xero',
    expected: 'After internal approval (not signed, not won): no invoice',
    run: () => {
      const s = approved()
      return { pass: s.xero.invoice === null && deal(s).stage === 'Out for Signature', actual: `stage ${deal(s).stage} · invoice ${s.xero.invoice ? 'exists' : 'none'}` }
    },
  },
  {
    id: 'UAT-09', area: 'Accounting', name: 'Deal dragged to Closed Won early is stopped by Zap 3 filter',
    expected: 'Filter stops: contract not signed; nothing created in Xero',
    run: () => {
      const s = setDealStage(approved(), IDS.hubspotDeal, 'Closed Won').state
      return { pass: s.xero.invoice === null && s.events[0].status === 'blocked', actual: `${s.events[0].status} · ${s.events[0].result.slice(0, 60)}…` }
    },
  },
  {
    id: 'UAT-10', area: 'Accounting', name: 'Signed + won creates one DRAFT deposit invoice in VUV',
    expected: 'INV-0025 Draft · deposit = 10% · invoice no. written to deal · re-run adds nothing',
    run: () => {
      let s = signed()
      const inv = s.xero.invoice
      s = createXeroInvoice(s, 'UAT re-run').state
      const ok = deal(s).stage === 'Closed Won' && inv?.status === 'Draft' && inv.lines[0].unitPrice === s.transaction.salePrice * 0.1 && deal(s).xeroInvoice === inv.number && s.events[0].status === 'duplicate'
      return { pass: !!ok, actual: `${deal(s).stage} · ${inv?.number} ${inv?.status} · deposit ${inv?.lines[0].unitPrice.toLocaleString()} · re-run ${s.events[0].status}` }
    },
  },
  {
    id: 'UAT-11', area: 'Resilience', name: 'API outage fails cleanly and retries',
    expected: 'Failed run writes nothing; retry succeeds once',
    run: () => {
      let s = sandbox()
      s = { ...s, settings: { ...s.settings, simulateFailure: true } }
      s = syncHubSpot(s, 'UAT').state
      const failedId = s.events[0].id
      const firstFailed = s.events[0].status === 'failed' && s.hubspot.lastSyncedHash === ''
      s = { ...s, settings: { ...s.settings, simulateFailure: false } }
      s = replayEvent(s, failedId).state
      return { pass: firstFailed && s.events[0].status === 'success', actual: `${firstFailed ? 'failed, nothing written' : 'unexpected'} → retry ${s.events[0].status}` }
    },
  },
  {
    id: 'UAT-12', area: 'CRM', name: 'Settlement marks the buyer a customer',
    expected: 'Deal stays Closed Won; contact lifecycle Customer; folder Completed',
    run: () => {
      let s = signed()
      s = toggleStep({ ...s, steps: s.steps.map((x) => (x.id <= 7 ? { ...x, status: 'complete' } : x)) }, 8, USERS.finance).state
      const c = s.hubspot.contacts.find((x) => x.id === IDS.hubspotContact)!
      const folder = s.drive.files.find((f) => f.id === IDS.driveFolder)
      return { pass: deal(s).stage === 'Closed Won' && c.lifecycleStage === 'Customer' && folder?.label === 'Completed', actual: `${deal(s).stage} · ${c.lifecycleStage} · ${folder?.label}` }
    },
  },
  {
    id: 'UAT-13', area: 'Supplier bills', name: 'Both inboxes processed into draft bills',
    expected: '4 drafts · 1 duplicate (same invoice in both inboxes) · 1 held for review',
    run: () => {
      const s0 = sandbox()
      const s = processInbox(s0).state
      const drafts = s.bills.xeroBills.length - s0.bills.xeroBills.length
      const st = (k: string) => s.bills.emails.filter((m) => m.status === k).length
      const allDraft = s.bills.xeroBills.slice(0, drafts).every((b) => b.status === 'Draft')
      return { pass: drafts === 4 && st('Duplicate') === 1 && st('Needs review') === 1 && allDraft, actual: `${drafts} drafts · ${st('Duplicate')} duplicate · ${st('Needs review')} review` }
    },
  },
  {
    id: 'UAT-14', area: 'Supplier bills', name: 'Re-polling creates no extra bills',
    expected: 'Bill count unchanged on second poll',
    run: () => {
      let s = processInbox(sandbox()).state
      const n = s.bills.xeroBills.length
      s = processInbox(s).state
      s = createDraftBill(s, 'em-1', 'UAT re-run').state
      return { pass: s.bills.xeroBills.length === n, actual: `${n} → ${s.bills.xeroBills.length} bills` }
    },
  },
  {
    id: 'UAT-15', area: 'Supplier bills', name: 'Low-confidence bill needs a person',
    expected: 'Held first; created as Draft only after review',
    run: () => {
      let s = createDraftBill(sandbox(), 'em-5').state
      const held = s.bills.emails.find((m) => m.id === 'em-5')!.status
      s = createDraftBill(s, 'em-5', 'UAT review', USERS.finance).state
      const after = s.bills.emails.find((m) => m.id === 'em-5')!
      return { pass: held === 'Needs review' && after.status === 'Draft bill created' && s.bills.xeroBills[0].status === 'Draft', actual: `${held} → ${after.status}` }
    },
  },
  {
    id: 'UAT-16', area: 'Resilience', name: 'Validation error is paused until the data is fixed',
    expected: 'Retry refused while Settlement Date is missing; succeeds after the fix',
    run: () => {
      let s = sandbox()
      const ev = s.events.find((e) => e.errorClass === 'Validation')!
      const before = s.events.length
      s = replayEvent(s, ev.id).state
      const refused = s.events.length === before
      s = markEventFixed(s, ev.id).state
      s = replayEvent(s, ev.id).state
      return { pass: refused && s.events[0].status === 'success' && s.events[0].idempotencyKey === ev.idempotencyKey, actual: `${refused ? 'refused while missing' : 'retried early!'} → after fix ${s.events[0].status}` }
    },
  },
  {
    id: 'UAT-17', area: 'Resilience', name: 'Retryable Xero failure (LOT-024) succeeds on retry',
    expected: 'Attempt 2 succeeds; a further replay is skipped',
    run: () => {
      let s = sandbox()
      const ev = s.events.find((e) => e.errorClass === 'Retryable')!
      s = replayEvent(s, ev.id).state
      const ok = s.events[0].status === 'success' && s.events[0].attempt === 2
      s = replayEvent(s, ev.id).state
      return { pass: ok && s.events[0].status === 'duplicate', actual: `attempt ${s.events[1].attempt} ${s.events[1].status} → replay ${s.events[0].status}` }
    },
  },
]

export interface TestResult {
  id: string
  pass: boolean
  actual: string
  ms: number
}

export function runSuite(): TestResult[] {
  return TEST_CASES.map((t) => {
    const start = performance.now()
    try {
      const r = t.run()
      return { id: t.id, ...r, ms: performance.now() - start }
    } catch (e) {
      return { id: t.id, pass: false, actual: `Error: ${(e as Error).message}`, ms: performance.now() - start }
    }
  })
}
