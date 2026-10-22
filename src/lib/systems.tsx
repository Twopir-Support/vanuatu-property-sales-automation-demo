import { Bot, CheckSquare, FileSignature, FolderOpen, Receipt, Users } from 'lucide-react'
import type { SystemId } from '../data/types'

export const SYSTEMS: Record<SystemId, { name: string; short: string; color: string; bg: string; Icon: typeof Bot; route: string }> = {
  'process-street': { name: 'Process Street', short: 'Workflow', color: 'text-blue-600', bg: 'bg-blue-50', Icon: CheckSquare, route: '/workflow' },
  hubspot: { name: 'HubSpot', short: 'CRM', color: 'text-orange-600', bg: 'bg-orange-50', Icon: Users, route: '/crm/deal' },
  xero: { name: 'Xero', short: 'Accounting', color: 'text-sky-600', bg: 'bg-sky-50', Icon: Receipt, route: '/accounting' },
  drive: { name: 'Google Drive', short: 'Documents', color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: FolderOpen, route: '/documents' },
  automation: { name: 'Make / Zapier', short: 'Automation', color: 'text-violet-600', bg: 'bg-violet-50', Icon: Bot, route: '/monitor' },
  contracts: { name: 'Contracts', short: 'Contracts', color: 'text-teal-700', bg: 'bg-teal-50', Icon: FileSignature, route: '/contracts' },
}

export function SystemIcon({ system, size = 14 }: { system: SystemId; size?: number }) {
  const s = SYSTEMS[system]
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-md ${s.bg} ${s.color}`} style={{ width: size + 12, height: size + 12 }} title={s.name}>
      <s.Icon size={size} />
    </span>
  )
}
