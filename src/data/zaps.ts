/**
 * Zap designs for the three flows. Step/event names follow Zapier's app catalogue as closely as
 * possible but are indicative — exact trigger/action names are confirmed in Zapier during build.
 */
import { invoiceRules, syncHash, ZAP } from '../store/engine'
import { IDS, USERS } from './ids'
import type { DemoState } from './types'

export type ZapApp =
  | 'Process Street'
  | 'HubSpot'
  | 'Google Drive'
  | 'Google Docs'
  | 'Xero'
  | 'E-signature'
  | 'Email (Gmail / Outlook)'
  | 'Filter by Zapier'
  | 'Formatter by Zapier'
  | 'Paths by Zapier'
  | 'Storage by Zapier'
  | 'Looping by Zapier'

export interface ZapStep {
  app: ZapApp
  event: string
  kind: 'trigger' | 'action' | 'search' | 'filter' | 'utility'
  /** Field label → value. `{{n.field}}` marks a mapped value from step n. */
  fields: [string, string][]
  note?: string
  /** Data this step outputs for the LOT-025 test record. */
  output?: (s: DemoState) => Record<string, unknown>
}

export interface ZapDef {
  id: string
  flow: 1 | 2 | 3 | 4
  name: string
  summary: string
  steps: ZapStep[]
}

export const FLOWS: { n: ZapDef['flow']; title: string; lines: string[] }[] = [
  { n: 1, title: 'Flow 1 · Checklist → HubSpot', lines: ['Process Street: salesperson completes the lot-sale checklist — buyer details, lot ID, price and required documents.', 'HubSpot: find or create the buyer and deal, using stable identifiers to avoid duplicates.'] },
  { n: 2, title: 'Flow 2 · Contract → review → signature → Drive', lines: ['HubSpot: the buyer and deal found in Flow 1 are the source for the contract.', 'Document generation: populate the approved sale-contract template, then route it for review and signature.', 'Google Drive: create the transaction folder and save the draft, approved and signed contract plus supporting documents.'] },
  { n: 3, title: 'Flow 3 · Deal won → Xero', lines: ['HubSpot: when the deal is won, Zap 3 starts.', 'Xero: create the draft accounting transaction only when the business rules and approval conditions are met.'] },
  { n: 4, title: 'Supporting & later phase', lines: ['Payment back to HubSpot, settlement, and supplier bills from the two shared inboxes.'] },
]

const deal = (s: DemoState) => s.hubspot.deals.find((d) => d.id === IDS.hubspotDeal)!
const contact = (s: DemoState) => s.hubspot.contacts.find((c) => c.id === IDS.hubspotContact)!

export const ZAPS: ZapDef[] = [
  {
    id: 'z1', flow: 1, name: ZAP.z1,
    summary: 'When the salesperson checks “CRM record synchronized”, find or create the buyer contact and the lot deal in HubSpot — never duplicate either.',
    steps: [
      { app: 'Process Street', kind: 'trigger', event: 'Task Checked Unchecked', fields: [['Workflow', 'Residential Lot Sale'], ['Task', '5. CRM record synchronized']], output: (s) => ({ run_id: IDS.processStreetRun, task: 'CRM record synchronized', checked: s.steps[4].status === 'complete', buyer_name: s.transaction.buyerName, email: s.transaction.email, phone: s.transaction.phone, buyer_id: s.transaction.buyerId, lot_id: s.transaction.lotId, project: s.transaction.project, sale_price: s.transaction.salePrice, sales_rep: s.transaction.salesRep, settlement_date: s.transaction.settlementDate, required_documents: s.transaction.requiredDocuments }) },
      { app: 'Filter by Zapier', kind: 'filter', event: 'Only continue if…', fields: [['Condition 1', '{{1.checked}} (Boolean) is true'], ['Condition 2', '{{1.buyer_id}} exists AND {{1.lot_id}} exists'], ['Condition 3', '{{1.email}} exists']], note: 'Unchecking the task, or a run missing identifiers, stops here — nothing is written to HubSpot.' },
      { app: 'Formatter by Zapier', kind: 'utility', event: 'Text · Lowercase + Trim / Numbers · Format / Date · Format', fields: [['Email', 'trim + lowercase {{1.email}}'], ['Sale price', 'number {{1.sale_price}} (no separators)'], ['Settlement date', '{{1.settlement_date}} → YYYY-MM-DD'], ['First / last name', 'split {{1.buyer_name}} on first space']], output: (s) => ({ email: s.transaction.email.trim().toLowerCase(), amount: s.transaction.salePrice, closedate: s.transaction.settlementDate, firstname: s.transaction.buyerName.split(' ')[0], lastname: s.transaction.buyerName.split(' ').slice(1).join(' ') }) },
      { app: 'HubSpot', kind: 'search', event: 'Find Contact', fields: [['Search property', 'buyer_id'], ['Value', '{{1.buyer_id}}'], ['Second search property', 'email = {{3.email}}'], ['Create HubSpot contact if not found', 'Yes → firstname, lastname, email, phone, buyer_id, owner = {{1.sales_rep}}']], note: 'Stable Buyer ID first; normalised email as fallback. Never match on name.', output: (s) => ({ id: contact(s).id, buyer_id: contact(s).buyerId, email: contact(s).email, _zap_search_was_found_status: true }) },
      { app: 'HubSpot', kind: 'action', event: 'Update Contact', fields: [['Contact', '{{4.id}}'], ['Phone', '{{1.phone}}'], ['Contact owner', '{{1.sales_rep}}'], ['Lifecycle stage', 'Opportunity (only if currently Lead)']] },
      { app: 'HubSpot', kind: 'search', event: 'Find Deal', fields: [['Search property', 'deal_key'], ['Value', '{{1.lot_id}}-{{1.buyer_id}}'], ['Create HubSpot deal if not found', 'Yes → pipeline Lot Sales, stage Contract Approval']], note: 'deal_key is a unique custom property = Lot ID + Buyer ID, so one open deal per lot and buyer.', output: (s) => ({ id: deal(s).id, dealname: deal(s).name, deal_key: `${s.transaction.lotId}-${s.transaction.buyerId}`, dealstage: deal(s).stage, _zap_search_was_found_status: true }) },
      { app: 'HubSpot', kind: 'action', event: 'Update Deal', fields: [['Deal', '{{6.id}}'], ['Deal name', '{{1.lot_id}} — {{1.buyer_name}}'], ['Amount', '{{3.amount}}'], ['Close date', '{{3.closedate}}'], ['Property / Lot ID', '{{1.project}} / {{1.lot_id}}'], ['Deal owner', '{{1.sales_rep}}'], ['process_street_run_id', '{{1.run_id}}']], output: (s) => ({ id: deal(s).id, amount: deal(s).amount, closedate: deal(s).settlementDate, hubspot_owner: deal(s).owner }) },
      { app: 'HubSpot', kind: 'action', event: 'Create Association', fields: [['From', 'Contact {{4.id}}'], ['To', 'Deal {{6.id}}'], ['Label', 'Buyer']] },
      { app: 'Storage by Zapier', kind: 'utility', event: 'Set Value', fields: [['Key', `hs.upsert:${IDS.transaction}:{{payload hash}}`], ['Value', '{{zap_meta_human_now}}']], note: 'Run log / idempotency record — a replay with the same data is recognised and skipped.', output: (s) => ({ key: `hs.upsert:${IDS.transaction}:${syncHash(s.transaction)}` }) },
    ],
  },
  {
    id: 'z2a', flow: 2, name: ZAP.z2a,
    summary: 'When “Contract generated” is checked: get the HubSpot deal, find/create the Drive folder, copy supporting documents, populate the approved template and route the draft for review.',
    steps: [
      { app: 'Process Street', kind: 'trigger', event: 'Task Checked Unchecked', fields: [['Workflow', 'Residential Lot Sale'], ['Task', '6. Contract generated']] },
      { app: 'Filter by Zapier', kind: 'filter', event: 'Only continue if…', fields: [['Condition 1', '{{1.checked}} is true'], ['Condition 2', '{{1.crm_deal_id}} exists (Flow 1 completed)']] },
      { app: 'Storage by Zapier', kind: 'utility', event: 'Get Value → Filter: key does not exist', fields: [['Key', `contract.generate:${IDS.transaction}:v1`]], note: 'Re-checking the task does not generate a second contract.' },
      { app: 'HubSpot', kind: 'search', event: 'Find Deal', fields: [['deal_key', '{{1.lot_id}}-{{1.buyer_id}}']], output: (s) => ({ id: deal(s).id, dealname: deal(s).name, amount: deal(s).amount, buyer_email: contact(s).email }) },
      { app: 'Google Drive', kind: 'search', event: 'Find a Folder', fields: [['Drive', 'Shared drive: Pacific Horizon — Sales'], ['Parent folder', 'Harbour View Residences'], ['Folder name', '{{1.lot_id}} — {{1.buyer_name}}'], ['Create Google Drive folder if not found', 'Yes']], output: (s) => ({ id: IDS.driveFolder, title: `${s.transaction.lotId} — ${s.transaction.buyerName}`, exists: s.drive.files.some((f) => f.id === IDS.driveFolder) }) },
      { app: 'Looping by Zapier', kind: 'utility', event: 'Create Loop From Line Items', fields: [['Values', '01 Buyer identification, 02 Proof of address, 03 Sale application, 04 Contracts, 05 Finance']], note: 'Each iteration: Google Drive · Create Folder (find first, so re-runs reuse folders).' },
      { app: 'Google Drive', kind: 'action', event: 'Upload File (×3)', fields: [['File', '{{1.identification_file}} / {{1.proof_of_address_file}} / {{1.sale_application_file}}'], ['Folder', '01 / 02 / 03 sub-folders'], ['File name', '{{1.lot_id}}_<DocType>_{{1.buyer_name}}']] },
      { app: 'Google Docs', kind: 'action', event: 'Create Document From Template', fields: [['Template', 'Residential Lot Sale Agreement — Template v3 (approved by solicitor)'], ['Folder', '04 Contracts'], ['Document name', '{{1.lot_id}}_SaleAgreement_v1_DRAFT'], ['{{buyer_name}} / {{buyer_email}} / {{buyer_id}}', '{{1.buyer_name}} / {{1.email}} / {{1.buyer_id}}'], ['{{lot_id}} / {{project}}', '{{1.lot_id}} / {{1.project}}'], ['{{sale_price}} / {{deposit}}', '{{4.amount}} / {{4.amount}} × 10%'], ['{{settlement_date}}', '{{1.settlement_date}}']], output: (s) => ({ document_id: s.contract.driveFileId ?? null, title: `${s.transaction.lotId}_SaleAgreement_v1_DRAFT`, status: s.contract.status }) },
      { app: 'Process Street', kind: 'action', event: 'Update Form Fields', fields: [['Run', '{{1.run_id}}'], ['contract_draft_url', '{{8.alternate_link}}'], ['drive_folder_url', '{{5.alternate_link}}']], note: 'The approver opens the draft straight from the step 7 approval task.' },
      { app: 'HubSpot', kind: 'action', event: 'Create Engagement (Note)', fields: [['Associated deal', '{{4.id}}'], ['Body', 'Contract v1 draft generated — awaiting review by ' + USERS.director]] },
      { app: 'Storage by Zapier', kind: 'utility', event: 'Set Value', fields: [['Key', `contract.generate:${IDS.transaction}:v1`]] },
    ],
  },
  {
    id: 'z2b', flow: 2, name: ZAP.z2b,
    summary: 'When the director approves the step 7 approval task: file the approved PDF and send it to the buyer for e-signature.',
    steps: [
      { app: 'Process Street', kind: 'trigger', event: 'Task Checked Unchecked', fields: [['Workflow', 'Residential Lot Sale'], ['Task', '7. Contract approved (approval task)']] },
      { app: 'Filter by Zapier', kind: 'filter', event: 'Only continue if…', fields: [['Condition', 'Approval status = Approved (rejections create a revise task instead)']] },
      { app: 'Google Drive', kind: 'action', event: 'Copy File (export as PDF)', fields: [['Source', '{{run.contract_draft_url}}'], ['Folder', '04 Contracts'], ['Name', '{{lot_id}}_SaleAgreement_v1_APPROVED.pdf']], output: (s) => ({ file_id: s.contract.approvedFileId ?? null }) },
      { app: 'E-signature', kind: 'action', event: 'Send Signature Request', fields: [['Document', '{{3.file}}'], ['Signer', '{{buyer_name}} <{{buyer_email}}>'], ['Message', 'Your sale agreement for {{lot_id}}, Harbour View Residences']], note: 'Dropbox Sign, DocuSign or PandaDoc — chosen with the client.', output: (s) => ({ signature_request_id: s.contract.sentAt ? 'SIG-DEMO-0025' : null, status: s.contract.signature }) },
      { app: 'HubSpot', kind: 'action', event: 'Update Deal', fields: [['Deal', '{{deal_id}}'], ['Deal stage', 'Out for Signature'], ['contract_status', 'Approved — out for signature']] },
      { app: 'Storage by Zapier', kind: 'utility', event: 'Set Value', fields: [['Key', `contract.approve:${IDS.transaction}:v1`]] },
    ],
  },
  {
    id: 'z2c', flow: 2, name: ZAP.z2c,
    summary: 'When the buyer signs: file the signed PDF in Drive and mark the HubSpot deal Closed Won (which starts Zap 3).',
    steps: [
      { app: 'E-signature', kind: 'trigger', event: 'Signature Request Signed (all signers)', fields: [['Template / title contains', 'SaleAgreement']] },
      { app: 'Storage by Zapier', kind: 'utility', event: 'Get Value → Filter: key does not exist', fields: [['Key', `contract.signed:${IDS.transaction}:v1`]] },
      { app: 'Google Drive', kind: 'action', event: 'Upload File', fields: [['File', '{{1.signed_document}}'], ['Folder', '04 Contracts'], ['Name', '{{lot_id}}_SaleAgreement_v1_SIGNED.pdf']], output: (s) => ({ file_id: s.contract.signedFileId ?? null }) },
      { app: 'HubSpot', kind: 'action', event: 'Update Deal', fields: [['Deal', '{{deal_id}}'], ['Deal stage', 'Closed Won'], ['contract_status', 'Signed'], ['contract_signed_date', '{{1.signed_at}}']], output: (s) => ({ id: deal(s).id, dealstage: deal(s).stage }) },
      { app: 'Process Street', kind: 'action', event: 'Update Form Fields', fields: [['contract_signed', 'Yes'], ['signed_contract_url', '{{3.alternate_link}}']] },
      { app: 'Storage by Zapier', kind: 'utility', event: 'Set Value', fields: [['Key', `contract.signed:${IDS.transaction}:v1`]] },
    ],
  },
  {
    id: 'z3', flow: 3, name: ZAP.z3,
    summary: 'When a Lot Sales deal is won, create a DRAFT deposit invoice in Xero — only if every business rule and approval condition passes.',
    steps: [
      { app: 'HubSpot', kind: 'trigger', event: 'Updated Deal Stage', fields: [['Pipeline', 'Lot Sales'], ['Stage', 'Closed Won']], output: (s) => ({ deal_id: deal(s).id, dealstage: deal(s).stage, amount: deal(s).amount }) },
      { app: 'HubSpot', kind: 'search', event: 'Find Deal (get all properties)', fields: [['Deal ID', '{{1.deal_id}}'], ['Properties', 'buyer_id, lot_id, amount, deal_currency_code, contract_status, contract_approved_by, xero_invoice_number']], output: (s) => ({ buyer_id: deal(s).buyerId, lot_id: deal(s).lotId, amount: deal(s).amount, deal_currency_code: deal(s).currency, contract_status: s.contract.signature === 'Signed' ? 'Signed' : s.contract.status, contract_approved_by: s.contract.approver ?? null, xero_invoice_number: deal(s).xeroInvoice ?? null }) },
      { app: 'Filter by Zapier', kind: 'filter', event: 'Only continue if… (business rules)', fields: [['1', '{{2.contract_approved_by}} exists'], ['2', '{{2.contract_status}} exactly matches Signed'], ['3', '{{2.buyer_id}} exists AND {{2.lot_id}} exists'], ['4', '{{2.amount}} (Number) greater than 0'], ['5', '{{2.deal_currency_code}} exactly matches VUV'], ['6', '{{2.xero_invoice_number}} does not exist']], note: 'Someone dragging a deal to Closed Won early is stopped here — Xero is not touched.', output: (s) => Object.fromEntries(invoiceRules(s).map((r) => [r.label, r.pass ? 'pass' : 'STOP'])) },
      { app: 'Storage by Zapier', kind: 'utility', event: 'Get Value → Filter: key does not exist', fields: [['Key', `xero.invoice:${IDS.transaction}:deposit`]] },
      { app: 'Formatter by Zapier', kind: 'utility', event: 'Numbers · Spreadsheet-Style Formula', fields: [['Formula', 'ROUND({{2.amount}} * 0.10, 0)']], output: (s) => ({ deposit: Math.round(deal(s).amount * 0.1) }) },
      { app: 'Xero', kind: 'search', event: 'Find Contact', fields: [['Search by', 'Email = {{buyer_email}}'], ['Create Xero contact if not found', 'Yes → name, email, phone, account number = {{2.buyer_id}}']], output: (s) => ({ contact_id: s.xero.contacts[0]?.id ?? null, name: s.transaction.buyerName }) },
      { app: 'Xero', kind: 'action', event: 'Create Sales Invoice', fields: [['Contact', '{{6.contact_id}}'], ['Status', 'DRAFT'], ['Currency', 'VUV'], ['Reference', '{{2.lot_id}} Deposit · {{1.deal_id}}'], ['Line 1', '10% deposit · {{5.deposit}} · 610 Customer Deposits · Tax Exempt'], ['Line 2', 'Contract administration fee · 45,000 · 200 Sales · VAT 15%'], ['Due date', '+7 days']], note: 'Tax treatment to be confirmed with the client’s accountant.', output: (s) => ({ invoice_number: s.xero.invoice?.number ?? null, status: s.xero.invoice?.status ?? null }) },
      { app: 'HubSpot', kind: 'action', event: 'Update Deal', fields: [['Deal', '{{1.deal_id}}'], ['xero_invoice_number', '{{7.invoice_number}}']] },
      { app: 'Storage by Zapier', kind: 'utility', event: 'Set Value', fields: [['Key', `xero.invoice:${IDS.transaction}:deposit`]] },
    ],
  },
  {
    id: 'z4', flow: 4, name: ZAP.z4,
    summary: 'When the deposit invoice is paid in Xero, log the payment on the HubSpot deal.',
    steps: [
      { app: 'Xero', kind: 'trigger', event: 'New Payment', fields: [['Invoice reference contains', 'Deposit']] },
      { app: 'HubSpot', kind: 'search', event: 'Find Deal', fields: [['xero_invoice_number', '{{1.invoice_number}}']] },
      { app: 'HubSpot', kind: 'action', event: 'Create Engagement (Note)', fields: [['Body', 'Deposit {{1.amount}} received ({{1.invoice_number}})']] },
    ],
  },
  {
    id: 'z5', flow: 4, name: ZAP.z5,
    summary: 'When settlement is confirmed (step 8), record it on the deal, mark the buyer a Customer and label the Drive folder Completed.',
    steps: [
      { app: 'Process Street', kind: 'trigger', event: 'Task Checked Unchecked', fields: [['Task', '8. Sale completion confirmed']] },
      { app: 'Filter by Zapier', kind: 'filter', event: 'Only continue if…', fields: [['Condition', 'contract_signed = Yes']] },
      { app: 'HubSpot', kind: 'action', event: 'Update Deal + Update Contact', fields: [['settlement_status', 'Settled'], ['Lifecycle stage', 'Customer']] },
      { app: 'Google Drive', kind: 'action', event: 'Update File/Folder (label)', fields: [['Folder', '{{1.lot_id}} — {{1.buyer_name}}'], ['Label', 'Completed']] },
    ],
  },
  {
    id: 'z6', flow: 4, name: ZAP.bills,
    summary: 'Later phase: supplier invoices from accounts@ and site@ become Xero DRAFT bills, with a duplicate check across both inboxes.',
    steps: [
      { app: 'Email (Gmail / Outlook)', kind: 'trigger', event: 'New Email Matching Search', fields: [['Mailboxes', 'accounts@ and site@ (one trigger each)'], ['Search', 'has:attachment filename:pdf OR filename:jpg']], note: 'Shown in the Supplier Bills screen.' },
      { app: 'Formatter by Zapier', kind: 'utility', event: 'Extract invoice fields (AI step, optional)', fields: [['Extract', 'supplier, invoice number, dates, subtotal, VAT, total']] },
      { app: 'Storage by Zapier', kind: 'utility', event: 'Get Value → Filter: key does not exist', fields: [['Key', 'xero.bill:{{supplier_id}}:{{invoice_number}}']] },
      { app: 'Xero', kind: 'action', event: 'Create Bill', fields: [['Status', 'DRAFT'], ['Attachment', '{{1.attachment}}']] },
    ],
  },
]

export const APP_STYLE: Record<ZapApp, { bg: string; fg: string; short: string }> = {
  'Process Street': { bg: '#2f80ed', fg: '#fff', short: 'PS' },
  HubSpot: { bg: '#ff5c35', fg: '#fff', short: 'HS' },
  'Google Drive': { bg: '#0f9d58', fg: '#fff', short: 'GD' },
  'Google Docs': { bg: '#4285f4', fg: '#fff', short: 'GDo' },
  Xero: { bg: '#13b5ea', fg: '#fff', short: 'X' },
  'E-signature': { bg: '#6d28d9', fg: '#fff', short: 'eS' },
  'Email (Gmail / Outlook)': { bg: '#e11d48', fg: '#fff', short: '@' },
  'Filter by Zapier': { bg: '#ff4f00', fg: '#fff', short: 'Fi' },
  'Formatter by Zapier': { bg: '#ff4f00', fg: '#fff', short: 'Fo' },
  'Paths by Zapier': { bg: '#ff4f00', fg: '#fff', short: 'Pa' },
  'Storage by Zapier': { bg: '#ff4f00', fg: '#fff', short: 'St' },
  'Looping by Zapier': { bg: '#ff4f00', fg: '#fff', short: 'Lo' },
}
