# Property Sales Automation — Interactive Demo

A client-facing, fully interactive demo for **Pacific Horizon Developments** (Port Vila, Vanuatu), which is launching the residential subdivision **Harbour View Residences**. It shows how each lot sale moves through their systems with as little manual re-entry as possible:

- **Process Street:** the sales workflow, checklist and approvals.
- **HubSpot:** buyer contacts and lot deals.
- **Google Docs / Drive:** contract generation and the transaction folder.
- **Xero:** draft invoices, plus draft supplier bills in a later phase.
- **Zapier:** the middleware. Native features are used where they fit.

> **DEMO ENVIRONMENT · SYNTHETIC DATA · SIMULATED INTEGRATIONS**
> All people, records, amounts and documents are fictional. No vendor APIs are called and no credentials are needed. The product-style screens are original components that recreate familiar UI patterns. They are not the vendors' software, use no vendor logos, and imply no affiliation or endorsement.

## The three flows

| Flow | What happens | Zaps |
|---|---|---|
| **1 · Checklist → HubSpot** | The salesperson completes the lot-sale checklist in **Process Street**: buyer details, lot ID, price and required documents. **HubSpot** then finds or creates the buyer and the deal using stable identifiers: Buyer ID, then normalised email, for the contact; a `deal_key` of Lot ID + Buyer ID for the deal. No duplicates are created. | Zap 1 |
| **2 · Contract → review → signature → Drive** | The **HubSpot** deal is the source record. **Document generation** fills in the approved sale-contract template and routes it for internal review, then sends it for buyer e-signature. **Google Drive** gets the transaction folder (found or created), with the draft, approved and signed contract plus the supporting documents. | Zaps 2A, 2B, 2C |
| **3 · Deal won → Xero** | When the **HubSpot** deal is won, **Xero** gets a **draft** deposit invoice only if every business rule and approval condition passes: contract approved, contract signed, Buyer ID and Lot ID present, amount > 0, currency VUV, and no invoice already created. | Zap 3 |

Supporting Zaps: Xero payment → HubSpot (Zap 4), settlement (Zap 5) and, in the later phase, supplier invoices from two shared inboxes → Xero draft bills (Zap 6).

### Why Zap 3 goes through Zapier and not HubSpot's native Xero app
HubSpot's Xero data-sync app supports six currencies: USD, CAD, EUR, GBP, AUD and NZD. **VUV is not one of them.** The app also only syncs invoices once they are open, not drafts. Zap 3 therefore creates the draft directly in Xero through Zapier's Xero app. Source: [HubSpot Knowledge Base](https://knowledge.hubspot.com/integrations/connect-hubspot-and-xero-data-sync). Process Street documents webhooks and Zapier as its HubSpot routes ([Process Street Help](https://www.process.st/help/docs/hubspot/)).

## UI previews

All screenshots show synthetic data at 1440 × 900. They were captured from the running app while walking through Flows 1 → 2 → 3.

### Overview
![Overview](docs/screenshots/01-overview.png)

### Flow 1 · Process Street checklist → HubSpot find-or-create
| Process Street lot-sale checklist | Zap 1 in the Zapier-style editor |
|---|---|
| ![Process Street checklist](docs/screenshots/02-flow1-process-street-checklist.png) | ![Zap 1](docs/screenshots/03-flow1-zap1-editor.png) |

| HubSpot deal record | Duplicate contact prevented |
|---|---|
| ![HubSpot deal](docs/screenshots/04-flow1-hubspot-deal.png) | ![HubSpot duplicate check](docs/screenshots/05-flow1-hubspot-duplicate-check.png) |

### Flow 2 · Contract generation → review → signature → Google Drive
| Zap 2A: template → Drive → review | Review approved, out for signature |
|---|---|
| ![Zap 2A](docs/screenshots/07-flow2-zap2a-editor.png) | ![Review and signature](docs/screenshots/08-flow2-review-and-signature.png) |

| Signed contract | Drive: draft, approved and signed files |
|---|---|
| ![Contract signed](docs/screenshots/09-flow2-contract-signed.png) | ![Drive contracts folder](docs/screenshots/10-flow2-drive-contracts-folder.png) |

### Flow 3 · Deal won → Xero draft invoice (rules first)
| Xero waiting: rules not yet met | Zap 3 business-rule filter |
|---|---|
| ![Xero waiting](docs/screenshots/06-flow3-xero-waiting-rules.png) | ![Zap 3 filter](docs/screenshots/11-flow3-zap3-filter.png) |

| Draft invoice INV-0025 created after the deal is won |
|---|
| ![Xero draft invoice](docs/screenshots/12-flow3-xero-draft-invoice.png) |

### Testing, documentation and design
| Testing & Go-live (15 executable tests) | Maintenance documentation |
|---|---|
| ![Testing](docs/screenshots/14-testing-go-live.png) | ![Documentation](docs/screenshots/15-documentation.png) |

| Integration Design | Automation Monitor |
|---|---|
| ![Integration Design](docs/screenshots/16-integration-design.png) | ![Automation Monitor](docs/screenshots/13-automation-monitor.png) |

### Later phase · supplier invoices from two shared inboxes → Xero draft bills
| Shared inboxes with extraction | Xero draft bills (duplicate skipped) |
|---|---|
| ![Supplier inboxes](docs/screenshots/17-supplier-bills-inboxes.png) | ![Xero bills](docs/screenshots/18-supplier-bills-xero-drafts.png) |

| Lot Sales | Roadmap |
|---|---|
| ![Lot Sales](docs/screenshots/19-lot-sales.png) | ![Roadmap](docs/screenshots/20-roadmap.png) |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

Requires Node 18+. The build is a static site with hash routing, so `dist/` can be hosted anywhere, including GitHub Pages.

## Suggested interview walkthrough (about 10 minutes)

1. **Overview:** the "what the client asked for → where it is" panel and the five-system tracker.
2. **Flow 1:** in **Workflow** (Process Street), edit the price, click **Save Changes**, then **Sync to HubSpot**. Click sync again: the second run is skipped as already processed. Open **Zaps → Zap 1** to show the steps. In **CRM → Contacts → Create contact**, the duplicate is caught.
3. **Flow 3 guardrail, before Flow 2:** in the HubSpot deal, drag the stage to **Closed Won**. Zap 3's filter stops it because the contract isn't signed, and Xero is untouched. Set the stage back.
4. **Flow 2:** check **step 6**. Zap 2A creates the Drive folder, copies the supporting documents and saves the DRAFT contract. **Approve** step 7 and Zap 2B files the APPROVED PDF and sends it for signature. Click **Simulate buyer signature** and Zap 2C files the SIGNED PDF and marks the deal **Closed Won**.
5. **Flow 3:** that win triggers Zap 3. All six rules pass, and Xero now shows draft **INV-0025**, whose number is written back to the deal.
6. **Testing & Go-live:** run the 15 end-to-end tests and walk through the go-live checklist. **Documentation:** download the runbook.
7. **Supplier Bills (later phase):** run the inbox poll. You get 4 drafts, 1 duplicate skipped (the same invoice arrived in both inboxes) and 1 held for review.
8. **Settings → Simulate an API outage:** shows a failed run and a retry in the **Automation Monitor**. **Reset demo scenario** restores the starting state.

## Cross-system record IDs

| Record | ID |
|---|---|
| Transaction | `TXN-HVR-025` |
| Process Street run | `PS-RUN-0425` |
| HubSpot contact / deal | `HS-C-1002450` / `HS-D-3008250` |
| Sale contract | `CTR-LOT-025` |
| Google Drive folder | `GD-FLD-LOT025` (“LOT-025 — Alex Morgan”) |
| Xero contact / invoice | `XC-ALEX-0142` / `INV-0025` |

## Duplicate protection

Each Zap checks, and then writes, a key in **Storage by Zapier** before it creates anything:

| Zap | Key |
|---|---|
| 1 | `hs.upsert:TXN-HVR-025:<payload hash>` |
| 2A / 2B / 2C | `contract.generate:…`, `contract.approve:…`, `contract.signed:TXN-HVR-025:v1` |
| 3 | `xero.invoice:TXN-HVR-025:deposit` |
| 6 | `xero.bill:<supplier id>:<invoice number>` |

Replays, double clicks and re-checked tasks are therefore skipped. Failed runs never record their key, so a retry runs normally.

## Project structure

```
src/
  data/        types, record IDs, seed data, Zap definitions, supplier-bill seed, field mapping
  store/       engine.ts (pure, idempotent flow engine) · uat.ts (end-to-end tests) · DemoStore.tsx
  lib/         formatting, integration status, system metadata
  components/  app shell, demo banner, product frame, UI primitives, toasts
  pages/       Overview, LotSales, Workflow, Crm, Contracts, Documents, Accounting, Zaps, Monitor,
               IntegrationDesign, Testing, Documentation, SupplierBills, Roadmap, Settings
```

Stack: React 19, TypeScript, Vite, Tailwind CSS v4, React Router and Lucide icons. Demo state is kept only in the browser's `localStorage`.
