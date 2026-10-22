import { COMPANY, IDS, USERS } from './ids'
import type { DemoState, DriveFile, Transaction } from './types'
import { seedEmails, seedXeroBills } from './bills'

export const STATE_VERSION = 6

/** Today's date at a given time, as an ISO string. Seed data is anchored to "today". */
export function todayAt(h: number, m: number, dayOffset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

const contractPreview = [
  'RESIDENTIAL LOT SALE AGREEMENT — DRAFT (SYNTHETIC DEMO DOCUMENT)',
  `Vendor: ${COMPANY.name}, ${COMPANY.location}`,
  'Purchaser: Alex Morgan (Buyer ID BUY-0142)',
  `Property: ${COMPANY.development}, Lot ${IDS.lot}`,
  'Purchase price: VT 12,500,000 (VUV)',
  'Deposit: 10% payable within 7 days of contract approval',
  'Settlement date: 15 December 2026',
]

function seedDrive(): DriveFile[] {
  const o = USERS.sales
  return [
    { id: 'gd-root', name: 'Pacific Horizon Developments', type: 'folder', parentId: null, owner: 'Shared drive', modifiedAt: todayAt(9, 12, -40) },
    { id: 'gd-hvr', name: COMPANY.development, type: 'folder', parentId: 'gd-root', owner: o, modifiedAt: todayAt(9, 30, -12) },
    { id: 'gd-templates', name: 'Templates', type: 'folder', parentId: 'gd-root', owner: USERS.admin, modifiedAt: todayAt(14, 5, -60) },
    { id: 'gd-tpl-contract', name: 'Residential Lot Sale Agreement v2.1', type: 'doc', parentId: 'gd-templates', owner: USERS.admin, modifiedAt: todayAt(14, 5, -60), sizeKb: 84, preview: ['Template with merge fields: {{buyer_name}}, {{lot_id}}, {{sale_price}}, {{settlement_date}}', 'Synthetic demo template.'] },
    { id: 'gd-tpl-price', name: 'Harbour View — Price list 2026', type: 'sheet', parentId: 'gd-templates', owner: USERS.finance, modifiedAt: todayAt(11, 40, -21), sizeKb: 36 },
    { id: 'gd-lot023', name: 'LOT-023 — Jordan Lee', type: 'folder', parentId: 'gd-hvr', owner: o, modifiedAt: todayAt(16, 2, -9), label: 'Completed' },
    { id: 'gd-lot024', name: 'LOT-024 — Priya Nair', type: 'folder', parentId: 'gd-hvr', owner: o, modifiedAt: todayAt(10, 18, -3), label: 'Pending approval' },
    { id: 'gd-lot027', name: 'LOT-027 — Sam Tari', type: 'folder', parentId: 'gd-hvr', owner: o, modifiedAt: todayAt(15, 22, -1) },
  ]
}


/** Supporting documents uploaded to the Process Street run, keyed to the Drive file Zap 2A copies them to. */
export const DOC_FILE: Record<string, string> = {
  'doc-id': 'gd-f-passport',
  'doc-address': 'gd-f-address',
  'doc-application': 'gd-f-application',
}

/** The transaction folder Zap 2A creates (“find folder, create if not found”) with the run's uploads copied in. */
export function lotFolderTree(t: Transaction, now: string): DriveFile[] {
  return [
    { id: IDS.driveFolder, name: `${t.lotId} — ${t.buyerName}`, type: 'folder', parentId: 'gd-hvr', owner: USERS.integration, modifiedAt: now, label: 'Synced' },
    { id: 'gd-025-id', name: '01 Buyer identification', type: 'folder', parentId: IDS.driveFolder, owner: USERS.integration, modifiedAt: now },
    { id: 'gd-025-addr', name: '02 Proof of address', type: 'folder', parentId: IDS.driveFolder, owner: USERS.integration, modifiedAt: now },
    { id: 'gd-025-app', name: '03 Sale application', type: 'folder', parentId: IDS.driveFolder, owner: USERS.integration, modifiedAt: now },
    { id: 'gd-025-ctr', name: '04 Contracts', type: 'folder', parentId: IDS.driveFolder, owner: USERS.integration, modifiedAt: now },
    { id: 'gd-025-fin', name: '05 Finance', type: 'folder', parentId: IDS.driveFolder, owner: USERS.finance, modifiedAt: now },
    { id: 'gd-f-passport', name: `Buyer ID — ${t.buyerName}.pdf`, type: 'pdf', parentId: 'gd-025-id', owner: USERS.integration, modifiedAt: now, sizeKb: 412, label: 'Received', preview: ['IDENTIFICATION DOCUMENT — SYNTHETIC PLACEHOLDER', 'Name: Alex Morgan', 'Document no.: DEMO-000000', 'Verified by: Sarah Williams'] },
    { id: 'gd-f-address', name: 'Proof of Address.pdf', type: 'pdf', parentId: 'gd-025-addr', owner: USERS.integration, modifiedAt: now, sizeKb: 228, label: 'Received', preview: ['PROOF OF ADDRESS — SYNTHETIC PLACEHOLDER', 'Utility statement (demo)', 'Address: Example Street, Port Vila'] },
    { id: 'gd-f-application', name: 'Sale Application.pdf', type: 'pdf', parentId: 'gd-025-app', owner: USERS.integration, modifiedAt: now, sizeKb: 186, label: 'Received', preview: ['SALE APPLICATION — SYNTHETIC', `Development: ${COMPANY.development}`, 'Lot: LOT-025', 'Offer: VT 12,500,000', 'Applicant: Alex Morgan'] },
    { id: 'gd-f-plan', name: 'HVR_SitePlan_Lot025.png', type: 'image', parentId: 'gd-025-app', owner: USERS.admin, modifiedAt: now, sizeKb: 1640 },
  ]
}

export { contractPreview }

export function createSeedState(): DemoState {
  const t0 = (m: number) => todayAt(10, m)
  return {
    version: STATE_VERSION,
    transaction: {
      id: IDS.transaction,
      buyerId: IDS.buyer,
      buyerName: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phone: '+678 555 0142',
      project: COMPANY.development,
      lotId: IDS.lot,
      salePrice: 12_500_000,
      currency: 'VUV',
      salesRep: USERS.sales,
      settlementDate: '2026-12-15',
      requiredDocuments: 'Identification, Proof of address, Sale application, Sale contract',
      country: 'Vanuatu',
    },
    steps: [
      { id: 1, title: 'Buyer information collected', status: 'complete', assignee: USERS.sales, dueDate: todayAt(17, 0, -2), completedAt: todayAt(9, 35), completedBy: USERS.sales, kind: 'form', description: 'Capture buyer, lot and sale details. These form fields are the single source of truth that every downstream system reads from.' },
      { id: 2, title: 'Lot information verified', status: 'complete', assignee: USERS.admin, dueDate: todayAt(17, 0, -1), completedAt: todayAt(9, 38), completedBy: USERS.admin, kind: 'task', description: 'Confirm the lot is available on the release schedule and matches the survey plan for Harbour View Residences.' },
      { id: 3, title: 'Sale price confirmed', status: 'complete', assignee: USERS.director, dueDate: todayAt(17, 0, -1), completedAt: todayAt(9, 40), completedBy: USERS.director, kind: 'task', description: 'Check the agreed price against the 2026 price list and any approved discounts.' },
      { id: 4, title: 'Required documents received', status: 'complete', assignee: USERS.sales, dueDate: todayAt(17, 0), completedAt: todayAt(9, 48), completedBy: USERS.sales, kind: 'documents', description: 'Collect identification, proof of address and the signed sale application as file uploads on this run. Zap 2A copies them into the transaction’s Google Drive folder.' },
      { id: 5, title: 'CRM record synchronized', status: 'complete', assignee: USERS.integration, dueDate: todayAt(17, 0), completedAt: t0(4), completedBy: USERS.integration, kind: 'automation', description: 'Checking this task triggers Zap 1: find or create the buyer contact and lot deal in HubSpot using stable identifiers (Buyer ID, then email; Lot ID + Buyer ID for the deal). Re-running it never creates duplicates.' },
      { id: 6, title: 'Contract generated', status: 'pending', assignee: USERS.sales, dueDate: todayAt(17, 0, 1), kind: 'automation', stop: true, description: 'Checking this task triggers Zap 2A: find or create the transaction folder in Google Drive, populate the approved sale-contract template, save the draft to “04 Contracts” and route it for review.' },
      { id: 7, title: 'Contract approved', status: 'pending', assignee: USERS.director, dueDate: todayAt(17, 0, 3), kind: 'approval', stop: true, description: 'Director review of the draft. Approving triggers Zap 2B: the approved PDF is saved to Drive and sent to the buyer for e-signature. When the buyer signs, Zap 2C files the signed PDF and marks the HubSpot deal Closed Won — which triggers Zap 3 (Xero).' },
      { id: 8, title: 'Sale completion confirmed', status: 'pending', assignee: USERS.finance, dueDate: '2026-12-15T17:00:00.000Z', kind: 'task', description: 'Confirm settlement funds received and transfer documents lodged. Records settlement on the HubSpot deal and archives the Drive folder.' },
    ],
    documents: [
      { id: 'doc-id', name: 'Identification document', status: 'Received' },
      { id: 'doc-address', name: 'Proof of address', status: 'Received' },
      { id: 'doc-application', name: 'Sale application', status: 'Received' },
      { id: 'doc-contract', name: 'Sale contract', status: 'Awaiting generation' },
    ],
    activity: [
      { id: 'a1', at: t0(6), system: 'automation', actor: USERS.integration, text: 'Zap 2A waiting — contract is generated when step 6 is checked' },
      { id: 'a2', at: t0(5), system: 'process-street', actor: USERS.integration, text: 'Document requirements checked — 3 of 4 received' },
      { id: 'a3', at: t0(4), system: 'hubspot', actor: USERS.integration, text: 'Lot information synchronized to HubSpot deal HS-D-3008250' },
      { id: 'a4', at: t0(3), system: 'hubspot', actor: USERS.integration, text: 'Deal record created: LOT-025 — Alex Morgan' },
      { id: 'a5', at: t0(2), system: 'hubspot', actor: USERS.integration, text: 'Buyer record matched on Buyer ID BUY-0142' },
      { id: 'a6', at: todayAt(9, 48), system: 'process-street', actor: USERS.sales, text: 'Completed “Required documents received”' },
      { id: 'a7', at: todayAt(9, 44), system: 'process-street', actor: USERS.sales, text: 'Uploaded 3 supporting documents to the run (ID, proof of address, sale application)' },
      { id: 'a8', at: todayAt(9, 30), system: 'process-street', actor: USERS.sales, text: 'Run “Lot Sale — LOT-025” started from Residential Lot Sale workflow' },
    ],
    hubspot: {
      contacts: [
        { id: IDS.hubspotContact, buyerId: IDS.buyer, firstName: 'Alex', lastName: 'Morgan', email: 'alex.morgan@example.com', phone: '+678 555 0142', lifecycleStage: 'Opportunity', leadStatus: 'In progress', owner: USERS.sales, country: 'Vanuatu', createdAt: todayAt(14, 20, -6), updatedAt: t0(2) },
        { id: 'HS-C-1002311', buyerId: 'BUY-0131', firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@example.com', phone: '+678 555 0131', lifecycleStage: 'Opportunity', leadStatus: 'In progress', owner: USERS.sales, country: 'Vanuatu', createdAt: todayAt(11, 0, -14), updatedAt: todayAt(10, 18, -3) },
        { id: 'HS-C-1002198', buyerId: 'BUY-0119', firstName: 'Jordan', lastName: 'Lee', email: 'jordan.lee@example.com', phone: '+61 555 0119', lifecycleStage: 'Customer', leadStatus: 'Connected', owner: USERS.sales, country: 'Australia', createdAt: todayAt(9, 0, -40), updatedAt: todayAt(16, 2, -9) },
      ],
      deals: [
        { id: IDS.hubspotDeal, name: 'LOT-025 — Alex Morgan', amount: 12_500_000, currency: 'VUV', pipeline: 'Lot Sales', stage: 'Contract Approval', lotId: IDS.lot, buyerId: IDS.buyer, project: COMPANY.development, country: 'Vanuatu', owner: USERS.sales, settlementDate: '2026-12-15', createdAt: t0(3), updatedAt: t0(4), contactId: IDS.hubspotContact },
        { id: 'HS-D-3008240', name: 'LOT-024 — Priya Nair', amount: 11_900_000, currency: 'VUV', pipeline: 'Lot Sales', stage: 'Contract Approval', lotId: 'LOT-024', buyerId: 'BUY-0131', project: COMPANY.development, country: 'Vanuatu', owner: USERS.sales, settlementDate: '2026-11-30', createdAt: todayAt(11, 0, -14), updatedAt: todayAt(10, 18, -3), contactId: 'HS-C-1002311' },
        { id: 'HS-D-3008230', name: 'LOT-023 — Jordan Lee', amount: 13_200_000, currency: 'VUV', pipeline: 'Lot Sales', stage: 'Closed Won', lotId: 'LOT-023', buyerId: 'BUY-0119', project: COMPANY.development, country: 'Australia', owner: USERS.sales, settlementDate: '2026-10-10', createdAt: todayAt(9, 0, -40), updatedAt: todayAt(16, 2, -9), contactId: 'HS-C-1002198' },
        { id: 'HS-D-3008270', name: 'LOT-027 — Sam Tari', amount: 10_750_000, currency: 'VUV', pipeline: 'Lot Sales', stage: 'Lot Reserved', lotId: 'LOT-027', buyerId: 'BUY-0150', project: COMPANY.development, country: 'Vanuatu', owner: USERS.sales, settlementDate: '2027-02-01', createdAt: todayAt(15, 22, -1), updatedAt: todayAt(15, 22, -1), contactId: '' },
        { id: 'HS-D-3008290', name: 'LOT-029 — Enquiry', amount: 9_800_000, currency: 'VUV', pipeline: 'Lot Sales', stage: 'Enquiry', lotId: 'LOT-029', buyerId: '', project: COMPANY.development, country: 'New Caledonia', owner: USERS.sales, settlementDate: '2027-03-01', createdAt: todayAt(13, 5, -2), updatedAt: todayAt(13, 5, -2), contactId: '' },
        { id: 'HS-D-3008210', name: 'LOT-021 — Documents', amount: 12_100_000, currency: 'VUV', pipeline: 'Lot Sales', stage: 'Documents Received', lotId: 'LOT-021', buyerId: '', project: COMPANY.development, country: 'Vanuatu', owner: USERS.sales, settlementDate: '2027-01-20', createdAt: todayAt(10, 5, -7), updatedAt: todayAt(10, 5, -2), contactId: '' },
      ],
      timeline: [
        { id: 'h1', at: t0(6), type: 'integration', title: 'Contract generation requested', body: 'Zap 2A is waiting for step 6 on Process Street run PS-RUN-0425.', actor: USERS.integration },
        { id: 'h2', at: t0(5), type: 'integration', title: 'Required documents validated', body: 'Identification ✓  Proof of address ✓  Sale application ✓  Sale contract — awaiting generation', actor: USERS.integration },
        { id: 'h3', at: t0(4), type: 'integration', title: 'Lot data synchronized', body: 'Lot ID LOT-025 · Harbour View Residences · Settlement 15 Dec 2026', actor: USERS.integration },
        { id: 'h4', at: t0(3), type: 'integration', title: 'Deal created/updated', body: 'Deal uniqueness rule: Lot ID + Buyer ID. 0 existing open deals found → created HS-D-3008250.', actor: USERS.integration },
        { id: 'h5', at: t0(2), type: 'integration', title: 'Buyer record matched', body: 'Matched existing contact HS-C-1002450 on Buyer ID BUY-0142 (email confirmed). No duplicate created.', actor: USERS.integration },
        { id: 'h6', at: todayAt(15, 10, -2), type: 'call', title: 'Call with Alex Morgan', body: 'Discussed settlement timing and deposit terms. Buyer happy to proceed. (Synthetic note)', actor: USERS.sales },
        { id: 'h7', at: todayAt(14, 20, -6), type: 'email', title: 'Enquiry: Harbour View Residences', body: 'Website enquiry for ocean-view lots. (Synthetic email)', actor: 'Alex Morgan' },
      ],
      lastSyncedHash: '',
      lastSyncedAt: t0(4),
      duplicateCheck: 'Passed',
    },
    drive: { files: seedDrive() },
    xero: {
      contacts: [],
      invoice: null,
      otherInvoices: [
        { number: 'INV-0024', reference: 'LOT-024 Deposit', to: 'Priya Nair', date: todayAt(9, 0, -3), dueDate: todayAt(9, 0, 4), total: 1_190_000, status: 'Awaiting Approval' },
        { number: 'INV-0023', reference: 'LOT-023 Settlement', to: 'Jordan Lee', date: todayAt(9, 0, -12), dueDate: todayAt(9, 0, -5), total: 11_880_000, status: 'Paid' },
        { number: 'INV-0022', reference: 'LOT-023 Deposit', to: 'Jordan Lee', date: todayAt(9, 0, -45), dueDate: todayAt(9, 0, -38), total: 1_320_000, status: 'Paid' },
        { number: 'INV-0021', reference: 'LOT-019 Settlement', to: 'Kiri Holdings Ltd (demo)', date: todayAt(9, 0, -8), dueDate: todayAt(9, 0, 6), total: 10_440_000, status: 'Awaiting Payment' },
        { number: 'INV-0020', reference: 'LOT-021 Deposit', to: 'Demo Buyer 021', date: todayAt(9, 0, -1), dueDate: todayAt(9, 0, 6), total: 1_210_000, status: 'Draft' },
      ],
    },
    contract: {
      id: IDS.contract,
      version: 0,
      status: 'Not generated',
      template: 'Residential Lot Sale Agreement v2.1',
      comments: [],
      signature: 'Not sent',
    },
    events: [
      { id: 'ev-4', at: t0(6), scenario: 'Zap 2A · Generate contract → Drive → review', trigger: 'HubSpot: deal stage = Contract Approval', source: 'hubspot', target: 'contracts', action: 'Waiting for Process Street step 6', idempotencyKey: 'contract.queue:TXN-HVR-025', status: 'blocked', durationMs: 120, result: 'Filter: waiting — step 6 “Contract generated” is not checked yet', payload: { transactionId: IDS.transaction, step: 6 } },
      { id: 'ev-3', at: t0(4), scenario: 'Zap 1 · Lot-sale checklist → HubSpot buyer & deal', trigger: 'Process Street: step 5 checked', source: 'process-street', target: 'hubspot', action: 'Formatter · find contact (Buyer ID → email) · create/update · find deal (Lot ID + Buyer ID) · create/update', idempotencyKey: 'hs.upsert:TXN-HVR-025:seed', status: 'success', durationMs: 1840, result: 'Contact matched (HS-C-1002450) on Buyer ID · Deal created (HS-D-3008250) · 0 duplicates', payload: { buyerId: IDS.buyer, lotId: IDS.lot, email: 'alex.morgan@example.com', amount: 12_500_000 } },
      { id: 'ev-x2', at: todayAt(8, 52), scenario: 'Zap 1 · Lot-sale checklist → HubSpot buyer & deal', trigger: 'Process Street: step 5 checked (LOT-027)', source: 'process-street', target: 'hubspot', action: 'Validate required fields before HubSpot update', idempotencyKey: 'hs.upsert:TXN-HVR-027:9c1e04aa', status: 'failed', durationMs: 210, transaction: 'TXN-HVR-027', attempt: 1, errorClass: 'Validation', errorMessage: 'Missing required field: Settlement Date', result: 'Validation error — Settlement Date is empty on run PS-RUN-0427. Automation paused; not retried until the data is fixed.', payload: { transactionId: 'TXN-HVR-027', lotId: 'LOT-027', buyer: 'Sam Tari', settlement_date: null } },
      { id: 'ev-x1', at: todayAt(8, 31), scenario: 'Zap 3 · Deal won → Xero draft invoice', trigger: 'HubSpot: deal stage → Closed Won (LOT-024)', source: 'hubspot', target: 'xero', action: 'Find Xero contact · create DRAFT invoice', idempotencyKey: 'xero.invoice:TXN-HVR-024:deposit', status: 'failed', durationMs: 2640, transaction: 'TXN-HVR-024', attempt: 1, errorClass: 'Retryable', errorMessage: 'Customer could not be matched in Xero.', result: 'Xero returned no contact for priya.nair@example.com and contact creation timed out. Retryable — attempt 1 of 3.', payload: { transactionId: 'TXN-HVR-024', dealId: 'HS-D-3008240', contact: 'Priya Nair', email: 'priya.nair@example.com', amount: 1_190_000 } },
    ],
    processedKeys: ['hs.upsert:TXN-HVR-025:seed'],
    settings: { autoSyncOnSave: false, simulateFailure: false, enforceStopTasks: true },
    saleCompleted: false,
    bills: { emails: seedEmails(), xeroBills: seedXeroBills() },
    goLive: {},
    stepComments: [
      { id: 'c1', stepId: 4, user: USERS.sales, text: 'All three documents certified at the sales office. Originals sighted.', at: todayAt(9, 47) },
      { id: 'c2', stepId: 3, user: USERS.director, text: 'Price confirmed against the 2026 list — no discount applied.', at: todayAt(9, 40) },
      { id: 'c3', stepId: 6, user: USERS.sales, text: 'Buyer has asked for the draft by Friday if possible.', at: todayAt(10, 8) },
    ],
    runAttachments: [],
  }
}
