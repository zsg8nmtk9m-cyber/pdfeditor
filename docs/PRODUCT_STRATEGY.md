# PDF Toolbox product strategy

Last updated: 2026-08-14

## Product thesis

PDF Toolbox wins on a simple promise: sensitive documents can be edited quickly without being uploaded. The free browser tools are the acquisition product. Revenue should come from professional time-saving features—not by weakening privacy, adding artificial file limits, or removing tools users already have.

Primary audience: freelancers and operations-heavy small teams that repeatedly prepare contracts, invoices, applications, reports, and scanned documents. The initial wedge is people who care about confidentiality but do not need a heavyweight desktop editor.

Positioning: **the private PDF workflow toolbox that runs on your device.**

## Business model

### Free

- All current single-purpose tools
- Unlimited local processing
- Five interface languages
- On-device recent files and cross-tool handoff
- No account required

### Pro

- Multi-step reusable workflows (for example: merge → watermark → page numbers → protect)
- Saved operation presets
- Folder-scale batch processing and ZIP export
- Offline installable app
- Workflow import/export for teams
- Priority support and early access

Launch pricing hypothesis: a $39 one-time Founding Pro license, moving to $59 after validation. A future team tier can add shared workflow templates and centralized license management. Pricing is a hypothesis to test, not a permanent promise.

This split keeps the privacy claim honest and gives professionals a reason to pay for saved time. The paid layer must not inspect or upload document contents.

## Path to profitability

1. **Launch foundation.** Make the existing product easy to discover, understand, trust, and verify. Establish documentation, search, route metadata, quality gates, a stable domain, and privacy-safe product analytics.
2. **Organic acquisition.** Publish indexable pages for high-intent tools and localized queries. Measure tool starts, successful exports, repeat use, and cross-tool continuation without collecting document data.
3. **Pro validation.** Add an in-product Founding Pro waitlist and interview repeat users. The validation threshold is 20 explicit purchase intents or 10 prepaid licenses before building account infrastructure.
4. **Paid workflow MVP.** Ship local workflow composition, saved presets, license activation, and payment. Keep the free feature set intact.
5. **Retention and teams.** Add workflow sharing, folder automation, desktop packaging, and support. Expand only from observed workflows and search demand.

Because the free application can be hosted statically, baseline infrastructure cost should remain small. The first profitability milestone is therefore monthly revenue exceeding payment, domain, hosting, support, and acquisition costs for three consecutive months—not an arbitrary user count.

## Metrics

North-star metric: **successful document exports per weekly active device.**

Commercial funnel:

- Search/landing visit → tool opened
- Tool opened → file selected
- File selected → successful export
- Successful export → another tool or return visit
- Repeat user → Pro intent
- Pro intent → purchase

Privacy guardrails: never collect filenames, file sizes precise enough to identify a document, metadata values, page text, passwords, signatures, or document bytes. Coarse performance buckets and anonymous tool identifiers are acceptable.

## Roadmap

### M0 — Launch-ready foundation (current)

- [x] Restore product/engineering documentation
- [x] Add tool discovery search and localized empty states
- [x] Add route-aware titles/descriptions and social metadata
- [x] Verify responsive UX, keyboard accessibility, build, and full e2e behavior
- [x] Add required pull-request build and browser quality gates
- [x] Implement a typed, privacy-safe activation event schema with no default network transport
- [ ] Configure repository description, topics, homepage, and stable default branch

Exit: the public app has a credible landing experience, reproducible build, green tests, and measurable activation events.

### M1 — Acquisition and evidence

- [x] Static, indexable landing output for each tool route
- [x] Sitemap and canonical URLs
- [ ] Branded domain and social preview image
- [x] Explicit privacy-safe activation event schema
- [ ] Cookieless analytics transport after the owner creates a public site ID
- Feedback/Founding Pro intent capture
- Performance budget and Core Web Vitals monitoring

Exit: at least 100 weekly tool starts and enough funnel data to identify the top three jobs.

### M2 — Workflow MVP

- Multi-step pipeline engine using existing worker operations
- Workflow builder with templates for common document jobs
- Saved presets and local workflow history
- Import/export workflow recipes
- Pro entitlement boundary that leaves existing tools free

Exit: 20 credible purchase intents or 10 preorders and five users repeatedly completing a workflow.

### M3 — Paid launch

- Payment, tax handling, license issuance, restore-purchase flow, and support policy
- Offline/PWA packaging and clear device limits
- Upgrade surfaces based on value moments, not interruption
- Refund, privacy, terms, and license documentation

Exit: positive contribution margin and five paying users completing multiple workflows.

### M4 — Retention and team expansion

- Team workflow templates and admin-managed licenses
- Folder-scale processing and desktop wrapper if browser permissions limit demand
- Template gallery driven by observed usage
- Localization expansion based on acquisition data

## Product principles

- Local-first is the differentiator, not marketing decoration.
- Existing free capabilities stay free.
- Reliability of generated documents matters more than feature count.
- Every long operation runs off the UI thread and reports progress.
- Paid features must save repeated effort or enable a workflow, not merely hide a button.
- No backend is introduced until a validated feature requires one.

## Owner actions needed for M0/M1

These are the only real-world actions the product owner currently needs to perform:

1. Choose and purchase a short branded domain.
2. Decide whether the code will remain all-rights-reserved, use an open-source license, or adopt a dual-license model. Obtain legal advice if needed.
3. After the analytics event schema is implemented, create the selected analytics property and provide the public site ID.
4. Configure GitHub repository description, topics, homepage URL, and the intended stable default branch.

Payment-provider setup is intentionally deferred until purchase intent is validated.

## Decision log

- 2026-08-14: Preserve all current tools as the free acquisition product.
- 2026-08-14: Monetize workflow automation, presets, offline use, and team productivity.
- 2026-08-14: Start with launch readiness and evidence before payment infrastructure.
- 2026-08-14: Use a one-time Founding Pro price as the first pricing test.
