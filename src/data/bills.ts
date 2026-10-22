import type { InboxEmail, XeroBill } from './types'

/** The two shared inboxes the client receives supplier invoices into (synthetic addresses). */
export const INBOXES = {
  accounts: { address: 'accounts@pacifichorizon.example', label: 'Accounts', owner: 'Mere Tasso (Finance)' },
  site: { address: 'site@pacifichorizon.example', label: 'Site office', owner: 'Site manager' },
} as const

const at = (h: number, m: number, dayOffset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}
const day = (offset: number) => at(9, 0, offset).slice(0, 10)

export function seedEmails(): InboxEmail[] {
  return [
    {
      id: 'em-1', inbox: 'accounts', from: 'billing@islandcivil.example', fromName: 'Island Civil Works Ltd',
      subject: 'Tax invoice ICW-1187 — Stage 2 roading progress claim', snippet: 'Please find attached our progress claim #3 for Stage 2 roading and stormwater…',
      receivedAt: at(8, 12), attachment: { name: 'ICW-1187.pdf', sizeKb: 214 }, status: 'New',
      extracted: { supplier: 'Island Civil Works Ltd', supplierId: 'SUP-ICW', invoiceNumber: 'ICW-1187', invoiceDate: day(-1), dueDate: day(13), subtotal: 2_850_000, tax: 427_500, total: 3_277_500, account: '720 - Development costs: Civil works', confidence: 0.96, lines: [{ description: 'Progress claim #3 — Stage 2 roading', amount: 2_300_000 }, { description: 'Stormwater culverts — Lots 024–032', amount: 550_000 }] },
    },
    {
      id: 'em-2', inbox: 'accounts', from: 'admin@vanuasurvey.example', fromName: 'Vanua Survey Services',
      subject: 'Invoice VSS-2209 — boundary pegging LOT-021 to LOT-032', snippet: 'Survey pegging completed for the Stage 2 release. Invoice attached.',
      receivedAt: at(9, 3), attachment: { name: 'VSS-2209.pdf', sizeKb: 96 }, status: 'New',
      extracted: { supplier: 'Vanua Survey Services', supplierId: 'SUP-VSS', invoiceNumber: 'VSS-2209', invoiceDate: day(-2), dueDate: day(12), subtotal: 420_000, tax: 63_000, total: 483_000, account: '725 - Development costs: Survey & design', confidence: 0.93, lines: [{ description: 'Boundary pegging, 12 lots', amount: 420_000 }] },
    },
    {
      id: 'em-3', inbox: 'site', from: 'site.manager@pacifichorizon.example', fromName: 'Site manager',
      subject: 'FW: Tax invoice ICW-1187 — Stage 2 roading progress claim', snippet: 'Forwarding — this came to me on site as well. Approved from my side.',
      receivedAt: at(9, 41), attachment: { name: 'ICW-1187.pdf', sizeKb: 214 }, status: 'New',
      extracted: { supplier: 'Island Civil Works Ltd', supplierId: 'SUP-ICW', invoiceNumber: 'ICW-1187', invoiceDate: day(-1), dueDate: day(13), subtotal: 2_850_000, tax: 427_500, total: 3_277_500, account: '720 - Development costs: Civil works', confidence: 0.95, lines: [{ description: 'Progress claim #3 — Stage 2 roading', amount: 2_300_000 }, { description: 'Stormwater culverts — Lots 024–032', amount: 550_000 }] },
    },
    {
      id: 'em-4', inbox: 'site', from: 'accounts@efatewater.example', fromName: 'Efate Water Supply (demo)',
      subject: 'Invoice EW-5521 water connections', snippet: 'Water connection fees for Stage 2 lots as quoted.',
      receivedAt: at(10, 15), attachment: { name: 'EW-5521.pdf', sizeKb: 71 }, status: 'New',
      extracted: { supplier: 'Efate Water Supply (demo)', supplierId: 'SUP-EWS', invoiceNumber: 'EW-5521', invoiceDate: day(-3), dueDate: day(27), subtotal: 180_000, tax: 27_000, total: 207_000, account: '730 - Development costs: Utilities', confidence: 0.9, lines: [{ description: 'Water connection fees, Stage 2', amount: 180_000 }] },
    },
    {
      id: 'em-5', inbox: 'accounts', from: 'office@pacificlegal.example', fromName: 'Pacific Legal Partners (demo)',
      subject: 'Our account — conveyancing October', snippet: 'Attached is our account for conveyancing work on recent settlements.',
      receivedAt: at(11, 2), attachment: { name: 'Account_Oct_scan.jpg', sizeKb: 1_380 }, status: 'New',
      extracted: { supplier: 'Pacific Legal Partners (demo)', supplierId: 'SUP-PLP', invoiceNumber: 'PLP-0931', invoiceDate: day(-4), dueDate: null, subtotal: 260_000, tax: 39_000, total: 299_000, account: '480 - Legal fees', confidence: 0.71, lines: [{ description: 'Conveyancing — LOT-019, LOT-023 settlements', amount: 260_000 }] },
    },
    {
      id: 'em-6', inbox: 'site', from: 'sales@pvhardware.example', fromName: 'Port Vila Hardware (demo)',
      subject: 'Invoice PVH-77812', snippet: 'Thank you for your purchase. Invoice attached for site materials.',
      receivedAt: at(12, 26), attachment: { name: 'PVH-77812.pdf', sizeKb: 58 }, status: 'New',
      extracted: { supplier: 'Port Vila Hardware (demo)', supplierId: 'SUP-PVH', invoiceNumber: 'PVH-77812', invoiceDate: day(0), dueDate: day(30), subtotal: 96_500, tax: 14_475, total: 110_975, account: '740 - Site consumables', confidence: 0.92, lines: [{ description: 'Site materials — fencing, signage', amount: 96_500 }] },
    },
  ]
}

export function seedXeroBills(): XeroBill[] {
  return [
    { id: 'bill-a', invoiceNumber: 'ICW-1152', supplier: 'Island Civil Works Ltd', date: day(-30), dueDate: day(-16), reference: 'Progress claim #2', status: 'Paid', subtotal: 2_400_000, tax: 360_000, total: 2_760_000, account: '720 - Development costs: Civil works', source: 'Entered manually' },
    { id: 'bill-b', invoiceNumber: 'VSS-2140', supplier: 'Vanua Survey Services', date: day(-21), dueDate: day(-7), reference: 'Stage 1 as-built survey', status: 'Awaiting Payment', subtotal: 310_000, tax: 46_500, total: 356_500, account: '725 - Development costs: Survey & design', source: 'Entered manually' },
  ]
}
