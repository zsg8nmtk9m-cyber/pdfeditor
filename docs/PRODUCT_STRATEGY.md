# Safe to Share product strategy

Last updated: 2026-09-02

## Product thesis

Generic browser PDF tools are a commodity. The product wins by owning a higher-stakes job:

> **Make this PDF safe to share — without sending it anywhere.**

The primary audience is professionals who release confidential documents under deadline: small legal practices, immigration and legal-aid teams, HR operators, accountants, consultants, and operations-heavy small businesses.

The flagship experience is **find → fix → prove**:

1. Find hidden release-risk signals locally.
2. Fix them with an honest maximum-safety export and the existing redaction tools.
3. Prove what the software checked with output verification and a release receipt.

The 18 standalone PDF, image, and Office tools remain free. They acquire search traffic, demonstrate the local-processing engine, and feed users into Safe to Share. More isolated utilities are not the commercial strategy.

## Product contract

- Document bytes, extracted text, filenames, metadata values, passwords, and signatures do not leave the device.
- Automated checks assist human review; they do not declare a document legally compliant or universally safe.
- The maximum-safety export removes hidden and interactive content by rasterizing every visible page. The UI must disclose the loss of selectable text, links, forms, and accessibility structure.
- A release receipt records inputs, checks, hashes, and verification results. It is evidence of software behavior, not a certification.
- Existing standalone capabilities stay free. Paid value must save repeated professional effort.

## Business model hypothesis

The product is free during evidence collection. After purchase intent is validated, test:

- **Free:** all standalone tools, local leak scan, and occasional verified releases
- **Release Pass — $9:** unlimited verified releases for 72 hours
- **Pro — $12/month or $99/year:** unlimited releases, batch mode, reusable local policies, and receipt history
- **Firm — $49/month for five users:** shared policies, case-oriented receipt management, and priority support

These prices are hypotheses. Do not build account or payment infrastructure until at least 20 credible purchase intents or 10 preorders exist.

## Path to profitability

1. **Flagship foundation.** Ship a trustworthy Safe to Share workflow with local inspection, maximum-safety export, post-export verification, receipts, and adversarial tests.
2. **Evidence.** Add a branded domain and privacy-safe analytics transport. Measure scans, acknowledged exports, repeat use, and Founding Pro intent without document-derived data.
3. **Repeatability.** Add saved release policies, batch verification, receipt history, and stronger manual/search-assisted redaction.
4. **Paid launch.** Add payment, tax handling, license issuance, restore-purchase, terms, refunds, and support only after validation.
5. **Firm expansion.** Add shareable policies and centralized receipt management without moving document contents to the server.

Baseline hosting can remain static and inexpensive. Profitability means monthly revenue exceeds payment, domain, hosting, support, and acquisition costs for three consecutive months.

## Metrics

North-star metric: **verified releases per weekly active device.**

Commercial funnel:

- Landing visit → release scan started
- Scan completed → human review acknowledged
- Acknowledged → verified export created
- First export → repeat release
- Repeat release → Founding Pro intent
- Intent → paid conversion

Privacy guardrails: never collect filenames, exact file sizes, matched values, page text, document metadata, passwords, signatures, document bytes, hashes, or receipt contents. Coarse finding bands and boolean verification outcomes are acceptable.

## Roadmap

### S1 — Flagship foundation (current)

- [x] Reposition the home page around Safe to Share
- [x] Inspect metadata, annotations, form fields, attachments, scripts/actions, and common selectable-text patterns locally
- [x] Return counts only; never copy matched values into analytics or general UI state
- [x] Create a maximum-safety rasterized release copy
- [x] Reopen and recheck the exported bytes
- [x] Generate a local receipt with source/output SHA-256 hashes
- [x] Require explicit human-review acknowledgement
- [x] Preserve all 18 standalone tools and five interface languages
- [ ] Expand hostile-PDF fixtures across annotations, attachments, actions, malformed forms, image-only text, and hidden layers
- [ ] Add search-assisted manual redaction without external AI

Exit: a user can complete one honest, tested release workflow without document network requests.

### S2 — Evidence and repeat use

- Branded domain and social preview image
- Privacy-safe analytics transport after the owner creates a public site ID
- Post-success Founding Pro research and interviews
- Reusable local release policies with strict versioned validation
- Batch release checks and receipt history
- Performance budgets and cross-browser matrix

Exit: 100 weekly release scans, five repeat professional users, and 20 credible purchase intents or 10 preorders.

### S3 — Paid release

- Release Pass and Pro checkout
- Tax, refund, privacy, terms, license, and support policies
- License activation and restore-purchase flow that never receives document content
- Offline installable app

Exit: positive contribution margin and five paying users completing multiple verified releases.

### S4 — Firm expansion

- Shared policy templates without shared document contents
- Receipt administration and retention controls
- Folder-scale processing and desktop wrapper where browser permissions limit demand
- Localization expansion based on acquisition data

## Owner actions needed

1. Choose and purchase a short branded domain.
2. Decide whether the code remains all-rights-reserved, becomes open source, or uses a dual-license model; obtain legal advice where needed.
3. Create a privacy-safe analytics property and provide its public site ID when evidence collection is ready.
4. Before charging, select payment/tax handling and approve the terms, refund, privacy, and support policies.

## Decision log

- 2026-08-14: Preserve all existing tools as the free acquisition product.
- 2026-08-18: Broaden the toolbox while keeping all processing local.
- 2026-09-02: Stop competing on tool count and reposition around Safe to Share.
- 2026-09-02: Use find → fix → prove as the flagship workflow.
- 2026-09-02: Keep Safe to Share free during purchase-intent validation; monetize repeatability after evidence.
