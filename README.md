# Private Document Toolbox

A private, browser-based suite for everyday PDF, image, and office work. The project is expanding beyond PDF while keeping one non-negotiable promise: document bytes are processed on the user's device, not uploaded to an application server.

## Product status

The application currently ships 18 tools in English, Turkish, German, Spanish, and French:

- Organize PDFs: merge, split, reorder/delete pages, rotate
- Optimize PDFs: compress, batch process, compare versions
- Convert: PDF to images and images to PDF
- Images: presets, centered aspect-ratio crops, rotation, batch resize, compression, metadata stripping, and JPG/PNG/WebP conversion
- Office: images to Word (DOCX), with page size, orientation, margins, ordering, and cancellation
- Edit PDFs: sign and annotate, watermark, page numbers, metadata
- Security: permanent redaction, password protection, unlock

Images to Word embeds one normalized image per page. It does not claim to turn pixels into editable text. Generated DOCX packages contain sequential media names rather than source filenames, and conversion runs in a dedicated worker with file, byte, and pixel safety budgets.

The product roadmap and deliberate format boundaries live in [docs/PRODUCT_EXPANSION.md](docs/PRODUCT_EXPANSION.md). Business decisions remain in [docs/PRODUCT_STRATEGY.md](docs/PRODUCT_STRATEGY.md).

## Local development

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm run dev
```

Production and browser checks:

```bash
npm run build
npx playwright install chromium
npm run test:e2e
```

The production build writes crawlable HTML for every tool route plus `sitemap.xml` and `robots.txt`. Set `SITE_URL` for a custom domain; otherwise the repository's GitHub Pages URL is used.

## Architecture

- React 18, TypeScript, Vite, and Tailwind CSS
- PDF.js and `@cantoo/pdf-lib` for PDF rendering and editing
- Separate module workers for PDF, image, and Office operations
- `fflate` for constrained OOXML packaging without a heavyweight Office suite
- IndexedDB for optional on-device PDF recents
- GitHub Actions for locked builds, artifact-level browser tests, and quality-gated Pages deployment

## Privacy and safety model

No document bytes are sent to an application server. Files and passwords stay inside the browser context. Office media is re-encoded before packaging to remove embedded metadata. Recent PDF storage is local to the device and can be cleared by the user.

“No server upload quotas” does not mean browsers have infinite memory. Each operation has practical safety budgets and must fail clearly rather than crash a tab. Third-party analytics may receive only allowlisted product events—never filenames, metadata, contents, passwords, or exact file sizes.

## Contributing

Every new operation should run off the main UI thread, surface progress for long jobs, support cancellation where practical, include localized UI copy, and add an assertion against the generated artifact—not only the visible UI.

## License

No license has been selected yet. All rights are reserved until the repository owner chooses the long-term open-source/commercial licensing model.
