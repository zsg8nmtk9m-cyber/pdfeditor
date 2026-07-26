/**
 * Post-build SEO prerender. GitHub Pages has no SPA rewrites, so deep links
 * only work through the 404.html fallback — which search engines treat as a
 * soft 404 and never index. This script writes a real dist/<slug>/index.html
 * for every tool (same SPA shell, but with that tool's own title, meta
 * description, canonical and Open Graph tags), plus sitemap.xml and
 * robots.txt, so each tool page is a first-class, rankable URL.
 *
 * Runs as part of `npm run build`. Env: SITE_URL (origin, defaults to the
 * production GitHub Pages origin) and BASE_PATH (same value vite build got).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const ORIGIN = (process.env.SITE_URL ?? "https://zsg8nmtk9m-cyber.github.io").replace(/\/$/, "");
const BASE = process.env.BASE_PATH ?? "/";
const urlOf = (slug) => `${ORIGIN}${BASE}${slug ? `${slug}/` : ""}`;

/**
 * SEO copy per tool page. Deliberately separate from the UI dictionaries:
 * meta titles/descriptions are written for search intent ("free", "online",
 * "no upload"), not for the in-app UI. The slug list is validated against
 * src/tools.ts below, so adding a tool without meta here fails the build.
 */
const HOME = {
  title: "PDF Toolbox — Free Online PDF Tools, 100% Private",
  description:
    "Merge, split, compress, convert, fill, sign and protect PDFs — free and unlimited. All processing happens in your browser; files never leave your device.",
};

const TOOL_META = {
  merge: {
    title: "Merge PDF Files Free — No Upload | PDF Toolbox",
    description:
      "Combine multiple PDFs into one file directly in your browser. Free, unlimited and 100% private — your documents never leave your device.",
  },
  split: {
    title: "Split PDF — Extract Pages Free | PDF Toolbox",
    description:
      "Split a PDF by page ranges, extract selected pages, or save every page as its own file. Runs entirely in your browser — nothing is uploaded.",
  },
  organize: {
    title: "Organize PDF Pages — Reorder, Rotate, Delete | PDF Toolbox",
    description:
      "Drag and drop to reorder PDF pages, rotate or delete them with live thumbnails. Free and private — files are processed on your device.",
  },
  rotate: {
    title: "Rotate PDF Pages Free | PDF Toolbox",
    description:
      "Rotate all pages or a selection by 90°, 180° or 270° and download instantly. Free, no signup, and your PDF never leaves your browser.",
  },
  compress: {
    title: "Compress PDF Free — Reduce File Size | PDF Toolbox",
    description:
      "Shrink PDF file size right in your browser — ideal for scans and image-heavy documents. Free, unlimited and 100% private, with no uploads.",
  },
  batch: {
    title: "Batch Process PDFs — Compress, Rotate, Watermark | PDF Toolbox",
    description:
      "Apply the same operation to many PDFs at once and download the results as a ZIP. Everything runs locally in your browser — no uploads.",
  },
  compare: {
    title: "Compare Two PDFs — Find Differences | PDF Toolbox",
    description:
      "Diff two PDF versions page by page with every visual change highlighted. Great for contracts and drafts. Private — files stay on your device.",
  },
  "pdf-to-images": {
    title: "Convert PDF to Images — PNG or JPG | PDF Toolbox",
    description:
      "Export every PDF page as a high-quality PNG or JPG image, free and in your browser. No uploads, no watermarks, no limits.",
  },
  "images-to-pdf": {
    title: "Convert Images to PDF — JPG, PNG, WebP | PDF Toolbox",
    description:
      "Turn photos and scans into a single PDF. Choose page size, reorder images, convert — all locally in your browser, nothing uploaded.",
  },
  annotate: {
    title: "Sign PDF Online Free — Draw or Type Signature | PDF Toolbox",
    description:
      "Draw or type your signature, place it on any page and add text notes. Flattened into the PDF, processed entirely on your device.",
  },
  "fill-forms": {
    title: "Fill PDF Forms Online Free — No Upload | PDF Toolbox",
    description:
      "Fill out PDF form fields in your browser and download the completed document, optionally flattened. Free and 100% private — no uploads.",
  },
  crop: {
    title: "Crop PDF Online Free — Trim Margins | PDF Toolbox",
    description:
      "Trim margins or crop any area of a PDF — on every page or just one — right in your browser. Free and private: files never leave your device.",
  },
  watermark: {
    title: "Add Watermark to PDF Free | PDF Toolbox",
    description:
      "Stamp text like CONFIDENTIAL or DRAFT across every page with custom color, size and opacity. Free and private — no file uploads.",
  },
  "page-numbers": {
    title: "Add Page Numbers to PDF Free | PDF Toolbox",
    description:
      "Insert page numbers in any corner or centered, with custom format and starting number. Processed locally — your PDF never leaves your device.",
  },
  metadata: {
    title: "Edit PDF Metadata — Title, Author & More | PDF Toolbox",
    description:
      "View and change a PDF's title, author, subject, keywords and other properties right in your browser. Free, fast and completely private.",
  },
  redact: {
    title: "Redact PDF — Permanently Remove Content | PDF Toolbox",
    description:
      "Black out sensitive content so it is truly destroyed, not just covered. Redaction runs locally in your browser — nothing is ever uploaded.",
  },
  protect: {
    title: "Password Protect PDF — AES Encryption | PDF Toolbox",
    description:
      "Encrypt a PDF with a password using AES, entirely in your browser. The file and password never leave your device.",
  },
  unlock: {
    title: "Unlock PDF — Remove Password Free | PDF Toolbox",
    description:
      "Remove password protection from a PDF you own. Decryption happens locally in your browser — the file and password are never sent anywhere.",
  },
};

// Keep TOOL_META in lockstep with the registry: every path in src/tools.ts
// must have meta here, and vice versa.
const registry = readFileSync(join(root, "src", "tools.ts"), "utf8");
const registrySlugs = [...registry.matchAll(/path:\s*"\/([a-z0-9-]+)"/g)].map((m) => m[1]);
const metaSlugs = Object.keys(TOOL_META);
const missing = registrySlugs.filter((s) => !metaSlugs.includes(s));
const stale = metaSlugs.filter((s) => !registrySlugs.includes(s));
if (missing.length || stale.length) {
  throw new Error(
    `prerender: TOOL_META out of sync with src/tools.ts` +
      (missing.length ? ` — missing: ${missing.join(", ")}` : "") +
      (stale.length ? ` — stale: ${stale.join(", ")}` : ""),
  );
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const template = readFileSync(join(dist, "index.html"), "utf8");

/** The SPA shell with page-specific head tags swapped in. */
function pageHtml({ title, description }, url, extraHead = "") {
  const head =
    `<link rel="canonical" href="${url}" />\n` +
    `    <meta property="og:type" content="website" />\n` +
    `    <meta property="og:site_name" content="PDF Toolbox" />\n` +
    `    <meta property="og:title" content="${esc(title)}" />\n` +
    `    <meta property="og:description" content="${esc(description)}" />\n` +
    `    <meta property="og:url" content="${url}" />\n` +
    `    <meta name="twitter:card" content="summary" />\n` +
    extraHead;
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${esc(description)}" />`,
    )
    .replace("</head>", `    ${head}\n  </head>`);
}

// Home: enrich the built index.html in place (canonical + OG + app schema).
const jsonLd = `<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PDF Toolbox",
  url: urlOf(""),
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: HOME.description,
})}</script>\n`;
writeFileSync(join(dist, "index.html"), pageHtml(HOME, urlOf(""), jsonLd));

// One real HTML file per tool, so /merge/ etc. are directly servable URLs.
for (const slug of registrySlugs) {
  mkdirSync(join(dist, slug), { recursive: true });
  writeFileSync(join(dist, slug, "index.html"), pageHtml(TOOL_META[slug], urlOf(slug)));
}

const urls = ["", ...registrySlugs];
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((slug) => `  <url><loc>${urlOf(slug)}</loc></url>`).join("\n") +
    `\n</urlset>\n`,
);

writeFileSync(
  join(dist, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}${BASE}sitemap.xml\n`,
);

console.log(`prerendered ${registrySlugs.length} tool pages + sitemap under ${dist}`);
