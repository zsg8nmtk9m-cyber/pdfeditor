# PDF Toolbox

A private, browser-based suite for everyday PDF work. Merge, split, organize, compress, convert, annotate, compare, redact, encrypt, and unlock PDFs without uploading files to a server.

All document processing happens in a Web Worker on the user's device. There are no accounts, file-size quotas, or server-side copies of sensitive documents.

## Product status

PDF Toolbox currently ships 16 tools in English, Turkish, German, Spanish, and French. The application includes persistent on-device recent files, cross-tool handoff, drag-and-drop entry points, background processing, and an end-to-end suite that verifies generated PDFs rather than only checking the UI.

The product direction, business model, milestones, and decision log live in [docs/PRODUCT_STRATEGY.md](docs/PRODUCT_STRATEGY.md).

## Tools

- Organize: merge, split, reorder/delete pages, rotate
- Optimize: compress, batch process, compare versions
- Convert: PDF to images, images to PDF
- Edit: sign and annotate, watermark, page numbers, metadata
- Security: permanent redaction, password protection, unlock

## Local development

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm run dev
```

Production and type checks:

```bash
npm run build
```

The production build also writes crawlable HTML for every tool route plus
`sitemap.xml` and `robots.txt`. Set `SITE_URL` to the deployment root when
building for a custom domain; it defaults to the repository's GitHub Pages URL.

The full browser suite creates its own fixtures, starts the production preview, exercises every tool in Chromium, downloads the results, and reopens them with `pdf-lib` or PDF.js:

```bash
npx playwright install chromium
npm run test:e2e
```

Pull requests and launch branches run the same locked install, production
build, and browser suite in GitHub Actions. The suite also covers keyboard
tool discovery, route metadata, mobile overflow, and semantic landmarks.

## Architecture

- React 18, TypeScript, Vite, and Tailwind CSS
- PDF.js for rendering and text inspection
- `@cantoo/pdf-lib` for PDF editing and encryption
- A module Web Worker for CPU-heavy document operations
- IndexedDB for optional on-device recent files
- GitHub Actions for build/e2e verification and GitHub Pages deployment

## Privacy model

No PDF bytes are sent to an application server. Files and passwords stay inside the browser context. Recent-file storage is local to the device and can be cleared by the user. Third-party analytics must remain cookieless and receive product events only—never filenames, document metadata, contents, or passwords.

The vendor-neutral event allowlist and integration checklist live in
[docs/ANALYTICS.md](docs/ANALYTICS.md). The application emits these events
locally but sends no analytics traffic until an owner configures a provider.

## Contributing

Open an issue before large changes so product intent and privacy constraints stay aligned. Every new document operation should run in the worker, surface progress for long jobs, include localized UI copy, and add an end-to-end assertion against the resulting file.

## License

No license has been selected yet. All rights are reserved until the repository owner chooses the long-term open-source/commercial licensing model.
