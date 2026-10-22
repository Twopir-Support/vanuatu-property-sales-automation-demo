# Property Sales Automation — Interactive Demo

A client-facing, fully interactive demo showing how **Pacific Horizon Developments** (Port Vila, Vanuatu) could automate residential lot sales for **Harbour View Residences** across:

- **Process Street** — the sales workflow and form data (source of truth)
- **HubSpot CRM** — buyer contact and lot deal, with duplicate-safe upserts
- **Google Drive / Docs** — per-sale folder, document filing, contract generation
- **Xero** — milestone-gated deposit invoice
- **Make.com or Zapier** — orchestration, retries and monitoring
- **OpenAI or Claude** — future AI-assisted automations (roadmap only)

> **DEMO ENVIRONMENT · SYNTHETIC DATA · SIMULATED INTEGRATIONS**
> All people, records, amounts and documents are fictional. No vendor APIs are called and no credentials are needed. The product-style screens are original components that recreate familiar UI patterns; they are not the vendors' software, use no vendor logos, and imply no affiliation or endorsement.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

Requires Node 18+. The build is a static site (hash routing), so `dist/` can be hosted anywhere, including GitHub Pages.

## The demo scenario

| Field | Value |
|---|---|
| Company | Pacific Horizon Developments, Port Vila, Vanuatu |
| Development / lot | Harbour View Residences · `LOT-025` |
| Buyer | Alex Morgan · alex.morgan@example.com · +678 555 0142 · Buyer ID `BUY-0142` |
| Sale price | VT 12,500,000 (VUV) |
| Sales rep | Sarah Williams |
| Deal stage | Contract Approval |
| Settlement | 15 December 2026 |

Every screen uses the same cross-system record IDs, so the one transaction can be traced everywhere:

| Record | ID |
|---|---|
| Transaction | `TXN-HVR-025` |
| Process Street run | `PS-RUN-0425` |
| HubSpot contact / deal | `HS-C-1002450` / `HS-D-3008250` |
| Sale contract | `CTR-LOT-025` |
| Google Drive folder | `GD-FLD-LOT025` (“LOT-025 — Alex Morgan”) |
| Xero contact / invoice | `XC-ALEX-0142` / `INV-0025` |

## Suggested walkthrough (about 10 minutes)

1. **Overview** — KPIs, the “one transaction, five systems” tracker, and the *Next action* prompt.
2. **Workflow** (Process Street-style) — 5 of 8 steps complete. Edit a form field, **Save Changes**, then **Sync to HubSpot**. Click sync again and the second run is **suppressed as a duplicate**.
3. **CRM** (HubSpot-style) — the deal record shows the updated amount, the activity timeline, associations and **Duplicate Check: Passed**. Under *Contacts → Create contact*, a re-submitted enquiry is caught as a duplicate.
4. Back in the **Workflow**, complete **step 6** to generate the contract (it is filed in Drive), then **Approve** in **step 7**.
5. **Contracts** — merged agreement, approval trail and merge-field mapping.
6. **Documents** (Google Drive-style) — folder tree, labels, preview, *New → New folder / File upload*.
7. **Accounting** (Xero-style) — `INV-0025` appears as a **Draft** only after contract approval. Edit lines, then Submit → Approve → Record payment.
8. **Automation Monitor** — every run with its idempotency key and payload. **Replay** a processed run (duplicate suppressed). Turn on *Settings → Simulate an API outage* to show a failed run and a **Retry**.
9. **AI Automation Roadmap** — phased AI use cases with human-in-the-loop guardrails and a simulated buyer-update draft (EN / FR / Bislama).
10. **Settings → Reset demo scenario** restores the starting state.

## Automation rules (simulated)

| Trigger | Action | Idempotency key |
|---|---|---|
| Step 5 completed / *Sync to HubSpot* | Upsert contact (Buyer ID, then normalised email) and deal (one open deal per Lot ID + Buyer ID) | `hs.upsert:TXN-HVR-025:<payload hash>` |
| Step 6 completed | Merge contract template → save to Drive › 04 Contracts | `contract.generate:TXN-HVR-025:v1` |
| Step 7 approved | Deal → *Contract Approved*; then find-or-create Xero contact and create **draft** deposit invoice | `contract.approve:…:v1`, `xero.invoice:TXN-HVR-025:deposit` |
| Step 8 completed | Deal → *Closed Won*, contact → Customer, Drive folder labelled Completed | `sale.complete:TXN-HVR-025` |
| Xero invoice paid | Timeline note on the HubSpot deal | `xero.paid:INV-0025` |

Processed keys are stored; any replay, double-click or re-completed step records a *duplicate suppressed* run and writes nothing. Failed runs never record their key, so a retry executes normally.

## Project structure

```
src/
  data/        types, record IDs, seed data, lot register
  store/       engine.ts (pure, idempotent integration engine) · DemoStore.tsx (context + localStorage)
  lib/         formatting, integration status, system metadata
  components/  app shell, demo banner, product frame, UI primitives, toasts
  pages/       Overview, LotSales, Workflow, Crm, Contracts, Documents, Accounting, Monitor, Roadmap, Settings
```

Stack: React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Lucide icons. Demo state is kept in the browser's `localStorage` only.
