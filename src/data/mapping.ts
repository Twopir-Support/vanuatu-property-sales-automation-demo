/** Field mapping: Process Street form field (source of truth) → HubSpot → Xero → contract merge field. */
export const FIELD_MAPPING: [string, string, string, string][] = [
  ['Buyer name', 'firstname + lastname', 'Contact name', '{{buyer_name}}'],
  ['Email', 'email (normalised)', 'Email', '{{buyer_email}}'],
  ['Phone', 'phone', 'Phone', '—'],
  ['Buyer ID', 'buyer_id (unique)', 'Account number', '{{buyer_id}}'],
  ['Lot ID', 'lot_id (deal key)', 'Invoice reference', '{{lot_id}}'],
  ['Project', 'property', 'Line description', '{{project}}'],
  ['Sale price', 'amount', 'Deposit line = 10%', '{{sale_price}}'],
  ['Sales representative', 'hubspot_owner_id', '—', '—'],
  ['Settlement date', 'closedate / settlement_date', '—', '{{settlement_date}}'],
]
