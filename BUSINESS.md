# BUSINESS.md — strategy & operating doctrine

**If you are a Claude session working on this repo, this file is a standing
instruction set from the owner.** The owner has delegated product, SEO,
content and prioritization decisions to Claude. Read this and CLAUDE.md,
then continue the operating loop at the bottom. Keep this file current —
it is the project's memory across sessions.

## Goal

$1–2k/month sustainable revenue. Bridge: ads. Long term: subscriptions for
genuinely server-side features. The owner will use the income to fund other
ventures; treat this as a compounding cash-flow asset, not a
growth-at-all-costs startup. Owner does not want to operate day-to-day —
design everything so the human-only actions are rare, small and explicit.

## Honest math (update as real data arrives)

- Ad revenue ≈ pageviews × RPM. Utility-tool sites realistically earn
  $3–10 RPM blended. **$1.5k/month needs roughly 200–300k pageviews/month.**
- A new domain cannot rank for head terms ("merge pdf") against iLovePDF /
  Smallpdf / Adobe for years. The winnable inventory:
  - **Privacy long-tail**: "…without uploading", "offline", "local",
    "secure" modifiers — genuinely differentiated, low competition.
  - **Localized long-tail**: tr/de/es/fr pages (UI already translated) —
    far less SEO competition outside English.
  - **Differentiated tools**: true redaction, client-side OCR (roadmap),
    visual compare, forms.
- Subscription math is friendlier: ~300 subs × $5 ≈ $1.5k/month — but needs
  a paid feature genuinely worth money (Office↔PDF, bulk OCR, API) and an
  audience to sell it to. Traffic comes first either way.
- **Timeline honesty:** first AdSense dollars in months 3–6; hundreds/month
  needs ~50–100k pv/mo (12–18 months if the plan works); $1–2k/month is an
  18–30 month outcome. This project will not produce urgent money. If the
  owner needs money on a shorter horizon, that has to come from elsewhere
  (freelance/contract work); this asset compounds in the background.

## Positioning (do not dilute)

Privacy-first: files never leave the device. When ads arrive, the copy
stays honest: "ads keep the free tools free — they never see your files."
No dark patterns, no fake premium locks on local features, no interstitials.
Accepted trade-off: AdSense in the EEA requires a Google-certified consent
banner (use AdSense's built-in Privacy & messaging CMP); revisit removing
ads entirely once subscriptions carry the revenue.

## Phases & gates

**Phase 0 — Foundation** (now → custom domain live)
- HUMAN: buy a domain (~$10/yr). This blocks everything monetization- and
  SEO-related: AdSense effectively requires your own domain (github.io
  subdomains don't get approved), and every month of content on github.io
  is SEO equity lost to a domain we'll abandon.
- Claude (once domain exists): CNAME + Pages config, BASE_PATH → "/",
  prerender origin swap, privacy policy + terms pages.
- HUMAN: Google Search Console account; hand Claude the verification token.
- Claude: verification file, submit sitemap.
- Gate: site indexed on its own domain, GSC data flowing.

**Phase 1 — Traffic** (months 1–6)
- Localized prerendered tool pages + hreflang (translations already exist).
- Per-tool FAQ/how-to content blocks — crawlable, genuinely useful. Thin
  pages get the whole domain buried by Google's helpful-content systems;
  quality over quantity.
- OCR tool (tesseract.js) — the biggest differentiated keyword surface
  ("OCR without uploading").
- Backlinks: HUMAN posts, Claude drafts every word — Show HN, Product Hunt,
  r/privacy, r/degoogle, AlternativeTo, privacy-tool directories, European
  alternatives lists.
- Weekly: read GSC queries → expand pages that are getting impressions.

**Phase 2 — First revenue** (when >20–30k pv/month)
- AdSense: ONE unit per tool page, below the tool, never inside the working
  area. Requires: domain, privacy policy, content pages, EEA consent CMP.
- Donations footer (GitHub Sponsors / Buy Me a Coffee) — free to add.
- Fake-door demand test, honestly labeled: "PDF → Word — join the waitlist"
  button; count clicks and emails. Build the paid tier only on signal.

**Phase 3 — Subscriptions** (only after demand signal + steady traffic)
- Server-side paid features: Office↔PDF conversion, bulk OCR, API (Stripe).
- Every local tool stays free forever — that's the moat and the marketing.

## Division of labor

Claude decides and executes: features, SEO, content, copy, priorities,
tests, docs. The human-only queue stays short; each item ≤30 minutes:

| # | Action | Status | Blocks |
|---|--------|--------|--------|
| 1 | Buy domain, tell Claude the name | OPEN | everything in Phase 0+ |
| 2 | Set DNS records (Claude supplies exact values) | blocked by 1 | going live |
| 3 | Create Search Console property, paste token to Claude | blocked by 2 | SEO feedback loop |
| 4 | AdSense account + approval submission | Phase 2 | ad revenue |
| 5 | Post launch threads (Claude drafts) | after Phase 0 | backlinks |

## Operating loop (for any Claude session)

1. Read this file + CLAUDE.md.
2. Check the human queue — if a blocker was cleared since last session, do
   the newly unblocked work first.
3. Otherwise ship the top backlog item end-to-end: build → e2e twice →
   docs → commit → push.
4. Update the backlog, decision log and human queue in this file.
5. Report to the owner: what shipped, what's next, and the current
   human-queue asks (repeat them every time; assume the owner lost track).

Owner kickoff prompt for any new session: **"Read BUSINESS.md and continue
the loop."** That single line restores full context and authority.

## Backlog (priority order — Claude may reorder with a note in the log)

1. Localized prerendered pages + hreflang + localized meta (traffic
   multiplier on work already done; cheapest big win).
2. Per-tool FAQ/how-to content blocks, EN + 4 languages.
3. Privacy policy + terms pages (AdSense prerequisite; trust win now).
4. OCR tool — tesseract.js in the worker, lazy WASM, e2e on real scan.
5. PWA/offline install (retention; completes the privacy story).
6. Fake-door waitlist for PDF→Word (Phase 2 demand test).
7. Crop tool, dark mode, editor undo, mobile drag (UX depth).

## Decision log

- 2026-07-25 — Adopted ads-then-subscriptions model with the honest-math
  expectations above. Sequencing: domain first (SEO equity + AdSense
  eligibility), traffic second, monetization third. github.io ruled out as
  a monetizable surface.
- 2026-07-25 — Reprioritized: localized SEO pages + content before OCR
  (better traffic-per-effort; OCR right after). Previous session shipped
  Fill Forms (tool #17) + per-tool SEO prerender/sitemap, 57 e2e checks.
