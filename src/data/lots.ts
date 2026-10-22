export type LotStatus = 'Available' | 'Reserved' | 'Under contract' | 'Sold'

export interface Lot {
  id: string
  stage: 'Stage 1' | 'Stage 2'
  areaSqm: number
  view: 'Harbour' | 'Garden' | 'Hillside'
  price: number
  status: LotStatus
  buyer?: string
  dealId?: string
}

// Synthetic release schedule for Harbour View Residences.
export const LOTS: Lot[] = [
  { id: 'LOT-018', stage: 'Stage 1', areaSqm: 742, view: 'Garden', price: 9_600_000, status: 'Sold', buyer: 'Demo Buyer 018' },
  { id: 'LOT-019', stage: 'Stage 1', areaSqm: 801, view: 'Harbour', price: 10_440_000, status: 'Sold', buyer: 'Kiri Holdings Ltd (demo)' },
  { id: 'LOT-020', stage: 'Stage 1', areaSqm: 690, view: 'Garden', price: 9_250_000, status: 'Available' },
  { id: 'LOT-021', stage: 'Stage 1', areaSqm: 815, view: 'Harbour', price: 12_100_000, status: 'Reserved', buyer: 'Demo Buyer 021', dealId: 'HS-D-3008210' },
  { id: 'LOT-022', stage: 'Stage 1', areaSqm: 760, view: 'Hillside', price: 9_900_000, status: 'Available' },
  { id: 'LOT-023', stage: 'Stage 1', areaSqm: 880, view: 'Harbour', price: 13_200_000, status: 'Sold', buyer: 'Jordan Lee', dealId: 'HS-D-3008230' },
  { id: 'LOT-024', stage: 'Stage 2', areaSqm: 795, view: 'Harbour', price: 11_900_000, status: 'Under contract', buyer: 'Priya Nair', dealId: 'HS-D-3008240' },
  { id: 'LOT-025', stage: 'Stage 2', areaSqm: 836, view: 'Harbour', price: 12_500_000, status: 'Under contract', buyer: 'Alex Morgan', dealId: 'HS-D-3008250' },
  { id: 'LOT-026', stage: 'Stage 2', areaSqm: 702, view: 'Garden', price: 9_400_000, status: 'Available' },
  { id: 'LOT-027', stage: 'Stage 2', areaSqm: 754, view: 'Hillside', price: 10_750_000, status: 'Reserved', buyer: 'Sam Tari', dealId: 'HS-D-3008270' },
  { id: 'LOT-028', stage: 'Stage 2', areaSqm: 720, view: 'Garden', price: 9_500_000, status: 'Available' },
  { id: 'LOT-029', stage: 'Stage 2', areaSqm: 731, view: 'Hillside', price: 9_800_000, status: 'Available', dealId: 'HS-D-3008290' },
  { id: 'LOT-030', stage: 'Stage 2', areaSqm: 905, view: 'Harbour', price: 13_900_000, status: 'Available' },
  { id: 'LOT-031', stage: 'Stage 2', areaSqm: 688, view: 'Garden', price: 9_150_000, status: 'Available' },
  { id: 'LOT-032', stage: 'Stage 2', areaSqm: 870, view: 'Harbour', price: 13_400_000, status: 'Available' },
]
