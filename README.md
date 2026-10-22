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

Screenshots show synthetic data at 1440 × 900. They were captured from the running app while it walked through Flows 1 → 2 → 3 with the guided demo.

### Control center (our own UI)
![Control center](docs/screenshots/01-control-center.png)

### Process Street-style workflow run
| Run form (step 1) | Step 6 with comments, attachments and run details |
|---|---|
| ![Run form](docs/screenshots/02-process-street-run-form.png) | ![Step 6](docs/screenshots/03-process-street-step6.png) |

### HubSpot-style CRM
| Deals pipeline | Deal record (header, tabs, properties) |
|---|---|
| ![Pipeline](docs/screenshots/04-hubspot-pipeline.png) | ![Deal record](docs/screenshots/05-hubspot-deal-record.png) |

| “Possible duplicate contact found” | Deal Closed Won after signature |
|---|---|
| ![Duplicate dialog](docs/screenshots/06-hubspot-duplicate-dialog.png) | ![Closed Won](docs/screenshots/15-hubspot-closed-won.png) |

### Contract generation
| Before generation (unmerged template) | Draft generated, validated |
|---|---|
| ![Contract before](docs/screenshots/07-contract-generator-before.png) | ![Contract draft](docs/screenshots/13-contract-generator-draft.png) |

| Signed |
|---|
| ![Contract signed](docs/screenshots/18-contract-signed.png) |

### Google Drive-style documents
| Before Zap 2A (no LOT-025 folder) | 04 Contracts with file-details drawer |
|---|---|
| ![Drive before](docs/screenshots/08-drive-before-zap2a.png) | ![Drive drawer](docs/screenshots/14-drive-contracts-folder.png) |

### Xero-style accounting
| Zap 3 rules not yet met | Draft INV-0025 (not posted to Xero) |
|---|---|
| ![Xero rules](docs/screenshots/09-xero-zap3-rules-not-met.png) | ![Xero invoice](docs/screenshots/17-xero-draft-invoice.png) |

### Zapier-style editor
| Zap 1 field mapping | Test successful |
|---|---|
| ![Zap 1 mapping](docs/screenshots/10-zapier-zap1-mapping.png) | ![Test successful](docs/screenshots/11-zapier-test-successful.png) |

| Zap 3 business-rule filter | Guided demo bar |
|---|---|
| ![Zap 3 filter](docs/screenshots/16-zapier-zap3-filter.png) | ![Guided demo](docs/screenshots/12-guided-demo-flow1.png) |

### Automation Monitor
| Operations console | Retryable error drawer | Validation error (paused) |
|---|---|---|
| ![Monitor](docs/screenshots/19-monitor-console.png) | ![Error drawer](docs/screenshots/20-monitor-error-drawer.png) | ![Validation error](docs/screenshots/21-monitor-validation-error.png) |

### Delivery and later phase
| Testing & Go-live (17 tests) | AI Automation Roadmap |
|---|---|
| ![Testing](docs/screenshots/22-testing-go-live.png) | ![Roadmap](docs/screenshots/23-ai-roadmap.png) |

| Supplier bills | Integration design | Documentation |
|---|---|---|
| ![Supplier bills](docs/screenshots/24-supplier-bills.png) | ![Design](docs/screenshots/25-integration-design.png) | ![Docs](docs/screenshots/26-documentation.png) |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

Requires Node 18+. The build is a static site with hash routing, so `dist/` can be hosted anywhere, including GitHub Pages.

## Interview walkthrough

The quickest way in is **Guide** in the sidebar footer, or **Start guided demo** on the control center. A bar at the bottom walks through 14 steps. Each step opens the right screen, shows the line to say, and has a button that runs that step's Zap through the real engine:

1. Control center → 2. Process Street CRM task (Zap 1) → 3. Zap 1 in the editor → 4. HubSpot buyer and deal matched → 5. Step 6 (Zap 2A) → 6. Contract draft → 7. Drive folder and documents → 8. Internal approval (Zap 2B) → 9. Buyer e-signature (Zap 2C) → 10. Deal Closed Won → 11. Zap 3 validation → 12. Xero draft invoice → 13. Automation Monitor → 14. AI roadmap.

**Interview Demo Mode** (sidebar footer) locks the laptop layout, opens the guide, and hides development-only controls: reset, uncomplete and the idempotency re-run buttons. The DEMO ENVIRONMENT banner stays.

Things worth showing beyond the main flow:
- **Guardrail:** drag the HubSpot deal to **Closed Won** before signature. The confirmation explains that Zap 3 will run, and its filter then stops it. Xero is untouched.
- **Duplicates:** in **CRM → Contacts → Create contact**, the "Possible duplicate contact found" dialog appears. **Create new contact** explains why it is blocked.
- **Failures:** in the **Automation Monitor**, open the LOT-024 Xero failure (retryable, attempt 1/3) and click **Retry Now**. Open the LOT-027 validation error: it stays paused until the settlement date is fixed.
- **Tests:** in **Testing & Go-live**, run all 17 tests.

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
