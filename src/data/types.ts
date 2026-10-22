export type SystemId = 'process-street' | 'hubspot' | 'xero' | 'drive' | 'automation' | 'contracts'

export interface Transaction {
  id: string
  buyerId: string
  buyerName: string
  email: string
  phone: string
  project: string
  lotId: string
  salePrice: number
  currency: 'VUV'
  salesRep: string
  settlementDate: string // ISO date
  requiredDocuments: string
  country: string
}

export type StepStatus = 'complete' | 'pending'

export interface WorkflowStep {
  id: number
  title: string
  status: StepStatus
  assignee: string
  dueDate: string
  completedAt?: string
  completedBy?: string
  kind: 'form' | 'documents' | 'automation' | 'approval' | 'task'
  stop?: boolean
  description: string
}

export type DocStatus = 'Received' | 'Awaiting generation' | 'Generated' | 'Approved'

export interface ChecklistDocument {
  id: string
  name: string
  status: DocStatus
  driveFileId?: string
}

export interface ActivityItem {
  id: string
  at: string
  system: SystemId
  actor: string
  text: string
}

export interface HubSpotContact {
  id: string
  buyerId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  lifecycleStage: string
  leadStatus: string
  owner: string
  country: string
  createdAt: string
  updatedAt: string
}

export interface HubSpotDeal {
  id: string
  name: string
  amount: number
  currency: 'VUV'
  pipeline: string
  stage: DealStage
  lotId: string
  buyerId: string
  project: string
  country: string
  owner: string
  settlementDate: string
  createdAt: string
  updatedAt: string
  contactId: string
}

export const DEAL_STAGES = [
  'Enquiry',
  'Lot Reserved',
  'Documents Received',
  'Contract Approval',
  'Contract Approved',
  'Closed Won',
] as const
export type DealStage = (typeof DEAL_STAGES)[number]

export interface HubSpotTimelineItem {
  id: string
  at: string
  type: 'integration' | 'note' | 'email' | 'task' | 'stage' | 'call'
  title: string
  body?: string
  actor: string
}

export type DriveFileType = 'folder' | 'pdf' | 'doc' | 'sheet' | 'image'

export interface DriveFile {
  id: string
  name: string
  type: DriveFileType
  parentId: string | null
  owner: string
  modifiedAt: string
  sizeKb?: number
  label?: 'Received' | 'Generated' | 'Pending approval' | 'Approved' | 'Uploaded' | 'Completed' | 'Synced'
  starred?: boolean
  preview?: string[]
}

export type InvoiceStatus = 'Draft' | 'Awaiting Approval' | 'Awaiting Payment' | 'Paid'

export interface InvoiceLine {
  id: string
  item: string
  description: string
  qty: number
  unitPrice: number
  account: string
  taxRate: 'Tax Exempt' | 'VAT 15%'
}

export interface XeroInvoice {
  number: string
  contactId: string
  contactName: string
  reference: string
  date: string
  dueDate: string
  status: InvoiceStatus
  lines: InvoiceLine[]
  history: { at: string; user: string; action: string; detail: string }[]
}

export interface XeroContact {
  id: string
  name: string
  email: string
  phone: string
  accountNumber: string
  address: string
}

export interface OtherInvoice {
  number: string
  reference: string
  to: string
  date: string
  dueDate: string
  total: number
  status: InvoiceStatus
}

export interface Contract {
  id: string
  version: number
  status: 'Not generated' | 'Generated' | 'Approved'
  template: string
  generatedAt?: string
  approvedAt?: string
  approver?: string
  driveFileId?: string
  comments: { at: string; user: string; text: string }[]
}

export type EventStatus = 'success' | 'duplicate' | 'failed' | 'blocked'

export interface AutomationEvent {
  id: string
  at: string
  scenario: string
  trigger: string
  source: SystemId
  target: SystemId
  action: string
  idempotencyKey: string
  status: EventStatus
  durationMs: number
  result: string
  payload: Record<string, unknown>
}

export interface DemoSettings {
  autoSyncOnSave: boolean
  simulateFailure: boolean
  enforceStopTasks: boolean
}

export interface DemoState {
  version: number
  transaction: Transaction
  steps: WorkflowStep[]
  documents: ChecklistDocument[]
  activity: ActivityItem[]
  hubspot: {
    contacts: HubSpotContact[]
    deals: HubSpotDeal[]
    timeline: HubSpotTimelineItem[]
    lastSyncedHash: string
    lastSyncedAt?: string
    duplicateCheck: 'Passed' | 'Not run'
  }
  drive: { files: DriveFile[] }
  xero: { contacts: XeroContact[]; invoice: XeroInvoice | null; otherInvoices: OtherInvoice[] }
  contract: Contract
  events: AutomationEvent[]
  processedKeys: string[]
  settings: DemoSettings
  saleCompleted: boolean
}
