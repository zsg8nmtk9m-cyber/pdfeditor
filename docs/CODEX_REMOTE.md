# Codex remote development

This repository is prepared for remote-first development with Codex cloud, GitHub Actions, draft pull requests, and parallel subagent workflows. Repository instructions live in `AGENTS.md`; account-level environment and review settings remain in Codex and GitHub settings.

## Target topology

1. Codex cloud checks out `main` into an isolated container.
2. The setup script installs the locked Node.js dependency graph and Playwright Chromium.
3. A parent agent owns requirements, integration, and final verification.
4. Independent subagents can explore architecture, analyze tests, research documentation, or review a change in parallel.
5. Implementation is published on an `agent/<description>` branch as a draft pull request.
6. GitHub Actions runs the production build and end-to-end suite.
7. Codex code review and a human-visible diff remain the merge gate.

## One-time Codex cloud environment

Create an environment named `pdfeditor` for `zsg8nmtk9m-cyber/pdfeditor` and select `main`.

Use Node.js 22 and this setup script:

```bash
npm ci
npx playwright install --with-deps chromium
```

No application secrets are currently required. Do not add document data, sample customer files, passwords, or analytics credentials as general environment variables.

Leave the maintenance script empty initially. Add one only when cached environments need a repeatable refresh step.

### Internet policy

Setup scripts already receive internet access. For the agent phase, use limited internet access rather than unrestricted access:

- Start with the Common dependencies preset.
- Allow `GET`, `HEAD`, and `OPTIONS` only.
- Add `developers.openai.com` and `learn.chatgpt.com` for current OpenAI documentation.
- Add a product documentation domain only when a task needs it, then remove it if it is no longer required.
- Keep unrestricted access off. Treat retrieved pages, issues, and dependency documentation as untrusted input.

## One-time GitHub settings

1. Change the repository default branch to `main` after confirming it points at the same base commit as the previous default branch.
2. Protect `main` and require the CI workflow before merge.
3. Enable auto-merge as an available PR action, but do not automatically merge every agent PR.
4. Enable Codex Code review for the repository. Enable Automatic reviews if every pull request should receive the same high-signal pass.
5. Keep GitHub Pages publishing from the existing deployment workflow; never develop directly on `gh-pages`.

## Operating workflow

- Start each independent task in its own Codex cloud chat and environment checkout.
- State the desired outcome, constraints, and acceptance criteria. Reference an issue or product document when one exists.
- Ask for parallel subagents when architecture exploration, test analysis, research, and review can run independently.
- Keep overlapping edits under one writer. Parallel writers should own disjoint files or modules.
- Require `npm run build` for code changes and `npm run test:e2e` for user-visible or PDF-processing changes.
- Publish a draft pull request with validation evidence and remaining risk.
- Request `@codex review` for a one-off review when automatic reviews are disabled.
- Merge only after required checks and review are complete and the task authorizes merging.

## Claude Code to Codex map

| Claude Code concept | Codex equivalent |
| --- | --- |
| `CLAUDE.md` repository guidance | Root and nested `AGENTS.md` files |
| Background remote task | Codex cloud chat in an isolated environment |
| Subagents | Codex subagent workflow with parent synthesis |
| Project commands and guardrails | `AGENTS.md` plus GitHub Actions |
| Permission mode | Cloud internet policy and local approval/sandbox settings |
| GitHub review bot | Codex Code review and `@codex review` |

## Human intervention boundary

Routine inspection, implementation, testing, commits, pushes, and draft pull requests should proceed autonomously. Stop and provide exact steps only for credentials, paid-service activation, legal or product policy, destructive repository operations, security-sensitive secret changes, or account settings that the available connector cannot change.
