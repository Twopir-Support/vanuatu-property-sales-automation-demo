// Cross-system record identifiers. Every screen uses these so one transaction
// can be traced through Process Street, HubSpot, Drive, the contract and Xero.
export const IDS = {
  transaction: 'TXN-HVR-025',
  buyer: 'BUY-0142',
  lot: 'LOT-025',
  processStreetRun: 'PS-RUN-0425',
  hubspotContact: 'HS-C-1002450',
  hubspotDeal: 'HS-D-3008250',
  driveFolder: 'GD-FLD-LOT025',
  contract: 'CTR-LOT-025',
  xeroContact: 'XC-ALEX-0142',
  xeroInvoice: 'INV-0025',
} as const

export const COMPANY = {
  name: 'Pacific Horizon Developments',
  location: 'Port Vila, Vanuatu',
  development: 'Harbour View Residences',
} as const

export const USERS = {
  sales: 'Sarah Williams',
  director: 'David Kalo',
  finance: 'Mere Tasso',
  admin: 'Lina Joseph',
  integration: 'Integration bot',
} as const
