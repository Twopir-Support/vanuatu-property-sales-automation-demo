import { IDS } from '../data/ids'
import type { DemoState, SystemId } from '../data/types'
import { hubspotHasPendingChanges } from '../store/engine'
import type { Tone } from '../components/ui/primitives'
import { time } from './format'

export interface IntegrationStatus {
  key: string
  system: SystemId
  label: string
  status: string
  detail: string
  tone: Tone
}

function lastFailed(s: DemoState, target: SystemId) {
  // Only LOT-025's own runs drive its status; example failures on other lots live in the monitor.
  const last = s.events.find((e) => e.target === target && e.status !== 'duplicate' && (!e.transaction || e.transaction === IDS.transaction))
  return last?.status === 'failed'
}

export function integrationStatuses(s: DemoState): IntegrationStatus[] {
  const pending = hubspotHasPendingChanges(s)
  const hubspot: IntegrationStatus = lastFailed(s, 'hubspot')
    ? { key: 'hubspot', system: 'hubspot', label: 'HubSpot', status: 'Sync failed — retry available', detail: 'See Automation Monitor', tone: 'red' }
    : pending
      ? { key: 'hubspot', system: 'hubspot', label: 'HubSpot', status: 'Ready to synchronize', detail: 'Form data differs from the CRM record', tone: 'amber' }
      : { key: 'hubspot', system: 'hubspot', label: 'HubSpot', status: 'Synchronized', detail: `Last sync ${s.hubspot.lastSyncedAt ? time(s.hubspot.lastSyncedAt) : '—'} · duplicate check passed`, tone: 'green' }

  const c = s.contract
  const contract: IntegrationStatus =
    c.signature === 'Signed'
      ? { key: 'contract', system: 'contracts', label: 'Contract generation', status: 'Signed', detail: `${IDS.contract} v${c.version} approved by ${c.approver} · signed by buyer`, tone: 'green' }
      : c.status === 'Approved'
      ? { key: 'contract', system: 'contracts', label: 'Contract generation', status: 'Out for signature', detail: `${IDS.contract} v${c.version} approved by ${c.approver} · waiting for buyer`, tone: 'blue' }
      : c.status === 'Generated'
        ? { key: 'contract', system: 'contracts', label: 'Contract generation', status: 'Generated · awaiting approval', detail: `${IDS.contract} v${c.version} in Drive › 04 Contracts`, tone: 'blue' }
        : { key: 'contract', system: 'contracts', label: 'Contract generation', status: 'Waiting', detail: 'Runs when step 6 “Contract generated” is completed', tone: 'slate' }

  const drive: IntegrationStatus = s.saleCompleted
    ? { key: 'drive', system: 'drive', label: 'Google Drive', status: 'Archived', detail: 'Folder labelled Completed', tone: 'green' }
    : c.driveFileId
      ? { key: 'drive', system: 'drive', label: 'Google Drive', status: c.signedFileId ? 'Signed contract filed' : c.approvedFileId ? 'Approved contract filed' : 'Draft contract filed', detail: 'LOT-025 — Alex Morgan › 04 Contracts + supporting documents', tone: 'green' }
      : { key: 'drive', system: 'drive', label: 'Google Drive', status: 'Ready', detail: 'Zap 2A creates the transaction folder and files the draft + supporting documents', tone: 'green' }

  const inv = s.xero.invoice
  const xero: IntegrationStatus = lastFailed(s, 'xero')
    ? { key: 'xero', system: 'xero', label: 'Xero', status: 'Invoice creation failed', detail: 'Retry from the Automation Monitor', tone: 'red' }
    : inv
      ? { key: 'xero', system: 'xero', label: 'Xero', status: `${inv.number} · ${inv.status}`, detail: `Reference ${inv.reference}`, tone: inv.status === 'Paid' ? 'green' : 'blue' }
      : { key: 'xero', system: 'xero', label: 'Xero', status: 'Waiting for the correct sales milestone', detail: 'Zap 3 drafts the invoice only when the deal is won and the contract is approved and signed', tone: 'slate' }

  return [hubspot, contract, drive, xero]
}

export function completedSteps(s: DemoState) {
  return s.steps.filter((x) => x.status === 'complete').length
}
