# Repository guidance

## Mission

Private Document Toolbox is a privacy-first, browser-only PDF, image, and office utility suite built with React, TypeScript, Vite, Tailwind CSS, PDF.js, and `@cantoo/pdf-lib`. Preserve the core promise: document bytes, filenames, metadata, and passwords stay on the user device unless a future feature explicitly changes that product contract.

## Environment

- Use Node.js 22 and npm.
- Install the locked dependency graph with `npm ci`.
- Install Chromium for the browser suite with `npx playwright install --with-deps chromium`.
- Start local development with `npm run dev`.
- Run the production/type check with `npm run build`.
- Run the end-to-end suite with `npm run test:e2e`.
- Do not edit the generated `gh-pages` branch.

## Required validation

- Documentation-only changes: verify links, commands, and claims against the repository and primary sources.
- TypeScript, styling, configuration, or build changes: run `npm run build`.
- User-visible flows, routing, PDF operations, worker changes, storage, or downloads: run both `npm run build` and `npm run test:e2e`.
- When a check cannot run, state the exact command, failure, and remaining risk in the pull request.

## Architecture invariants

- Keep PDF processing in the browser. Do not introduce document uploads or server-side copies without an explicit product decision and threat-model update.
- Run CPU-heavy PDF operations in `src/worker/`; keep the worker protocol typed and report progress for long work.
- Verify generated files by reopening or parsing them in tests, not only by asserting that a button or download appeared.
- Keep new user-facing copy localized in English, Turkish, German, Spanish, and French.
- When adding a tool route, update route metadata, static-page generation, sitemap behavior, navigation, and end-to-end coverage.
- Analytics must be cookieless and must never include filenames, document contents, document metadata, passwords, or other user PDF data. Follow `docs/ANALYTICS.md` when it exists on the branch.
- Prefer existing dependencies and browser APIs. Explain any new production dependency in the pull request.

## Working agreement

- Inspect the relevant implementation, tests, workflows, and product documentation before editing.
- Keep changes scoped. Preserve unrelated work and avoid broad rewrites unless the task requires them.
- Use `agent/<short-description>` branches and open draft pull requests against `main`.
- Keep commits small and intentional. Include the validation evidence and known limitations in the pull request.
- Use web research for current or uncertain facts and prefer primary sources. Use official OpenAI documentation for Codex or OpenAI behavior.
- Do not commit secrets, tokens, generated dependency folders, test downloads, or local environment files.
- Continue autonomously through routine repository inspection, implementation, testing, commits, pushes, and draft-PR creation. Ask for a human only when credentials, billing, legal/product policy, destructive operations, or external account settings are required.
- Do not merge a pull request unless the task explicitly authorizes merging after checks and review are complete.

## Parallel-agent workflow

- For complex work that separates cleanly, delegate independent read-heavy lanes such as architecture exploration, test analysis, documentation research, and review.
- Keep the parent agent responsible for requirements, decisions, integration, and the final verification summary.
- For write-heavy work, assign disjoint file ownership. If agents would touch overlapping files or shared state, use one writer and parallel reviewers.
- Wait for delegated work to finish, reconcile conflicting findings, and validate the combined result before publishing.
- Avoid delegation for small or tightly coupled changes where coordination would cost more than it saves.

## Code review rules

- Flag any path that sends PDF bytes, filenames, metadata, or passwords off-device. The safe path is browser memory, IndexedDB, and local downloads only.
- Flag heavy document work added to the React/UI thread when it can run in the PDF worker; blocking the UI breaks the responsiveness contract.
- Flag PDF operations whose tests only assert UI state. The safe path is to parse the downloaded artifact and assert its structure or content.
- Flag user-visible copy added without all five supported locales.
- Flag analytics payloads outside the documented allowlist or any payload derived from a user document.
