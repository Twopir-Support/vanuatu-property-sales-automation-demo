# MASTER PROMPT — PROPERTY SALES AUTOMATION DEMO (UPDATED)

Use this prompt to rebuild, extend or hand over the interactive demo for the Vanuatu property-development client. It brings together the original brief, the client's job post, the three-flow design and every decision made while building the demo.

---

## 1. Role

Act as a senior full-stack engineer, product designer, UX specialist and integration architect with proven HubSpot and Xero integration experience and Process Street knowledge.

Build and maintain a polished, interactive, client-facing demo for a real client interview. It must hold up during screen sharing and be useful for the client to explore on their own.

---

## 2. The client and what they asked for

The client is a property development company in Vanuatu launching a residential subdivision within weeks. They need an experienced integrator to connect their sales workflow (**Process Street**) with their CRM (**HubSpot**), accounting system (**Xero**) and document storage (**Google Drive**). The goal is for each lot sale to move through their systems with as little manual re-entry as possible.

**Scope from the job post:**

- Connect the existing Process Street sales workflow to HubSpot, Xero and Google Drive. Use native integrations where they fit and **Zapier** as the middleware where they don't. The client uses Zapier, not Make.
- Automate document generation (sale contracts) and the approval steps.
- Test end to end with test records before go-live.
- Document what is built so the client's team can maintain it.
- **Later phase:** automate supplier invoices from **two shared inboxes** into Xero as **draft bills**.
- Requirement: proven HubSpot and Xero integration experience; Process Street experience is a strong plus.

---

## 3. Repository, delivery and hosting

- Repository: `https://github.com/Twopir-Support/vanuatu-property-sales-automation-demo`
- Development branch: `claude/bold-keller-dteej7`. It is the only branch and is the default.
- Inspect the repo first and preserve existing work.
- Commit with clear messages, push, and confirm with `git ls-remote` that the push landed. Never claim a push you haven't confirmed.
- Never commit tokens, credentials, `.env` files, API keys or OAuth secrets.
- Live demo, private until shared through the page's Share menu: `https://claude.ai/artifact/9yDiTymxzb5ZWys7QrYNAk`. Republish the same `dist/index.html` path with its assets to keep the same URL.
- GitHub Pages is optional; it needs Pages switched on in the repository settings.

---

## 4. Technology stack (as built)

- React 19, TypeScript, Vite, Tailwind CSS v4, React Router (HashRouter, so it works on any static host) and Lucide icons.
- No backend and no credentials. A pure, deterministic flow engine handles state, and demo state is saved in browser `localStorage` with try/catch fallbacks.
- Modular structure:

```
src/
  data/        types, record IDs, seed data, Zap definitions, supplier-bill seed, field mapping, lots
  store/       engine.ts (pure, idempotent flow engine) · uat.ts (executable end-to-end tests) · DemoStore.tsx
  lib/         formatting, integration status, system metadata
  components/  app shell, demo banner, product frame, UI primitives, toasts
  pages/       Overview, LotSales, Workflow, Crm, Contracts, Documents, Accounting, Zaps, Monitor,
               IntegrationDesign, Testing, Documentation, SupplierBills, Roadmap, Settings
```

- Scripts: `npm run dev`, `npm run build` (type-check + build) and `npm run preview`.

---

## 5. Authentic-looking product screens (rules)

- Recreate **recognisable functional UI patterns** of Process Street, HubSpot, Xero, Google Drive and Zapier as **original components**: layout, navigation, tables, record panels, badges, toolbars and forms.
- **No** vendor logos, no fabricated screenshots, no scraped private screens.
- Every product-style view carries a label: *"Simulated <Product>-style view · original demo component, not the <Product> product · synthetic data"*.
- The sidebar footer reads: *"Concept demo. Not affiliated with or endorsed by Process Street, HubSpot, Xero, Zapier or Google."*
- A persistent banner, above every screen, dialog and overlay, reads: **DEMO ENVIRONMENT · SYNTHETIC DATA · SIMULATED INTEGRATIONS**
- Optimise for 1440 × 900 and 1280 × 720 laptop screen sharing; the layout must stay usable on mobile.

---

## 6. Synthetic business data (use consistently)

| Field | Value |
|---|---|
| Company | Pacific Horizon Developments, Port Vila, Vanuatu |
| Development | Harbour View Residences |
| Lot | LOT-025 |
| Buyer | Alex Morgan · alex.morgan@example.com · +678 555 0142 · Buyer ID BUY-0142 |
| Sale price | VT 12,500,000 (VUV) |
| Sales rep | Sarah Williams · Director/approver: David Kalo · Finance: Mere Tasso |
| Starting deal stage | Contract Approval |
| Settlement | 15 December 2026 |

**Cross-system record IDs** (the same on every screen):
TXN-HVR-025 · PS-RUN-0425 · HS-C-1002450 / HS-D-3008250 · CTR-LOT-025 · GD-FLD-LOT025 ("LOT-025 — Alex Morgan") · XC-ALEX-0142 / INV-0025

All data is synthetic; never use real personal or client data.

---

## 7. The three core flows (Zapier middleware)

### Flow 1 — Checklist → HubSpot (Zap 1)
- **Process Street:** the salesperson completes the lot-sale checklist, entering buyer details, lot ID, price and required documents.
- **HubSpot:** find or create the buyer and the deal using stable identifiers so nothing is duplicated.
- Zap steps:
  1. Process Street *Task Checked* (step 5)
  2. Filter: checked, and buyer ID, lot ID and email present
  3. Formatter: trim and lowercase the email; format numbers and dates
  4. HubSpot *Find Contact* on `buyer_id`, then email, creating the contact if not found
  5. *Update Contact*
  6. *Find Deal* on `deal_key` (Lot ID + Buyer ID), creating the deal if not found
  7. *Update Deal*
  8. *Create Association* (contact ↔ deal)
  9. Storage by Zapier key `hs.upsert:TXN:<payload hash>`
- Repeat syncs with unchanged data are skipped; a price change updates the same deal.

### Flow 2 — Contract → review → signature → Google Drive (Zaps 2A, 2B, 2C)
- **HubSpot:** the buyer and deal from Flow 1 are the source record.
- **Document generation:** fill in the approved sale-contract template, then route it for review and signature.
- **Google Drive:** create the transaction folder and save the draft, approved and signed contract plus the supporting documents.
- **Zap 2A** (step 6 checked):
  1. Storage check
  2. HubSpot *Find Deal*
  3. Drive *Find Folder* "LOT-xxx — Buyer", creating it if not found, plus 5 sub-folders: 01 Buyer identification, 02 Proof of address, 03 Sale application, 04 Contracts, 05 Finance
  4. Upload the supporting documents from the run
  5. Google Docs *Create Document From Template* → `…_v1_DRAFT` in 04 Contracts
  6. Write the draft link to the run for the approver
  7. Add a HubSpot note
- **Internal review:** a Process Street approval task (step 7) with stop tasks.
- **Zap 2B** (step 7 approved):
  1. `…_APPROVED.pdf` to Drive
  2. E-signature *Send Signature Request* to the buyer (Dropbox Sign, DocuSign or PandaDoc, chosen with the client)
  3. Deal stage → **Out for Signature**
- **Zap 2C** (buyer signed):
  1. `…_SIGNED.pdf` to Drive
  2. Deal stage → **Closed Won**
  3. Mark the run as signed

### Flow 3 — Deal won → Xero (Zap 3)
- **HubSpot:** when the deal is won, Zap 3 starts.
- **Xero:** create the draft accounting transaction only when the business rules and approval conditions are met.
- The Zap 3 filter requires all of the following:
  1. Contract approved internally
  2. Contract signed by the buyer
  3. Buyer ID and Lot ID present
  4. Amount > 0
  5. Currency VUV
  6. No Xero invoice already linked
- If the filter passes:
  1. Xero *Find Contact* by email, creating it if not found
  2. *Create Sales Invoice* with status **DRAFT**, currency VUV, a 10% deposit line (610 Customer Deposits, Tax Exempt) and a 45,000 contract administration fee (200 Sales, VAT 15%)
  3. Write the invoice number back to the HubSpot deal
- Dragging a deal to Closed Won early is **stopped by the filter**, and Xero is not touched.
- Tax treatment is illustrative and must be confirmed with the client's accountant.

### Supporting and later-phase Zaps
- **Zap 4:** Xero payment → HubSpot deal note.
- **Zap 5:** settlement (step 8) → HubSpot settled, contact → Customer, Drive folder labelled Completed.
- **Zap 6 (later phase):** two shared inboxes (accounts@, site@) → extraction → Xero **DRAFT** bill with the PDF attached.
  - Duplicate key is supplier + invoice number, checked **across both inboxes** and existing Xero bills.
  - Extractions below 85% confidence, or with no due date, go to a review queue.
  - Option A for comparison: Xero's native email-to-bills.

### Duplicate protection
Every Zap checks, then writes, a key in Storage by Zapier before it creates anything:
- `hs.upsert:…`
- `contract.generate:…` / `contract.approve:…` / `contract.signed:…`
- `xero.invoice:TXN:deposit`
- `xero.bill:<supplier>:<invoice no.>`

Replays, double clicks and re-checked tasks are skipped. Failed runs never record their key, so a retry runs normally.

---

## 8. Verified integration findings (cite in the demo)

- **HubSpot's native Xero data-sync app** supports only USD, CAD, EUR, GBP, AUD and NZD, so **VUV is not supported**. It also syncs HubSpot invoices to Xero only once they are open, not as drafts. That is why Zap 3 uses Zapier's Xero app. Source: https://knowledge.hubspot.com/integrations/connect-hubspot-and-xero-data-sync
- **Process Street ↔ HubSpot:** Process Street documents webhooks and Zapier as its routes; no native connector is described. Sources: https://www.process.st/help/docs/hubspot/ and https://zapier.com/apps/hubspot/integrations/process-street
- **Xero email-to-bills** creates draft bills from emailed PDFs. Source: a third-party guide (https://trinitygroup.com.au/post/email-pdf-bills-into-your-xero-organisation/); verify against Xero's own help before relying on it.
- **Unverified:** whether VUV is available as the Xero base currency. Raise it as a discovery question.
- Zap step and event names are **indicative** and must be confirmed in Zapier during the build.

---

## 9. Application structure

Sidebar, grouped and readable, with the product name shown under each item:

- **Overview** · **Lot Sales**
- **Sales systems:**
  - Workflow (Process Street)
  - CRM (HubSpot)
  - Contracts (template · review · e-signature)
  - Documents (Google Drive)
  - Accounting (Xero)
- **Zapier automation:**
  - Zaps (Flows 1 · 2 · 3)
  - Automation Monitor
  - Integration Design
- **Delivery:**
  - Testing & Go-live
  - Documentation
- **Later phase:**
  - Supplier Bills (shared inboxes → Xero)
  - AI Automation Roadmap
- **Settings**

### Page requirements

**Overview**
- KPIs.
- A "one transaction, five systems" tracker with deep links.
- A next-action prompt.
- Integration status, recent activity and pipeline by stage.
- A panel mapping each point in the job post to the screen that shows it.

**Workflow (Process Street-style)**
- Title "Lot Sale — LOT-025"; workflow "Residential Lot Sale"; starts at 5 of 8 steps complete.
- Steps:
  1. Buyer information collected
  2. Lot information verified
  3. Sale price confirmed
  4. Required documents received
  5. CRM record synchronized
  6. Contract generated
  7. Contract approved
  8. Sale completion confirmed
- Editable fields: buyer name, email, phone, project, lot ID, sale price, sales rep, settlement date, required documents.
- Document checklist: identification, proof of address and sale application received; sale contract awaiting generation.
- Approval task with Approve / Reject (reject requires a comment) and a buyer e-signature panel with "Simulate buyer signature".
- Stop tasks on steps 6–8.
- Right panel showing HubSpot, contract generation, Google Drive and Xero status, plus the Zap list and an activity history.
- Buttons: Save Changes, Sync to HubSpot, Complete Step.

**CRM (HubSpot-style)**
- Deals board/table for the Lot Sales pipeline. Stages: Enquiry → Lot Reserved → Documents Received → Contract Approval → Out for Signature → Closed Won.
- Contacts list with a "Create contact" panel showing the duplicate-email warning.
- Deal and contact records: properties panel, Overview/Activities tabs, timeline (10:02–10:06 integration entries), associations, attachments and invoices.
- "Duplicate Check: Passed" card and a stage dropdown that triggers Zap 3.

**Contracts**
- Contract register, merge-field preview and mapping.
- Approval trail: generated → reviewed → sent for signature → signed → Xero.

**Documents (Google Drive-style)**
- New → New folder / File upload, breadcrumbs, list/grid views and a details panel.
- Labels: Draft, Approved, Signed, Received and Completed.
- Full-screen preview.
- The LOT-025 folder only appears once Zap 2A has run.

**Accounting (Xero-style)**
- Invoice list with status tabs.
- A "waiting for milestone" banner showing the live Zap 3 rules checklist.
- Invoice editor: To, dates, number, reference, line items, account, tax, subtotal/VAT/total.
- Draft → Awaiting Approval → Awaiting Payment → Paid, with history.

**Zaps (Zapier-style editor)**
- Zap list grouped by flow, a vertical step canvas and a step panel showing field mappings as data pills plus test output for LOT-025.
- Zap runs history and a "Run on LOT-025" button.

**Automation Monitor**
- Every run with its key, payload, result and duration.
- Replay (skipped if already done) and Retry; status cards; per-Zap list.

**Integration Design**
- Architecture diagram with Zapier at the centre.
- Connections table (Zap, from → to, trigger, method, reason) and the VUV finding.
- Supplier-bill options A and B, discovery questions and sources.

**Testing & Go-live**
- 15 executable end-to-end tests against a sandbox copy covering: matching, repeat syncs, price updates, email case handling, contract gating and single generation, Drive filing, approval not touching Xero, the early Closed Won filter, signed + won → one VUV draft, outage and retry, settlement, inbox processing, re-polling, and the low-confidence review.
- List of test records (TEST- prefix) and a go-live checklist with persisted ticks.

**Documentation**
- Systems of record, Zap catalogue (trigger, steps, key, owner, failure action), field mapping, alerts and how-to procedures.
- Downloadable runbook (`.md`).

**Supplier Bills (later phase)**
- Two shared-inbox mailbox views, reading pane, synthetic invoice preview, extracted fields with confidence, "Run inbox poll now".
- Xero-style Bills to pay with drafts; the duplicate is skipped and the low-confidence bill is held.

**AI Automation Roadmap**
- Phase 1: go-live of the lot-sales Zaps, weeks 1–4.
- Phase 2: supplier bills, weeks 5–8.
- Phase 3: AI assistance via Zapier, weeks 9–12.
- Use cases with trigger → AI step → human review → output, guardrails, and a deterministic buyer-update draft in English, French and Bislama labelled "Simulated · no AI call".

**Settings**
- Switches: auto-sync on save, enforce stop tasks, simulate API outage.
- Simulated connections, including "Zapier (middleware)".
- Field mapping and reset demo scenario.

---

## 10. Interview walkthrough (about 10 minutes)

1. **Overview:** the scope panel and the five-system tracker.
2. **Flow 1:** edit the price, Save, Sync to HubSpot, then sync again to show it skipped. Open Zap 1, then show the duplicate-contact block.
3. **Guardrail:** drag the HubSpot deal to Closed Won. The Zap 3 filter stops it and Xero is untouched. Set the stage back.
4. **Flow 2:** check step 6 to produce the Drive folder, supporting documents and the DRAFT. Approve step 7 to file the APPROVED PDF and send for signature. Simulate the signature to file the SIGNED PDF and win the deal.
5. **Flow 3:** all six rules pass, Xero shows draft INV-0025, and the number is written back to the deal.
6. **Testing & Go-live:** run 15/15 tests. **Documentation:** download the runbook.
7. **Supplier Bills:** poll the inboxes for 4 drafts, 1 duplicate skipped and 1 held for review.
8. **Outage simulation:** fail and retry in the Monitor. **Reset demo scenario** to finish.

Talking points: understanding of the business; relevant HubSpot, Xero and Zapier experience; the AI and automation mindset; ongoing support (10–15 hours/month); clear documentation for the client's team.

---

## 11. Open questions for discovery

- Is VUV the Xero base currency, and is anything invoiced in AUD or NZD?
- Process Street plan (webhooks and approvals); HubSpot tier; Zapier plan and task volume.
- Who approves contracts, and which e-signature tool will be used?
- VAT on deposits and fees (accountant).
- Are the shared inboxes on Google Workspace or Microsoft 365? Monthly supplier-invoice volume; tracking categories (Stage 1 / 2).

---

## 12. Quality bar before every push

- `npm run build` passes with zero type errors.
- Drive the app in Chromium (Playwright, `executablePath: /opt/pw-browsers/chromium`): no console errors, 15/15 tests pass, and the full Flow 1 → 2 → 3 sequence works.
- Regenerate the README screenshots (`docs/screenshots/01–20`) from the running app with notifications hidden.
- Republish the live demo artifact from `dist/index.html` with its `assets/*` and `favicon.svg` files.
