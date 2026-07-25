# PDF Toolbox — working notes

A privacy-first, client-side PDF tool suite (iLovePDF/Smallpdf alternative).
**Everything runs in the browser; no file ever leaves the device.** That is the
product's whole differentiator — protect it in every decision.

- Live: https://zsg8nmtk9m-cyber.github.io/pdfeditor/
- Branch: `claude/pdf-tools-web-app-yyx410` (this is the default branch)
- 16 tools, 5 languages, 47 e2e checks green in CI.

## Commands

```bash
npm run dev        # dev server
npm run build      # tsc --noEmit && vite build   ← also validates all 5 dictionaries
npm run test:e2e   # full Playwright suite against the production build
```

`npm run test:e2e` builds fixtures, serves `dist/`, drives real Chromium, and
verifies outputs by reopening them with pdf-lib/pdf.js in Node. In sandboxes
without a Playwright download, set `CHROMIUM_PATH=/path/to/chrome`.

CI (`.github/workflows/ci.yml`) runs build + suite on every push. Deploy
(`.github/workflows/deploy.yml`) publishes `dist/` to the `gh-pages` branch;
GitHub Pages serves it from there under the `/pdfeditor/` subpath.

## Architecture

All PDF work happens in **one Web Worker** so large files never freeze the tab.

```
src/
  worker/pdf.worker.ts  # the engine: maps an op name → a function in lib/
  worker/protocol.ts    # request/response/progress message types
  lib/api.ts            # typed worker client — THIS is what UI imports
  lib/ops.ts            # every PDF operation (pdf-lib), worker-side only
  lib/render.ts         # pdf.js rendering: thumbnails, page images (OffscreenCanvas)
  lib/types.ts          # shared option types — no runtime PDF deps, safe for UI
  lib/utils.ts          # page-range parsing, downloads, ZIP
  lib/fileStore.ts      # recent files (IndexedDB, local only)
  lib/handoff.ts        # in-memory file handoff between tools
  i18n/                 # en (canonical) + tr, de, es, fr
  tools.ts              # registry: id, path, icon, category, accepts, multi
  components/           # Dropzone, PageGrid, ResultPanel, FileSummary, ui kit
  pages/tools/          # one thin page per tool
tests/e2e.mjs           # the suite
```

**Never import `lib/ops.ts` or `pdf-lib` from UI code.** UI imports `lib/api.ts`
(functions) and `lib/types.ts` (types). Breaking this pulls ~1 MB of PDF
libraries into the main bundle; that is why the main chunk is ~100 KB gzipped.

### Adding a tool

1. `lib/ops.ts` — write the operation (pure, over `Uint8Array`).
2. `worker/pdf.worker.ts` — add one line to the `handlers` map.
3. `lib/api.ts` — add the typed wrapper.
4. `tools.ts` — add id + route + icon + `accepts`/`multi`.
5. `i18n/en.ts` — add `tools.<id>` copy and a `<id>` section, then the same in
   `tr/de/es/fr`. **`npm run build` fails if any language is missing a key** —
   the `Dict` type enforces it.
6. `pages/tools/<Name>.tsx` + a route in `App.tsx`.
7. Add an e2e check that verifies the **output**, not just the UI.
8. Update the tool count assertion in `tests/e2e.mjs` ("N tool cards").

## Hard-won details (do not regress these)

- **Coordinates.** Editors (Annotate, Redact) work in *display space* — the page
  as pdf.js renders it: rotation applied, origin top-left, y down, in points.
  `ops.ts` maps that to PDF space via `displayToPdf()`, which handles pages
  carrying `/Rotate 90/180/270`. Tests assert exact output coordinates; if you
  touch this, run them.
- **Redaction destroys content.** Pages with a redaction are rasterized and
  rebuilt so the original text is *gone*. Never "fix" this by drawing black
  boxes over text — the text would remain extractable, which is the classic
  redaction leak. Pages without redactions stay untouched and keep real text.
- **Unicode text.** The 14 standard PDF fonts only cover WinAnsi. `embedTextFont()`
  probes the string and falls back to a bundled, subsetted DejaVu Sans (loaded
  on demand). Turkish/Cyrillic/Greek watermarks would otherwise throw.
- **Worker must stay ES-format.** `vite.config.ts` sets `worker.format: "es"`
  because the worker code-splits (fontkit loads lazily). The default `iife`
  breaks the build.
- **Sticky header intercepts clicks.** Don't write tests that click a fixed
  offset inside a scrolled element; prefer keyboard or role-based actions.
  Annotate commits edits on Escape for exactly this reason.
- **contentEditable + React.** The annotate text box commits through a ref on
  `onInput` and remounts per edit session. Reconciling browser-mutated DOM
  silently loses typed text.

## Testing philosophy

Assert on **artifacts, not appearances**. Existing examples worth copying:
extract text from the output with pdf.js and check its coordinates; assert
redacted strings are absent from the file; read page rotation arrays. A test
that only checks a button turned green proves very little.

Watch for flakiness: run the suite twice before trusting a fix. Text-based
locators can collide with the recents strip; prefer `data-tool` / `data-testid`
hooks or DOM-state waits (`waitForFunction`) over ambiguous text.

## Roadmap (not started)

1. **OCR** — tesseract.js in the worker to make scans searchable. Big WASM
   payload; load it lazily, keep it out of the main worker chunk. Best
   expression of the privacy story since OCR normally requires uploads.
2. **PDF → Word/Office** — the one thing that is genuinely hard client-side.
   Don't ship a bad fake; this is the natural first *paid*, server-side feature.
3. **PWA / offline install** — the logical endpoint of "never leaves your device".
4. **SEO** — deep links currently 404 (GitHub Pages serves `404.html` as the SPA
   fallback), so tool pages can't rank. Prerender one real HTML file per tool
   with its own title/meta, or move to a host with SPA rewrites (Cloudflare
   Pages also allows a private repo).
5. Form filling (pdf-lib has AcroForm support), crop, dark mode, mobile touch
   drag for Organize/Annotate, undo in editors.

## Product notes

The free tier costs nothing to serve (static files), so the honest business
model is: local tools free forever; charge for what genuinely needs a server
(Office conversion, bulk OCR, an API, team features). Avoid ads — they'd poison
the privacy positioning that makes this worth using.

The repo is public (GitHub Pages requires it on the free plan). Decide
open-core vs. private hosting before the code gets more valuable.
