# PDF Toolbox

Every PDF tool you need, right in your browser — a free, privacy-first
alternative to iLovePDF / Smallpdf.

**All processing happens client-side.** Files are opened with JavaScript in the
user's browser and are never uploaded anywhere. That means no servers to run,
no file-size limits to enforce, and nothing sensitive ever leaves the device.

## Tools

| Category | Tools |
| -------- | ----- |
| Organize | Merge · Split (ranges / extract / every page) · Organize (drag-reorder, rotate, delete pages) · Rotate |
| Optimize | Compress (3 presets, re-renders pages as JPEG) |
| Convert  | PDF → PNG/JPG images · JPG/PNG/WebP/GIF/BMP images → PDF |
| Edit     | Text watermark · Page numbers · Metadata editor |
| Security | Protect (AES password encryption) · Unlock (remove a known password) |

Multiple output files (split parts, page images) can be downloaded
individually or as a single ZIP.

## Stack

- [Vite](https://vitejs.dev) + [React](https://react.dev) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) for styling
- [`@cantoo/pdf-lib`](https://github.com/cantoo-scribe/pdf-lib) (installed under
  the `pdf-lib` alias) — PDF creation/manipulation, plus the AES
  encryption/decryption support the original pdf-lib lacks
- [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) — page rendering for
  thumbnails, PDF→image conversion and compression
- [`fflate`](https://github.com/101arrowz/fflate) — ZIP downloads
- [`lucide-react`](https://lucide.dev) — icons

### Code layout

```
src/
  lib/ops.ts        # every PDF operation (pure functions over Uint8Array)
  lib/render.ts     # pdf.js helpers: thumbnails, page rasterization
  lib/utils.ts      # page-range parsing, downloads, ZIP packaging
  tools.ts          # tool registry (name, route, icon, category) drives home page
  hooks/            # shared single-PDF upload state machine
  components/       # Dropzone, FileList, ResultPanel, ToolPage chrome, UI kit
  pages/tools/      # one thin page component per tool
```

Adding a tool = one entry in `tools.ts`, one operation in `lib/ops.ts`, one
page in `pages/tools/`, one route in `App.tsx`.

## Development

```bash
npm install
npm run dev        # start dev server
npm run build      # typecheck + production build (static site in dist/)
npm run preview    # serve the production build
```

The build output in `dist/` is a fully static site — deploy it to any static
host (Netlify, Vercel, GitHub Pages, S3…). The only requirement is that the
host rewrites unknown paths to `index.html` (SPA fallback), since routing is
client-side.

## Notes & known trade-offs

- **Compress** re-renders pages to JPEG for maximum size reduction, so text in
  the output is no longer selectable. This is called out in the UI.
- **Protect/Unlock** rely on `@cantoo/pdf-lib`'s encryption support; unlocking
  requires knowing the current password (this is not a password cracker).
- Password-protected inputs to other tools are detected and the user is
  pointed to the Unlock tool first.
