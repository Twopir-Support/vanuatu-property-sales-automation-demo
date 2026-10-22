/**
 * Simulated integration engine.
 *
 * Every function is a pure transition `(state, now) => { state, notice }`. External side
 * effects (HubSpot upsert, contract generation, Xero invoice, Drive filing) are guarded by
 * idempotency keys stored in `processedKeys`, so replaying an event, double-clicking a
 * button or re-completing a step never creates duplicate records.
 */
import { IDS, USERS } from '../data/ids'
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
  const event: AutomationEvent = { id: uid('ev'), at: nowIso(), durationMs: e.durationMs ?? fakeDuration(), ...e }
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
    scenario: 'Process Street → HubSpot upsert',
    trigger,
    source: 'process-street' as SystemId,
    target: 'hubspot' as SystemId,
    action: 'Upsert contact + deal',
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
/* Contract generation + approval                                      */
/* ------------------------------------------------------------------ */

const allBefore = (s: DemoState, stepId: number) => s.steps.filter((x) => x.id < stepId).every((x) => x.status === 'complete')

export function generateContract(s: DemoState, trigger = 'Step 6 completed'): Result {
  const t = s.transaction
  const key = `contract.generate:${t.id}:v1`
  const base = {
    scenario: 'Contract generation',
    trigger,
    source: 'process-street' as SystemId,
    target: 'drive' as SystemId,
    action: 'Merge Google Docs template → save to 04 Contracts',
    idempotencyKey: key,
    payload: { template: s.contract.template, buyer: t.buyerName, lotId: t.lotId, price: t.salePrice, settlementDate: t.settlementDate },
  }
  if (isProcessed(s, key)) return duplicate(s, base, `Contract ${IDS.contract} v1 already exists`)
  if (!allBefore(s, 6)) {
    const state = addEvent(s, { ...base, status: 'blocked', result: 'Blocked: steps 1–5 must be complete before a contract can be generated.' })
    return { state, notice: { kind: 'warning', title: 'Contract generation blocked', message: 'Complete steps 1–5 first.' } }
  }
  if (s.settings.simulateFailure) return failed(s, base, 'Google Docs')

  const now = nowIso()
  const fileId = 'gd-f-contract-v1'
  const file: DriveFile = {
    id: fileId,
    name: `${t.lotId}_SaleAgreement_v1_${t.buyerName.replace(/\s+/g, '')}`,
    type: 'doc',
    parentId: 'gd-025-ctr',
    owner: USERS.integration,
    modifiedAt: now,
    sizeKb: 96,
    label: 'Pending approval',
  }
  let state: DemoState = {
    ...s,
    contract: { ...s.contract, version: 1, status: 'Generated', generatedAt: now, driveFileId: fileId },
    documents: s.documents.map((d) => (d.id === 'doc-contract' ? { ...d, status: 'Generated', driveFileId: fileId } : d)),
    drive: { files: [...s.drive.files.filter((f) => f.id !== fileId), file].map((f) => (f.id === 'gd-025-ctr' || f.id === IDS.driveFolder ? { ...f, modifiedAt: now } : f)) },
  }
  state = addEvent(state, { ...base, status: 'success', result: `Created ${file.name} in “04 Contracts” · approval requested from ${USERS.director}` })
  state = addTimeline(state, { type: 'integration', title: 'Contract generated', body: `${IDS.contract} v1 saved to Google Drive. Approval requested from ${USERS.director}.`, actor: USERS.integration })
  state = addActivity(state, 'contracts', USERS.integration, `Contract ${IDS.contract} v1 generated and filed in Google Drive`)
  return { state, notice: { kind: 'success', title: 'Contract generated', message: `${IDS.contract} v1 saved to Drive › LOT-025 › 04 Contracts.` } }
}

function depositLines(t: Transaction): InvoiceLine[] {
  return [
    { id: 'l1', item: 'LOT-DEP', description: `${t.project} — ${t.lotId}: 10% deposit on purchase price ${vt(t.salePrice)}`, qty: 1, unitPrice: Math.round(t.salePrice * 0.1), account: '610 - Customer Deposits', taxRate: 'Tax Exempt' },
    { id: 'l2', item: 'ADMIN', description: 'Contract administration fee', qty: 1, unitPrice: 45_000, account: '200 - Sales', taxRate: 'VAT 15%' },
  ]
}

export function createXeroInvoice(s: DemoState, trigger: string): Result {
  const t = s.transaction
  const key = `xero.invoice:${t.id}:deposit`
  const base = {
    scenario: 'Contract approved → Xero draft invoice',
    trigger,
    source: 'hubspot' as SystemId,
    target: 'xero' as SystemId,
    action: 'Find-or-create contact · create DRAFT invoice',
    idempotencyKey: key,
    payload: { contact: t.buyerName, email: t.email, reference: `${t.lotId} Deposit · ${IDS.hubspotDeal}`, amount: Math.round(t.salePrice * 0.1) },
  }
  if (isProcessed(s, key)) return duplicate(s, base, `Invoice ${IDS.xeroInvoice} already exists`)
  if (s.contract.status !== 'Approved') {
    const state = addEvent(s, { ...base, status: 'blocked', result: 'Blocked: waiting for sales milestone “Contract approved”.' })
    return { state, notice: { kind: 'warning', title: 'Xero is waiting for the contract-approved milestone' } }
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
    reference: `${t.lotId} Deposit · ${IDS.hubspotDeal}`,
    date: now,
    dueDate: due.toISOString(),
    status: 'Draft',
    lines: depositLines(t),
    history: [
      { at: now, user: USERS.integration, action: 'Created', detail: `Draft invoice created from HubSpot deal ${IDS.hubspotDeal} after contract approval.` },
      ...(existing ? [] : [{ at: now, user: USERS.integration, action: 'Contact created', detail: `${t.buyerName} (account ${t.buyerId}) — no existing contact matched on email.` }]),
    ],
  }
  let state: DemoState = { ...s, xero: { ...s.xero, contacts, invoice } }
  state = addEvent(state, { ...base, status: 'success', result: `${existing ? 'Contact matched' : `Contact created (${IDS.xeroContact})`} · Draft ${IDS.xeroInvoice} for ${vt(t.salePrice * 0.1 + 45_000 * 1.15)}` })
  state = addTimeline(state, { type: 'integration', title: 'Deposit invoice drafted in Xero', body: `${IDS.xeroInvoice} (Draft) · reference ${invoice.reference}`, actor: USERS.integration })
  state = addActivity(state, 'xero', USERS.integration, `Draft invoice ${IDS.xeroInvoice} created in Xero`)
  return { state, notice: { kind: 'success', title: 'Xero draft invoice created', message: `${IDS.xeroInvoice} is waiting for finance approval.` } }
}

export function approveContract(s: DemoState, approver: string, trigger = 'Step 7 approved'): Result {
  const t = s.transaction
  const key = `contract.approve:${t.id}:v${s.contract.version}`
  const base = {
    scenario: 'Contract approval → HubSpot stage',
    trigger,
    source: 'process-street' as SystemId,
    target: 'hubspot' as SystemId,
    action: 'Set deal stage = Contract Approved',
    idempotencyKey: key,
    payload: { contractId: IDS.contract, version: s.contract.version, approver },
  }
  if (s.contract.status === 'Not generated') {
    const state = addEvent(s, { ...base, status: 'blocked', result: 'Blocked: no contract has been generated yet.' })
    return { state, notice: { kind: 'warning', title: 'Generate the contract first' } }
  }
  if (isProcessed(s, key)) return duplicate(s, base, `${IDS.contract} v${s.contract.version} already approved`)
  if (s.settings.simulateFailure) return failed(s, base, 'HubSpot')

  const now = nowIso()
  let state: DemoState = {
    ...s,
    contract: { ...s.contract, status: 'Approved', approvedAt: now, approver },
    documents: s.documents.map((d) => (d.id === 'doc-contract' ? { ...d, status: 'Approved' } : d)),
    drive: { files: s.drive.files.map((f) => (f.id === s.contract.driveFileId ? { ...f, label: 'Approved', modifiedAt: now } : f)) },
    hubspot: { ...s.hubspot, deals: s.hubspot.deals.map((d) => (d.id === IDS.hubspotDeal ? { ...d, stage: 'Contract Approved' as DealStage, updatedAt: now } : d)) },
  }
  state = addEvent(state, { ...base, status: 'success', result: `Deal ${IDS.hubspotDeal} moved to Contract Approved` })
  state = addTimeline(state, { type: 'stage', title: 'Deal stage changed', body: `Contract Approval → Contract Approved (approved by ${approver})`, actor: USERS.integration })
  state = addActivity(state, 'contracts', approver, `Approved contract ${IDS.contract} v${s.contract.version}`)
  const xero = createXeroInvoice(state, 'Milestone: contract approved')
  return { state: xero.state, notice: { kind: 'success', title: 'Contract approved', message: `Deal moved to Contract Approved. ${xero.notice?.title ?? ''}.` } }
}

export function requestContractChanges(s: DemoState, user: string, text: string): Result {
  const now = nowIso()
  let state: DemoState = { ...s, contract: { ...s.contract, comments: [{ at: now, user, text }, ...s.contract.comments] } }
  state = addActivity(state, 'contracts', user, `Requested changes to ${IDS.contract}: “${text}”`)
  state = addTimeline(state, { type: 'task', title: 'Task: revise sale contract', body: text, actor: user })
  return { state, notice: { kind: 'info', title: 'Change request recorded', message: 'A HubSpot task was created for the sales rep.' } }
}

export function completeSale(s: DemoState, trigger = 'Step 8 completed'): Result {
  const t = s.transaction
  const key = `sale.complete:${t.id}`
  const base = {
    scenario: 'Sale completion',
    trigger,
    source: 'process-street' as SystemId,
    target: 'hubspot' as SystemId,
    action: 'Deal → Closed Won · archive Drive folder',
    idempotencyKey: key,
    payload: { dealId: IDS.hubspotDeal, settlementDate: t.settlementDate },
  }
  if (isProcessed(s, key)) return duplicate(s, base, 'Sale already marked complete')
  if (s.settings.simulateFailure) return failed(s, base, 'HubSpot')
  const now = nowIso()
  let state: DemoState = {
    ...s,
    saleCompleted: true,
    hubspot: {
      ...s.hubspot,
      deals: s.hubspot.deals.map((d) => (d.id === IDS.hubspotDeal ? { ...d, stage: 'Closed Won' as DealStage, updatedAt: now } : d)),
      contacts: s.hubspot.contacts.map((c) => (c.buyerId === t.buyerId ? { ...c, lifecycleStage: 'Customer', updatedAt: now } : c)),
    },
    drive: { files: s.drive.files.map((f) => (f.id === IDS.driveFolder ? { ...f, label: 'Completed', modifiedAt: now } : f)) },
  }
  state = addEvent(state, { ...base, status: 'success', result: `Deal ${IDS.hubspotDeal} Closed Won · contact lifecycle → Customer · Drive folder labelled Completed` })
  state = addTimeline(state, { type: 'stage', title: 'Deal stage changed', body: 'Contract Approved → Closed Won', actor: USERS.integration })
  state = addActivity(state, 'process-street', USERS.finance, 'Sale completion confirmed — LOT-025 sold')
  return { state, notice: { kind: 'success', title: 'Sale completed', message: 'HubSpot deal Closed Won; Drive folder archived.' } }
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
      scenario: 'Xero payment → HubSpot', trigger: `${inv.number} paid`, source: 'xero', target: 'hubspot', action: 'Log payment on deal',
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
  if (k.startsWith('xero.invoice')) return createXeroInvoice(s, trigger)
  if (k.startsWith('sale.complete')) return markStepIfDone(completeSale(s, trigger), 8)
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

export function setDealStage(s: DemoState, dealId: string, stage: DealStage): Result {
  const deal = s.hubspot.deals.find((d) => d.id === dealId)
  if (!deal || deal.stage === stage) return { state: s }
  let state: DemoState = { ...s, hubspot: { ...s.hubspot, deals: s.hubspot.deals.map((d) => (d.id === dealId ? { ...d, stage, updatedAt: nowIso() } : d)) } }
  if (dealId === IDS.hubspotDeal) state = addTimeline(state, { type: 'stage', title: 'Deal stage changed', body: `${deal.stage} → ${stage}`, actor: USERS.sales })
  state = addActivity(state, 'hubspot', USERS.sales, `${deal.name}: stage ${deal.stage} → ${stage}`)
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
