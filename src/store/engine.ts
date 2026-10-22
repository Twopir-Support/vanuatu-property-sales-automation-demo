/**
 * Simulated integration engine.
 *
 * Every function is a pure transition `(state, now) => { state, notice }`. External side
 * effects (HubSpot upsert, contract generation, Xero invoice, Drive filing) are guarded by
 * idempotency keys stored in `processedKeys`, so replaying an event, double-clicking a
 * button or re-completing a step never creates duplicate records.
 */
import { IDS, USERS } from '../data/ids'
import { DOC_FILE, lotFolderTree } from '../data/seed'
import type {
  ActivityItem,
  AutomationEvent,
  DealStage,
  DemoState,
  DriveFile,
  HubSpotContact,
  HubSpotDeal,
  HubSpotTimelineItem,
  InvoiceLine,
  SystemId,
  XeroBill,
  Transaction,
  XeroInvoice,
} from '../data/types'
import { hash, uid, vt } from '../lib/format'

export type NoticeKind = 'success' | 'info' | 'warning' | 'error'
export interface Notice {
  kind: NoticeKind
  title: string
  message?: string
}
export interface Result {
  state: DemoState
  notice?: Notice
}

const nowIso = () => new Date().toISOString()
const fakeDuration = () => 380 + Math.floor(Math.random() * 1800)

function addActivity(s: DemoState, system: SystemId, actor: string, text: string): DemoState {
  const item: ActivityItem = { id: uid('act'), at: nowIso(), system, actor, text }
  return { ...s, activity: [item, ...s.activity] }
}

function addTimeline(s: DemoState, item: Omit<HubSpotTimelineItem, 'id' | 'at'>): DemoState {
  const entry: HubSpotTimelineItem = { id: uid('hs'), at: nowIso(), ...item }
  return { ...s, hubspot: { ...s.hubspot, timeline: [entry, ...s.hubspot.timeline] } }
}

function addEvent(s: DemoState, e: Omit<AutomationEvent, 'id' | 'at' | 'durationMs'> & { durationMs?: number }): DemoState {
  // Attempt n = failed runs already recorded for this key + 1 (resets once the key succeeds).
  const priorFailures = s.processedKeys.includes(e.idempotencyKey) ? 0 : s.events.filter((x) => x.idempotencyKey === e.idempotencyKey && x.status === 'failed').length
  const event: AutomationEvent = {
    id: uid('ev'), at: nowIso(), durationMs: e.durationMs ?? fakeDuration(),
    transaction: IDS.transaction, attempt: priorFailures + 1, ...e,
  }
  const processedKeys =
    e.status === 'success' && !s.processedKeys.includes(e.idempotencyKey)
      ? [...s.processedKeys, e.idempotencyKey]
      : s.processedKeys
  return { ...s, events: [event, ...s.events], processedKeys }
}

const isProcessed = (s: DemoState, key: string) => s.processedKeys.includes(key)

function duplicate(s: DemoState, base: Omit<AutomationEvent, 'id' | 'at' | 'durationMs' | 'status' | 'result'>, what: string): Result {
  const state = addEvent(s, {
    ...base,
    status: 'duplicate',
    durationMs: 40 + Math.floor(Math.random() * 60),
    result: `Idempotency key already processed — ${what}. No records created or changed.`,
  })
  return {
    state: addActivity(state, 'automation', USERS.integration, `Duplicate event suppressed (${base.idempotencyKey})`),
    notice: { kind: 'info', title: 'Duplicate event suppressed', message: `${what}. Nothing was created twice.` },
  }
}

function failed(s: DemoState, base: Omit<AutomationEvent, 'id' | 'at' | 'durationMs' | 'status' | 'result'>, target: string): Result {
  const state = addEvent(s, {
    ...base,
    status: 'failed',
    errorClass: 'Retryable',
    errorMessage: `${target} API returned 503 Service Unavailable.`,
    result: `${target} API returned 503 Service Unavailable (simulated). Retry policy: 3 attempts with exponential backoff, then alert.`,
  })
  return {
    state: addActivity(state, 'automation', USERS.integration, `${base.scenario} failed — queued for retry`),
    notice: { kind: 'error', title: `${target} sync failed (simulated)`, message: 'Open the Automation Monitor to retry. No partial records were written.' },
  }
}

/* ------------------------------------------------------------------ */
/* Transaction form                                                     */
/* ------------------------------------------------------------------ */

export function syncPayload(t: Transaction) {
  return {
    buyerId: t.buyerId,
    buyerName: t.buyerName,
    email: t.email.trim().toLowerCase(),
    phone: t.phone,
    lotId: t.lotId,
    project: t.project,
    amount: t.salePrice,
    currency: t.currency,
    owner: t.salesRep,
    settlementDate: t.settlementDate,
  }
}

export const syncHash = (t: Transaction) => hash(JSON.stringify(syncPayload(t)))

export function hubspotHasPendingChanges(s: DemoState) {
  return syncHash(s.transaction) !== s.hubspot.lastSyncedHash
}

const FIELD_LABELS: Record<keyof Transaction, string> = {
  id: 'Transaction ID',
  buyerId: 'Buyer ID',
  buyerName: 'Buyer name',
  email: 'Email',
  phone: 'Phone',
  project: 'Project',
  lotId: 'Lot ID',
  salePrice: 'Sale price',
  currency: 'Currency',
  salesRep: 'Sales representative',
  settlementDate: 'Settlement date',
  requiredDocuments: 'Required documents',
  country: 'Country',
}

export function updateTransaction(s: DemoState, patch: Partial<Transaction>): Result {
  const changed = (Object.keys(patch) as (keyof Transaction)[]).filter((k) => patch[k] !== s.transaction[k])
  if (changed.length === 0) return { state: s, notice: { kind: 'info', title: 'No changes to save' } }
  let state: DemoState = { ...s, transaction: { ...s.transaction, ...patch } }
  state = addActivity(state, 'process-street', USERS.sales, `Updated form fields: ${changed.map((k) => FIELD_LABELS[k]).join(', ')}`)
  const notice: Notice = { kind: 'success', title: 'Changes saved', message: 'HubSpot is ready to synchronize the updated fields.' }
  if (state.settings.autoSyncOnSave) {
    const r = syncHubSpot(state, 'Form saved (auto-sync on)')
    return { state: r.state, notice: r.notice ?? notice }
  }
  return { state, notice }
}

/* ------------------------------------------------------------------ */
/* HubSpot upsert                                                      */
/* ------------------------------------------------------------------ */

export function syncHubSpot(s: DemoState, trigger: string): Result {
  const t = s.transaction
  const payload = syncPayload(t)
  const key = `hs.upsert:${t.id}:${syncHash(t)}`
  const base = {
    scenario: ZAP.z1,
    trigger,
    source: 'process-street' as SystemId,
    target: 'hubspot' as SystemId,
    action: 'Formatter · find contact (Buyer ID → email) · create/update · find deal (Lot ID + Buyer ID) · create/update',
    idempotencyKey: key,
    payload,
  }
  if (isProcessed(s, key)) return duplicate(s, base, 'HubSpot already holds this exact payload')
  if (s.settings.simulateFailure) return failed(s, base, 'HubSpot')

  const now = nowIso()
  const [firstName, ...rest] = t.buyerName.trim().split(/\s+/)
  const lastName = rest.join(' ')

  // Contact matching: stable Buyer ID first, normalised email second.
  let contacts = [...s.hubspot.contacts]
  let contactIdx = contacts.findIndex((c) => c.buyerId === t.buyerId)
  let matchedBy = 'Buyer ID'
  if (contactIdx < 0) {
    contactIdx = contacts.findIndex((c) => c.email.toLowerCase() === payload.email)
    matchedBy = 'email'
  }
  let contactId: string
  let contactOutcome: string
  if (contactIdx >= 0) {
    const c = contacts[contactIdx]
    contactId = c.id
    contacts[contactIdx] = { ...c, buyerId: t.buyerId, firstName, lastName, email: payload.email, phone: t.phone, owner: t.salesRep, updatedAt: now }
    contactOutcome = `matched ${c.id} on ${matchedBy}`
  } else {
    contactId = `HS-C-${1002450 + contacts.length}`
    const created: HubSpotContact = {
      id: contactId, buyerId: t.buyerId, firstName, lastName, email: payload.email, phone: t.phone,
      lifecycleStage: 'Opportunity', leadStatus: 'In progress', owner: t.salesRep, country: t.country, createdAt: now, updatedAt: now,
    }
    contacts = [created, ...contacts]
    contactOutcome = `created ${contactId}`
  }

  // Deal uniqueness rule: one open deal per Lot ID + Buyer ID.
  let deals = [...s.hubspot.deals]
  const dealIdx = deals.findIndex((d) => d.lotId === t.lotId && d.buyerId === t.buyerId && d.stage !== 'Closed Won')
  let dealOutcome: string
  const dealName = `${t.lotId} — ${t.buyerName}`
  if (dealIdx >= 0) {
    const d = deals[dealIdx]
    deals[dealIdx] = { ...d, name: dealName, amount: t.salePrice, owner: t.salesRep, settlementDate: t.settlementDate, project: t.project, contactId, updatedAt: now }
    dealOutcome = `updated ${d.id}`
  } else {
    const created: HubSpotDeal = {
      id: `HS-D-${3008250 + deals.length}`, name: dealName, amount: t.salePrice, currency: 'VUV', pipeline: 'Lot Sales', stage: 'Contract Approval',
      lotId: t.lotId, buyerId: t.buyerId, project: t.project, country: t.country, owner: t.salesRep, settlementDate: t.settlementDate,
      createdAt: now, updatedAt: now, contactId,
    }
    deals = [created, ...deals]
    dealOutcome = `created ${created.id}`
  }

  let state: DemoState = {
    ...s,
    hubspot: { ...s.hubspot, contacts, deals, lastSyncedHash: syncHash(t), lastSyncedAt: now, duplicateCheck: 'Passed' },
  }
  state = addTimeline(state, { type: 'integration', title: 'Buyer record matched', body: `Contact ${contactOutcome}. Duplicate check passed.`, actor: USERS.integration })
  state = addTimeline(state, { type: 'integration', title: 'Deal record created or updated', body: `Deal ${dealOutcome} using rule Lot ID + Buyer ID. Amount ${vt(t.salePrice)}.`, actor: USERS.integration })
  state = addTimeline(state, { type: 'integration', title: 'Lot information synchronized', body: `${t.lotId} · ${t.project} · Settlement ${t.settlementDate}`, actor: USERS.integration })
  state = addEvent(state, { ...base, status: 'success', result: `Contact ${contactOutcome} · Deal ${dealOutcome} · 0 duplicates` })
  state = addActivity(state, 'hubspot', USERS.integration, `HubSpot synchronized — contact ${contactOutcome}, deal ${dealOutcome}`)
  return { state, notice: { kind: 'success', title: 'Synced to HubSpot', message: `Contact ${contactOutcome}; deal ${dealOutcome}. Duplicate check passed.` } }
}

/* ------------------------------------------------------------------ */
/* Flow 2: contract generation, review, signature, Drive filing         */
/* Flow 3: deal won → Xero draft invoice (filtered by business rules)   */
/* ------------------------------------------------------------------ */

/** Zap names as they appear in Zapier and in the run history. */
export const ZAP = {
  z1: 'Zap 1 · Lot-sale checklist → HubSpot buyer & deal',
  z2a: 'Zap 2A · Generate contract → Drive → review',
  z2b: 'Zap 2B · Contract approved → send for signature',
  z2c: 'Zap 2C · Contract signed → Drive + deal won',
  z3: 'Zap 3 · Deal won → Xero draft invoice',
  z4: 'Zap 4 · Xero payment → HubSpot',
  z5: 'Zap 5 · Settlement → HubSpot + Drive archive',
  bills: 'Zap 6 · Shared inboxes → Xero draft bills',
} as const

const allBefore = (s: DemoState, stepId: number) => s.steps.filter((x) => x.id < stepId).every((x) => x.status === 'complete')
const CONTRACTS_FOLDER = 'gd-025-ctr'

/** Zapier “Find folder, create if not found”: builds the transaction folder and copies the run's uploads into it. */
function ensureLotFolder(s: DemoState, now: string): { state: DemoState; created: boolean } {
  if (s.drive.files.some((f) => f.id === IDS.driveFolder)) return { state: s, created: false }
  const tree = lotFolderTree(s.transaction, now)
  const documents = s.documents.map((d) => {
    const f = tree.find((x) => x.id === DOC_FILE[d.id])
    return f ? { ...d, driveFileId: f.id } : d
  })
  return { state: { ...s, documents, drive: { files: [...s.drive.files, ...tree] } }, created: true }
}

export function generateContract(s: DemoState, trigger = 'Process Street: step 6 checked'): Result {
  const t = s.transaction
  const key = `contract.generate:${t.id}:v1`
  const base = {
    scenario: ZAP.z2a,
    trigger,
    source: 'process-street' as SystemId,
    target: 'drive' as SystemId,
    action: 'Find deal · find/create Drive folder · Google Docs template → draft · route for review',
    idempotencyKey: key,
    payload: { template: s.contract.template, buyer: t.buyerName, lotId: t.lotId, price: t.salePrice, settlementDate: t.settlementDate, dealId: IDS.hubspotDeal },
  }
  if (isProcessed(s, key)) return duplicate(s, base, `Contract ${IDS.contract} v1 already exists`)
  if (!allBefore(s, 6)) {
    const state = addEvent(s, { ...base, status: 'blocked', result: 'Filter: stopped — steps 1–5 must be complete (buyer & deal must exist in HubSpot).' })
    return { state, notice: { kind: 'warning', title: 'Contract generation blocked', message: 'Complete steps 1–5 first.' } }
  }
  if (s.settings.simulateFailure) return failed(s, base, 'Google Docs')

  const now = nowIso()
  const folder = ensureLotFolder(s, now)
  const fileId = 'gd-f-contract-v1'
  const file: DriveFile = {
    id: fileId,
    name: 'Sale Contract — Draft.pdf',
    type: 'pdf',
    parentId: CONTRACTS_FOLDER,
    owner: USERS.integration,
    modifiedAt: now,
    sizeKb: 96,
    label: 'Draft',
  }
  let state: DemoState = {
    ...folder.state,
    contract: { ...folder.state.contract, version: 1, status: 'Generated', generatedAt: now, driveFileId: fileId },
    documents: folder.state.documents.map((d) => (d.id === 'doc-contract' ? { ...d, status: 'Generated', driveFileId: fileId } : d)),
    drive: { files: [...folder.state.drive.files.filter((f) => f.id !== fileId), file] },
  }
  const folderNote = folder.created ? `Created folder “${t.lotId} — ${t.buyerName}” + 5 sub-folders, copied 3 supporting documents · ` : 'Folder found · '
  state = addEvent(state, { ...base, status: 'success', result: `${folderNote}draft ${file.name} saved to 04 Contracts · review task assigned to ${USERS.director}` })
  state = addTimeline(state, { type: 'integration', title: 'Contract generated', body: `${IDS.contract} v1 draft saved to Google Drive. Review requested from ${USERS.director}.`, actor: USERS.integration })
  if (folder.created) state = addActivity(state, 'drive', USERS.integration, `Folder “${t.lotId} — ${t.buyerName}” created; supporting documents saved`)
  state = addActivity(state, 'contracts', USERS.integration, `Contract ${IDS.contract} v1 draft generated from the approved template`)
  return { state, notice: { kind: 'success', title: 'Contract generated', message: `Draft saved to Drive › ${t.lotId} — ${t.buyerName} › 04 Contracts and routed for review.` } }
}

function depositLines(t: Transaction): InvoiceLine[] {
  return [
    { id: 'l1', item: 'LOT-DEP', description: `${t.project} — ${t.lotId}: 10% deposit on purchase price ${vt(t.salePrice)}`, qty: 1, unitPrice: Math.round(t.salePrice * 0.1), account: '610 - Customer Deposits', taxRate: 'Tax Exempt' },
    { id: 'l2', item: 'ADMIN', description: 'Contract administration fee', qty: 1, unitPrice: 45_000, account: '200 - Sales', taxRate: 'VAT 15%' },
  ]
}

export function approveContract(s: DemoState, approver: string, trigger = 'Process Street: step 7 approved'): Result {
  const t = s.transaction
  const key = `contract.approve:${t.id}:v${s.contract.version}`
  const base = {
    scenario: ZAP.z2b,
    trigger,
    source: 'process-street' as SystemId,
    target: 'contracts' as SystemId,
    action: 'Export approved PDF to Drive · send for e-signature · deal stage → Out for Signature',
    idempotencyKey: key,
    payload: { contractId: IDS.contract, version: s.contract.version, approver, signer: t.email },
  }
  if (s.contract.status === 'Not generated') {
    const state = addEvent(s, { ...base, status: 'blocked', result: 'Filter: stopped — no contract has been generated yet.' })
    return { state, notice: { kind: 'warning', title: 'Generate the contract first' } }
  }
  if (isProcessed(s, key)) return duplicate(s, base, `${IDS.contract} v${s.contract.version} already approved and sent`)
  if (s.settings.simulateFailure) return failed(s, base, 'E-signature')

  const now = nowIso()
  const approvedId = 'gd-f-contract-v1-approved'
  const approvedFile: DriveFile = { id: approvedId, name: 'Sale Contract — Approved.pdf', type: 'pdf', parentId: CONTRACTS_FOLDER, owner: USERS.integration, modifiedAt: now, sizeKb: 182, label: 'Approved' }
  let state: DemoState = {
    ...s,
    contract: { ...s.contract, status: 'Approved', approvedAt: now, approver, signature: 'Out for signature', sentAt: now, approvedFileId: approvedId, reviewRequestedAt: s.contract.reviewRequestedAt ?? now },
    documents: s.documents.map((d) => (d.id === 'doc-contract' ? { ...d, status: 'Approved', driveFileId: approvedId } : d)),
    drive: { files: [...s.drive.files.filter((f) => f.id !== approvedId), approvedFile] },
    hubspot: { ...s.hubspot, deals: s.hubspot.deals.map((d) => (d.id === IDS.hubspotDeal ? { ...d, stage: 'Out for Signature' as DealStage, updatedAt: now } : d)) },
  }
  state = addEvent(state, { ...base, status: 'success', result: `Approved PDF saved to 04 Contracts · sent to ${t.email} for signature · deal → Out for Signature` })
  state = addTimeline(state, { type: 'stage', title: 'Deal stage changed', body: `Contract Approval → Out for Signature (approved by ${approver})`, actor: USERS.integration })
  state = addTimeline(state, { type: 'email', title: 'Contract sent for signature', body: `${IDS.contract} v${s.contract.version} sent to ${t.buyerName} via e-signature (simulated).`, actor: USERS.integration })
  state = addActivity(state, 'contracts', approver, `Approved contract ${IDS.contract} v${s.contract.version}; sent to buyer for signature`)
  return { state, notice: { kind: 'success', title: 'Contract approved and sent for signature', message: 'Xero is still waiting: the invoice is only drafted once the deal is won.' } }
}

export function signContract(s: DemoState, trigger = 'E-signature: document completed'): Result {
  const t = s.transaction
  const key = `contract.signed:${t.id}:v${s.contract.version}`
  const base = {
    scenario: ZAP.z2c,
    trigger,
    source: 'contracts' as SystemId,
    target: 'hubspot' as SystemId,
    action: 'Save signed PDF to Drive · deal stage → Closed Won',
    idempotencyKey: key,
    payload: { contractId: IDS.contract, signer: t.buyerName, dealId: IDS.hubspotDeal },
  }
  if (s.contract.signature !== 'Out for signature' && s.contract.signature !== 'Signed') {
    const state = addEvent(s, { ...base, status: 'blocked', result: 'Filter: stopped — contract has not been approved and sent for signature.' })
    return { state, notice: { kind: 'warning', title: 'Approve the contract first', message: 'Only an approved contract is sent for signature.' } }
  }
  if (isProcessed(s, key)) return duplicate(s, base, 'Signed contract already filed')
  if (s.settings.simulateFailure) return failed(s, base, 'Google Drive')

  const now = nowIso()
  const signedId = 'gd-f-contract-v1-signed'
  const signedFile: DriveFile = { id: signedId, name: 'Sale Contract — Signed.pdf', type: 'pdf', parentId: CONTRACTS_FOLDER, owner: USERS.integration, modifiedAt: now, sizeKb: 240, label: 'Signed' }
  let state: DemoState = {
    ...s,
    contract: { ...s.contract, signature: 'Signed', signedAt: now, signedFileId: signedId },
    documents: s.documents.map((d) => (d.id === 'doc-contract' ? { ...d, status: 'Signed', driveFileId: signedId } : d)),
    drive: { files: [...s.drive.files.filter((f) => f.id !== signedId), signedFile] },
  }
  state = addEvent(state, { ...base, status: 'success', result: `Signed PDF saved to 04 Contracts · deal ${IDS.hubspotDeal} → Closed Won` })
  state = addTimeline(state, { type: 'integration', title: 'Contract signed by buyer', body: `${t.buyerName} signed ${IDS.contract} v${s.contract.version}. Signed PDF saved to Google Drive.`, actor: USERS.integration })
  state = addActivity(state, 'contracts', t.buyerName, `Signed contract ${IDS.contract} (e-signature, simulated)`)
  const won = setDealStage(state, IDS.hubspotDeal, 'Closed Won', USERS.integration)
  return { state: won.state, notice: { kind: 'success', title: 'Contract signed — deal won', message: won.notice?.message } }
}

export interface InvoiceRule {
  label: string
  pass: boolean
  detail: string
}

/** The business rules Zap 3’s filter checks before anything is created in Xero. */
export function invoiceRules(s: DemoState): InvoiceRule[] {
  const deal = s.hubspot.deals.find((d) => d.id === IDS.hubspotDeal)
  return [
    { label: 'Deal stage is Closed Won', pass: deal?.stage === 'Closed Won', detail: `Stage: ${deal?.stage ?? '—'}` },
    { label: 'Contract approved internally', pass: s.contract.status === 'Approved', detail: s.contract.approver ? `By ${s.contract.approver}` : 'Not approved' },
    { label: 'Contract signed by buyer', pass: s.contract.signature === 'Signed', detail: s.contract.signature },
    { label: 'Buyer ID present', pass: !!deal?.buyerId, detail: deal?.buyerId || '—' },
    { label: 'Lot ID present', pass: !!deal?.lotId, detail: deal?.lotId || '—' },
    { label: 'Amount > 0', pass: (deal?.amount ?? 0) > 0, detail: deal ? vt(deal.amount) : '—' },
    { label: 'Currency VUV', pass: deal?.currency === 'VUV', detail: deal?.currency ?? '—' },
    { label: 'Existing invoice? No', pass: !deal?.xeroInvoice, detail: deal?.xeroInvoice ?? 'None linked' },
  ]
}

export function createXeroInvoice(s: DemoState, trigger: string): Result {
  const t = s.transaction
  const key = `xero.invoice:${t.id}:deposit`
  const base = {
    scenario: ZAP.z3,
    trigger,
    source: 'hubspot' as SystemId,
    target: 'xero' as SystemId,
    action: 'Filter rules · find/create Xero contact · create DRAFT invoice · update deal',
    idempotencyKey: key,
    payload: { dealId: IDS.hubspotDeal, contact: t.buyerName, email: t.email, reference: t.lotId, amount: Math.round(t.salePrice * 0.1) },
  }
  if (isProcessed(s, key)) return duplicate(s, base, `Invoice ${IDS.xeroInvoice} already exists`)
  const failedRules = invoiceRules(s).filter((r) => !r.pass && r.label !== 'Existing invoice? No')
  if (failedRules.length) {
    const state = addEvent(s, { ...base, status: 'blocked', result: `Filter: stopped — not met: ${failedRules.map((r) => r.label.toLowerCase()).join('; ')}. Nothing created in Xero.` })
    return { state, notice: { kind: 'warning', title: 'Zap 3 stopped by filter', message: `Not created in Xero: ${failedRules[0].label.toLowerCase()} is not met.` } }
  }
  if (s.settings.simulateFailure) return failed(s, base, 'Xero')

  const now = nowIso()
  const due = new Date()
  due.setDate(due.getDate() + 7)
  const existing = s.xero.contacts.find((c) => c.email.toLowerCase() === t.email.toLowerCase())
  const contacts = existing
    ? s.xero.contacts
    : [{ id: IDS.xeroContact, name: t.buyerName, email: t.email, phone: t.phone, accountNumber: t.buyerId, address: 'Port Vila, Shefa Province, Vanuatu' }, ...s.xero.contacts]
  const invoice: XeroInvoice = {
    number: IDS.xeroInvoice,
    contactId: existing?.id ?? IDS.xeroContact,
    contactName: t.buyerName,
    reference: t.lotId,
    date: now,
    dueDate: due.toISOString(),
    status: 'Draft',
    lines: depositLines(t),
    history: [
      { at: now, user: USERS.integration, action: 'Created', detail: `Draft invoice created by Zap 3 when HubSpot deal ${IDS.hubspotDeal} was won (contract approved and signed).` },
      ...(existing ? [] : [{ at: now, user: USERS.integration, action: 'Contact created', detail: `${t.buyerName} (account ${t.buyerId}) — no existing contact matched on email.` }]),
    ],
  }
  let state: DemoState = {
    ...s,
    xero: { ...s.xero, contacts, invoice },
    hubspot: { ...s.hubspot, deals: s.hubspot.deals.map((d) => (d.id === IDS.hubspotDeal ? { ...d, xeroInvoice: IDS.xeroInvoice, updatedAt: now } : d)) },
  }
  state = addEvent(state, { ...base, status: 'success', result: `All ${invoiceRules(s).length} rules passed · ${existing ? 'contact matched' : `contact created (${IDS.xeroContact})`} · DRAFT ${IDS.xeroInvoice} ${vt(t.salePrice * 0.1 + 45_000 * 1.15)} · deal updated with invoice number` })
  state = addTimeline(state, { type: 'integration', title: 'Deposit invoice drafted in Xero', body: `${IDS.xeroInvoice} (Draft) · reference ${invoice.reference}`, actor: USERS.integration })
  state = addActivity(state, 'xero', USERS.integration, `Draft invoice ${IDS.xeroInvoice} created in Xero`)
  return { state, notice: { kind: 'success', title: 'Xero draft invoice created', message: `${IDS.xeroInvoice} is waiting for finance approval.` } }
}

export function requestContractChanges(s: DemoState, user: string, text: string): Result {
  const now = nowIso()
  let state: DemoState = { ...s, contract: { ...s.contract, comments: [{ at: now, user, text }, ...s.contract.comments] } }
  state = addActivity(state, 'contracts', user, `Requested changes to ${IDS.contract}: “${text}”`)
  state = addTimeline(state, { type: 'task', title: 'Task: revise sale contract', body: text, actor: user })
  return { state, notice: { kind: 'info', title: 'Change request recorded', message: 'A HubSpot task was created for the sales rep.' } }
}

export function completeSale(s: DemoState, trigger = 'Process Street: step 8 checked'): Result {
  const t = s.transaction
  const key = `sale.complete:${t.id}`
  const base = {
    scenario: ZAP.z5,
    trigger,
    source: 'process-street' as SystemId,
    target: 'hubspot' as SystemId,
    action: 'Mark settled · contact → Customer · archive Drive folder',
    idempotencyKey: key,
    payload: { dealId: IDS.hubspotDeal, settlementDate: t.settlementDate },
  }
  if (isProcessed(s, key)) return duplicate(s, base, 'Sale already marked settled')
  if (s.contract.signature !== 'Signed') {
    const state = addEvent(s, { ...base, status: 'blocked', result: 'Filter: stopped — contract is not signed.' })
    return { state, notice: { kind: 'warning', title: 'Contract must be signed before settlement' } }
  }
  if (s.settings.simulateFailure) return failed(s, base, 'HubSpot')
  const now = nowIso()
  let state: DemoState = {
    ...s,
    saleCompleted: true,
    hubspot: {
      ...s.hubspot,
      contacts: s.hubspot.contacts.map((c) => (c.buyerId === t.buyerId ? { ...c, lifecycleStage: 'Customer', updatedAt: now } : c)),
    },
    drive: { files: s.drive.files.map((f) => (f.id === IDS.driveFolder ? { ...f, label: 'Completed', modifiedAt: now } : f)) },
  }
  state = addEvent(state, { ...base, status: 'success', result: 'Settlement recorded on deal · contact lifecycle → Customer · Drive folder labelled Completed' })
  state = addTimeline(state, { type: 'integration', title: 'Settlement completed', body: `Settlement confirmed for ${t.lotId}. Contact lifecycle → Customer.`, actor: USERS.integration })
  state = addActivity(state, 'process-street', USERS.finance, 'Sale completion confirmed — LOT-025 settled')
  return { state, notice: { kind: 'success', title: 'Sale settled', message: 'HubSpot updated; Drive folder archived.' } }
}

/* ------------------------------------------------------------------ */
/* Workflow steps                                                       */
/* ------------------------------------------------------------------ */

export function toggleStep(s: DemoState, stepId: number, user: string): Result {
  const step = s.steps.find((x) => x.id === stepId)
  if (!step) return { state: s }
  const now = nowIso()

  if (step.status === 'complete') {
    const state = addActivity(
      { ...s, steps: s.steps.map((x) => (x.id === stepId ? { ...x, status: 'pending', completedAt: undefined, completedBy: undefined } : x)) },
      'process-street',
      user,
      `Reopened “${step.title}” — downstream records are kept (no destructive rollback)`,
    )
    return { state, notice: { kind: 'info', title: 'Step reopened', message: 'Re-completing it will not create duplicate records.' } }
  }

  if (s.settings.enforceStopTasks && step.stop && !allBefore(s, stepId)) {
    return { state: s, notice: { kind: 'warning', title: 'Stop task', message: `Complete all earlier steps before “${step.title}”.` } }
  }
  if (stepId === 8 && s.settings.enforceStopTasks && !allBefore(s, 8)) {
    return { state: s, notice: { kind: 'warning', title: 'Contract must be approved first' } }
  }

  let r: Result = { state: s }
  if (stepId === 5) r = syncHubSpot(s, 'Step 5 “CRM record synchronized” completed')
  if (stepId === 6) r = generateContract(s)
  if (stepId === 7) r = approveContract(s, user)
  if (stepId === 8) r = completeSale(s)

  const ev = r.state.events[0]
  const sideEffectFailed = r.state !== s && ev && (ev.status === 'failed' || ev.status === 'blocked') && r.state.events.length > s.events.length
  if (sideEffectFailed) return r

  let state: DemoState = {
    ...r.state,
    steps: r.state.steps.map((x) => (x.id === stepId ? { ...x, status: 'complete', completedAt: now, completedBy: user } : x)),
  }
  state = addActivity(state, 'process-street', user, `Completed “${step.title}”`)
  return { state, notice: r.notice ?? { kind: 'success', title: `Completed “${step.title}”` } }
}

/* ------------------------------------------------------------------ */
/* Xero                                                                 */
/* ------------------------------------------------------------------ */

export function updateInvoiceLines(s: DemoState, lines: InvoiceLine[]): Result {
  if (!s.xero.invoice) return { state: s }
  const inv = s.xero.invoice
  const state: DemoState = {
    ...s,
    xero: { ...s.xero, invoice: { ...inv, lines, history: [{ at: nowIso(), user: USERS.finance, action: 'Edited', detail: 'Line items updated' }, ...inv.history] } },
  }
  return { state: addActivity(state, 'xero', USERS.finance, `Edited draft ${inv.number}`), notice: { kind: 'success', title: 'Draft saved' } }
}

export function setInvoiceStatus(s: DemoState, status: XeroInvoice['status']): Result {
  const inv = s.xero.invoice
  if (!inv) return { state: s }
  const action = status === 'Awaiting Approval' ? 'Submitted for approval' : status === 'Awaiting Payment' ? 'Approved' : status === 'Paid' ? 'Payment received' : 'Edited'
  let state: DemoState = {
    ...s,
    xero: { ...s.xero, invoice: { ...inv, status, history: [{ at: nowIso(), user: USERS.finance, action, detail: `Status → ${status}` }, ...inv.history] } },
  }
  state = addActivity(state, 'xero', USERS.finance, `${inv.number}: ${action}`)
  if (status === 'Paid') {
    state = addTimeline(state, { type: 'integration', title: 'Deposit payment received', body: `${inv.number} marked Paid in Xero`, actor: USERS.integration })
    state = addEvent(state, {
      scenario: ZAP.z4, trigger: `${inv.number} paid`, source: 'xero', target: 'hubspot', action: 'Log payment on deal',
      idempotencyKey: `xero.paid:${inv.number}`, status: 'success', result: `Timeline note added to ${IDS.hubspotDeal}`, payload: { invoice: inv.number },
    })
  }
  return { state, notice: { kind: 'success', title: `${inv.number}: ${action}` } }
}

/* ------------------------------------------------------------------ */
/* Replay / retry                                                       */
/* ------------------------------------------------------------------ */

export function replayEvent(s: DemoState, eventId: string): Result {
  const ev = s.events.find((e) => e.id === eventId)
  if (!ev) return { state: s }
  const trigger = ev.status === 'failed' ? `Manual retry of ${ev.id}` : `Manual replay of ${ev.id}`
  if (ev.transaction && ev.transaction !== IDS.transaction) return retryOtherTransaction(s, ev)
  if (isProcessed(s, ev.idempotencyKey)) {
    return duplicate(s, { scenario: ev.scenario, trigger, source: ev.source, target: ev.target, action: ev.action, idempotencyKey: ev.idempotencyKey, payload: ev.payload }, 'This event was already processed successfully')
  }
  const k = ev.idempotencyKey
  if (k.startsWith('hs.upsert')) {
    const r = syncHubSpot(s, trigger)
    return markStepIfDone(r, 5)
  }
  if (k.startsWith('contract.generate')) return markStepIfDone(generateContract(s, trigger), 6)
  if (k.startsWith('contract.approve')) return markStepIfDone(approveContract(s, USERS.director, trigger), 7)
  if (k.startsWith('contract.signed')) return signContract(s, trigger)
  if (k.startsWith('xero.invoice')) return createXeroInvoice(s, trigger)
  if (k.startsWith('sale.complete')) return markStepIfDone(completeSale(s, trigger), 8)
  if (k.startsWith('xero.bill:')) {
    const email = s.bills.emails.find((m) => m.id === ev.payload.emailId)
    if (email) return createDraftBill(s, email.id, trigger)
  }
  if (k.startsWith('contract.queue')) {
    return { state: s, notice: { kind: 'info', title: 'Still waiting', message: 'This event resolves when step 6 is completed.' } }
  }
  return { state: s, notice: { kind: 'info', title: 'Nothing to replay' } }
}

function markStepIfDone(r: Result, stepId: number): Result {
  if (r.state.events[0]?.status !== 'success') return r
  return {
    ...r,
    state: { ...r.state, steps: r.state.steps.map((x) => (x.id === stepId && x.status !== 'complete' ? { ...x, status: 'complete', completedAt: nowIso(), completedBy: USERS.integration } : x)) },
  }
}

/* ------------------------------------------------------------------ */
/* HubSpot manual actions                                               */
/* ------------------------------------------------------------------ */

export function findDuplicateContact(s: DemoState, email: string, buyerId?: string) {
  const e = email.trim().toLowerCase()
  return s.hubspot.contacts.find((c) => (e && c.email.toLowerCase() === e) || (buyerId && c.buyerId === buyerId))
}

export function createHubSpotContact(s: DemoState, input: { firstName: string; lastName: string; email: string; phone: string }): Result {
  const dup = findDuplicateContact(s, input.email)
  if (dup) {
    const state = addEvent(s, {
      scenario: 'HubSpot contact create', trigger: 'Manual create', source: 'hubspot', target: 'hubspot', action: 'Create contact',
      idempotencyKey: `hs.contact:${input.email.trim().toLowerCase()}`, status: 'duplicate', durationMs: 55,
      result: `Blocked — email already belongs to ${dup.id} (${dup.firstName} ${dup.lastName})`, payload: input,
    })
    return { state, notice: { kind: 'warning', title: 'Duplicate prevented', message: `${input.email} already belongs to ${dup.firstName} ${dup.lastName}.` } }
  }
  const now = nowIso()
  const c: HubSpotContact = {
    id: `HS-C-${1002460 + s.hubspot.contacts.length}`, buyerId: '', firstName: input.firstName, lastName: input.lastName, email: input.email.trim().toLowerCase(),
    phone: input.phone, lifecycleStage: 'Lead', leadStatus: 'New', owner: USERS.sales, country: 'Vanuatu', createdAt: now, updatedAt: now,
  }
  const state = addActivity({ ...s, hubspot: { ...s.hubspot, contacts: [c, ...s.hubspot.contacts] } }, 'hubspot', USERS.sales, `Created contact ${c.firstName} ${c.lastName}`)
  return { state, notice: { kind: 'success', title: 'Contact created', message: `${c.id} (synthetic)` } }
}

export function addHubSpotNote(s: DemoState, text: string): Result {
  const state = addTimeline(s, { type: 'note', title: 'Note', body: text, actor: USERS.sales })
  return { state, notice: { kind: 'success', title: 'Note added' } }
}

export function setDealStage(s: DemoState, dealId: string, stage: DealStage, actor: string = USERS.sales): Result {
  const deal = s.hubspot.deals.find((d) => d.id === dealId)
  if (!deal || deal.stage === stage) return { state: s }
  let state: DemoState = { ...s, hubspot: { ...s.hubspot, deals: s.hubspot.deals.map((d) => (d.id === dealId ? { ...d, stage, updatedAt: nowIso() } : d)) } }
  if (dealId === IDS.hubspotDeal) state = addTimeline(state, { type: 'stage', title: 'Deal stage changed', body: `${deal.stage} → ${stage}`, actor })
  state = addActivity(state, 'hubspot', actor, `${deal.name}: stage ${deal.stage} → ${stage}`)
  // Zap 3 trigger: HubSpot “Updated Deal Stage” = Closed Won. Its filter decides whether Xero is touched.
  if (dealId === IDS.hubspotDeal && stage === 'Closed Won') {
    const z3 = createXeroInvoice(state, `HubSpot: deal stage → Closed Won (by ${actor})`)
    return { state: z3.state, notice: { kind: z3.notice?.kind ?? 'success', title: `Deal won · ${z3.notice?.title ?? ''}`, message: z3.notice?.message } }
  }
  return { state, notice: { kind: 'success', title: 'Deal stage updated', message: `${deal.name} → ${stage}` } }
}

/* ------------------------------------------------------------------ */
/* Drive                                                                */
/* ------------------------------------------------------------------ */

export function createDriveFolder(s: DemoState, parentId: string, name: string): Result {
  const now = nowIso()
  const f: DriveFile = { id: uid('gd'), name, type: 'folder', parentId, owner: USERS.sales, modifiedAt: now }
  const state = addActivity({ ...s, drive: { files: [...s.drive.files, f] } }, 'drive', USERS.sales, `Created folder “${name}”`)
  return { state, notice: { kind: 'success', title: 'Folder created', message: name } }
}

export function uploadDriveFile(s: DemoState, parentId: string, name: string, sizeKb: number): Result {
  const now = nowIso()
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const type: DriveFile['type'] = ext === 'pdf' ? 'pdf' : ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) ? 'image' : ['xlsx', 'csv', 'xls'].includes(ext) ? 'sheet' : 'doc'
  const f: DriveFile = { id: uid('gd'), name, type, parentId, owner: USERS.sales, modifiedAt: now, sizeKb: Math.max(1, Math.round(sizeKb)), label: 'Uploaded', preview: [`${name}`, 'Uploaded during the demo. Only the file name and size are kept, in this browser.'] }
  const state = addActivity({ ...s, drive: { files: [...s.drive.files, f] } }, 'drive', USERS.sales, `Uploaded “${name}”`)
  return { state }
}

export function toggleStar(s: DemoState, id: string): Result {
  return { state: { ...s, drive: { files: s.drive.files.map((f) => (f.id === id ? { ...f, starred: !f.starred } : f)) } } }
}

/* ------------------------------------------------------------------ */
/* Phase 2: supplier invoices from shared inboxes → Xero draft bills    */
/* ------------------------------------------------------------------ */

/** Confidence below this needs a person to check the extracted fields first. */
export const REVIEW_THRESHOLD = 0.85

export const billKey = (supplierId: string, invoiceNumber: string) => `xero.bill:${supplierId}:${invoiceNumber.trim().toUpperCase()}`

export function createDraftBill(s: DemoState, emailId: string, trigger = 'New email in shared inbox', reviewedBy?: string): Result {
  const email = s.bills.emails.find((m) => m.id === emailId)
  if (!email) return { state: s }
  const x = email.extracted
  const key = billKey(x.supplierId, x.invoiceNumber)
  const base = {
    scenario: ZAP.bills,
    trigger,
    source: 'inbox' as SystemId,
    target: 'xero' as SystemId,
    action: 'Extract invoice · match supplier · create DRAFT bill',
    idempotencyKey: key,
    payload: { emailId, inbox: email.inbox, supplier: x.supplier, invoiceNumber: x.invoiceNumber, total: x.total, confidence: x.confidence },
  }
  const setEmail = (st: DemoState, patch: Partial<typeof email>): DemoState => ({
    ...st,
    bills: { ...st.bills, emails: st.bills.emails.map((m) => (m.id === emailId ? { ...m, ...patch } : m)) },
  })

  // Same supplier + invoice number already in Xero (e.g. the same PDF sent to both inboxes).
  const existing = s.bills.xeroBills.find((b) => billKey(supplierIdFor(s, b.supplier, x), b.invoiceNumber) === key)
  if (isProcessed(s, key) || existing) {
    const r = duplicate(setEmail(s, { status: 'Duplicate', billId: existing?.id }), base, `Bill ${x.invoiceNumber} from ${x.supplier} already exists in Xero`)
    return r
  }
  if (x.confidence < REVIEW_THRESHOLD && !reviewedBy) {
    let state = setEmail(s, { status: 'Needs review' })
    state = addEvent(state, { ...base, status: 'blocked', result: `Held for review: extraction confidence ${(x.confidence * 100).toFixed(0)}%${x.dueDate ? '' : ', due date missing'}` })
    return { state, notice: { kind: 'warning', title: 'Held for review', message: `${x.supplier} ${x.invoiceNumber}: low-confidence extraction needs a person to check it.` } }
  }
  if (s.settings.simulateFailure) return failed(s, base, 'Xero')

  const due = x.dueDate ?? new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)
  const bill: XeroBill = {
    id: uid('bill'), invoiceNumber: x.invoiceNumber, supplier: x.supplier, date: x.invoiceDate, dueDate: due,
    reference: email.subject.replace(/^FW:\s*/i, '').slice(0, 60), status: 'Draft', subtotal: x.subtotal, tax: x.tax, total: x.total,
    account: x.account, source: `Email to ${email.inbox}@ · PDF attached${reviewedBy ? ` · reviewed by ${reviewedBy}` : ''}`,
  }
  let state = setEmail(s, { status: 'Draft bill created', billId: bill.id })
  state = { ...state, bills: { ...state.bills, xeroBills: [bill, ...state.bills.xeroBills] } }
  state = addEvent(state, { ...base, status: 'success', result: `Draft bill ${x.invoiceNumber} · ${x.supplier} · ${vt(x.total)} · PDF attached` })
  state = addActivity(state, 'xero', reviewedBy ?? USERS.integration, `Draft bill ${x.invoiceNumber} (${x.supplier}) created from ${email.inbox}@ inbox`)
  return { state, notice: { kind: 'success', title: 'Draft bill created in Xero', message: `${x.supplier} · ${x.invoiceNumber} · ${vt(x.total)}` } }
}

function supplierIdFor(s: DemoState, supplier: string, fallback: { supplier: string; supplierId: string }) {
  if (supplier === fallback.supplier) return fallback.supplierId
  return s.bills.emails.find((m) => m.extracted.supplier === supplier)?.extracted.supplierId ?? supplier
}

/** Process every new email in one inbox (or both), oldest first, as the scheduled scenario would. */
export function processInbox(s: DemoState, inbox?: InboxEmailInbox): Result {
  const pending = s.bills.emails
    .filter((m) => m.status === 'New' && (!inbox || m.inbox === inbox))
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
  if (pending.length === 0) return { state: s, notice: { kind: 'info', title: 'No new emails to process' } }
  let state = s
  for (const m of pending) state = createDraftBill(state, m.id, `Scheduled poll of ${m.inbox}@ inbox`).state
  const created = state.bills.emails.filter((m) => pending.some((p) => p.id === m.id) && m.status === 'Draft bill created').length
  const dups = state.bills.emails.filter((m) => pending.some((p) => p.id === m.id) && m.status === 'Duplicate').length
  const held = state.bills.emails.filter((m) => pending.some((p) => p.id === m.id) && m.status === 'Needs review').length
  return { state, notice: { kind: 'success', title: `Processed ${pending.length} email${pending.length > 1 ? 's' : ''}`, message: `${created} draft bills · ${dups} duplicates skipped · ${held} held for review` } }
}

type InboxEmailInbox = DemoState['bills']['emails'][number]['inbox']

export function setBillStatus(s: DemoState, billId: string, status: XeroBill['status']): Result {
  const bill = s.bills.xeroBills.find((b) => b.id === billId)
  if (!bill) return { state: s }
  const state = addActivity(
    { ...s, bills: { ...s.bills, xeroBills: s.bills.xeroBills.map((b) => (b.id === billId ? { ...b, status } : b)) } },
    'xero', USERS.finance, `Bill ${bill.invoiceNumber}: ${status}`,
  )
  return { state, notice: { kind: 'success', title: `Bill ${bill.invoiceNumber} → ${status}` } }
}

/* ------------------------------------------------------------------ */
/* Monitor: example failures on other transactions                      */
/* ------------------------------------------------------------------ */

/** Retry for the seeded LOT-024 / LOT-027 examples. Validation errors stay paused until fixed. */
function retryOtherTransaction(s: DemoState, ev: AutomationEvent): Result {
  if (isProcessed(s, ev.idempotencyKey)) {
    return duplicate(s, { scenario: ev.scenario, trigger: `Manual replay of ${ev.id}`, source: ev.source, target: ev.target, action: ev.action, idempotencyKey: ev.idempotencyKey, payload: ev.payload, transaction: ev.transaction }, 'This event was already processed successfully')
  }
  if (ev.errorClass === 'Validation' && !ev.fixed) {
    return { state: s, notice: { kind: 'warning', title: 'Validation error — not retried', message: `${ev.errorMessage ?? 'Required data missing'}. Fix the record first, then retry.` } }
  }
  const base = { scenario: ev.scenario, trigger: `Manual retry of ${ev.id}`, source: ev.source, target: ev.target, action: ev.action, idempotencyKey: ev.idempotencyKey, payload: ev.payload, transaction: ev.transaction }
  if (s.settings.simulateFailure) return failed(s, base, ev.target === 'xero' ? 'Xero' : 'HubSpot')
  const result = ev.errorClass === 'Validation'
    ? `Settlement date now present · ${ev.transaction} updated in HubSpot · 0 duplicates`
    : `Xero contact created for ${String(ev.payload.contact ?? 'buyer')} · DRAFT invoice created · reference written back to ${String(ev.payload.dealId ?? 'deal')}`
  let state = addEvent(s, { ...base, status: 'success', result })
  state = addActivity(state, 'automation', USERS.integration, `${ev.transaction}: ${ev.scenario.split(' · ')[0]} succeeded on retry`)
  return { state, notice: { kind: 'success', title: 'Retry succeeded', message: `${ev.transaction} · ${ev.scenario.split(' · ')[0]}` } }
}

export function assignEvent(s: DemoState, eventId: string, who: string): Result {
  const ev = s.events.find((e) => e.id === eventId)
  if (!ev) return { state: s }
  const state = addActivity({ ...s, events: s.events.map((e) => (e.id === eventId ? { ...e, assignedTo: who } : e)) }, 'automation', USERS.sales, `Assigned ${ev.id} (${ev.transaction}) to ${who}`)
  return { state, notice: { kind: 'success', title: `Assigned to ${who}` } }
}

export function markEventFixed(s: DemoState, eventId: string): Result {
  const state = { ...s, events: s.events.map((e) => (e.id === eventId ? { ...e, fixed: true } : e)) }
  return { state: addActivity(state, 'process-street', USERS.sales, 'Settlement date entered on run PS-RUN-0427 (LOT-027)'), notice: { kind: 'info', title: 'Data fixed', message: 'Settlement date added. The run can now be retried.' } }
}

/* ------------------------------------------------------------------ */
/* Workflow run: comments, uploads, contract review                     */
/* ------------------------------------------------------------------ */

export function addStepComment(s: DemoState, stepId: number, user: string, text: string): Result {
  const state = { ...s, stepComments: [...s.stepComments, { id: uid('cm'), stepId, user, text, at: nowIso() }] }
  return { state: addActivity(state, 'process-street', user, `Commented on step ${stepId}: “${text}”`), notice: { kind: 'success', title: 'Comment added' } }
}

export function uploadRunAttachment(s: DemoState, stepId: number, name: string, sizeKb: number, user: string): Result {
  const state = { ...s, runAttachments: [...s.runAttachments, { id: uid('att'), stepId, name, sizeKb: Math.max(1, Math.round(sizeKb)), user, at: nowIso() }] }
  return { state: addActivity(state, 'process-street', user, `Uploaded “${name}” to step ${stepId}`), notice: { kind: 'success', title: 'File attached', message: `${name} — kept on the run; Zap 2A copies run uploads to Drive.` } }
}

export function sendContractForReview(s: DemoState, user: string): Result {
  if (s.contract.status === 'Not generated') return { state: s, notice: { kind: 'warning', title: 'Generate the draft first' } }
  if (s.contract.reviewRequestedAt) return { state: s, notice: { kind: 'info', title: 'Already in internal review', message: `Assigned to ${USERS.director}.` } }
  const now = nowIso()
  let state: DemoState = { ...s, contract: { ...s.contract, reviewRequestedAt: now } }
  state = addTimeline(state, { type: 'task', title: 'Task: review sale contract', body: `${IDS.contract} v${s.contract.version} sent to ${USERS.director} for internal review.`, actor: user })
  state = addActivity(state, 'contracts', user, `Sent ${IDS.contract} v${s.contract.version} for internal review`)
  return { state, notice: { kind: 'success', title: 'Sent for internal review', message: `Approval task assigned to ${USERS.director} (step 7).` } }
}

/** New draft version while still in review (e.g. after a change request). Approved contracts are never regenerated. */
export function regenerateContract(s: DemoState, user: string): Result {
  const t = s.transaction
  if (s.contract.status !== 'Generated') {
    return { state: s, notice: { kind: 'warning', title: 'Cannot regenerate', message: s.contract.status === 'Approved' ? 'The contract is already approved.' : 'Generate the first draft from the workflow.' } }
  }
  const v = s.contract.version + 1
  const key = `contract.generate:${t.id}:v${v}`
  const base = { scenario: ZAP.z2a, trigger: `Regenerate requested by ${user}`, source: 'contracts' as SystemId, target: 'drive' as SystemId, action: `Populate template → draft v${v}`, idempotencyKey: key, payload: { version: v, template: s.contract.template } }
  if (isProcessed(s, key)) return duplicate(s, base, `Draft v${v} already exists`)
  const now = nowIso()
  const fileId = `gd-f-contract-v${v}`
  const file: DriveFile = { id: fileId, name: `Sale Contract — Draft v${v}.pdf`, type: 'pdf', parentId: 'gd-025-ctr', owner: USERS.integration, modifiedAt: now, sizeKb: 97, label: 'Draft' }
  let state: DemoState = {
    ...s,
    contract: { ...s.contract, version: v, generatedAt: now, driveFileId: fileId, reviewRequestedAt: undefined },
    documents: s.documents.map((d) => (d.id === 'doc-contract' ? { ...d, driveFileId: fileId } : d)),
    drive: { files: [...s.drive.files, file] },
  }
  state = addEvent(state, { ...base, status: 'success', result: `Draft v${v} saved to 04 Contracts · previous draft kept for audit` })
  state = addActivity(state, 'contracts', user, `Regenerated ${IDS.contract} as v${v}`)
  return { state, notice: { kind: 'success', title: `Draft v${v} generated`, message: 'Send it for review when ready.' } }
}

/** Reviewer rejects the draft outright: it goes back to the sales rep and must be regenerated. */
export function rejectContract(s: DemoState, user: string, reason: string): Result {
  if (s.contract.status !== 'Generated') return { state: s, notice: { kind: 'warning', title: 'Only a draft in review can be rejected' } }
  const now = nowIso()
  let state: DemoState = { ...s, contract: { ...s.contract, reviewRequestedAt: undefined, comments: [{ at: now, user, text: `Rejected — ${reason}` }, ...s.contract.comments] } }
  state = addTimeline(state, { type: 'task', title: 'Contract rejected — regenerate required', body: reason, actor: user })
  state = addActivity(state, 'contracts', user, `Rejected ${IDS.contract} v${s.contract.version}: “${reason}”`)
  return { state, notice: { kind: 'warning', title: 'Contract rejected', message: 'Returned to the sales rep. Regenerate the draft after fixing the data.' } }
}
