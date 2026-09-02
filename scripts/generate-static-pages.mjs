import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const siteRoot = (process.env.SITE_URL || "https://zsg8nmtk9m-cyber.github.io/pdfeditor").replace(
  /\/$/,
  "",
);

const pages = [
  ["safe-to-share", "Safe to Share", "Inspect a PDF for hidden release risks, create a flattened clean copy, and verify the result without uploading the document."],
  ["merge", "Merge PDF", "Combine multiple PDF files into one document in the order you choose."],
  ["split", "Split PDF", "Extract selected pages, split page ranges, or export every page as a separate PDF."],
  ["organize", "Organize PDF", "Reorder, rotate, or remove PDF pages with a visual page grid."],
  ["rotate", "Rotate PDF", "Rotate every page or a selected range by 90, 180, or 270 degrees."],
  ["compress", "Compress PDF", "Reduce the size of scans and image-heavy PDFs directly in your browser."],
  ["batch", "Batch Process PDFs", "Apply the same private PDF operation to multiple files and download one ZIP."],
  ["compare", "Compare PDFs", "Find visually changed pages between two PDF versions without uploading either file."],
  ["pdf-to-images", "PDF to Images", "Export PDF pages as high-quality PNG or JPG images."],
  ["images-to-pdf", "Images to PDF", "Turn one or more images into a PDF with the page size you choose."],
  ["image-workbench", "Image Workbench", "Batch resize, compress, and convert JPG, PNG, or WebP images without uploading them."],
  ["images-to-docx", "Images to Word", "Place JPG, PNG, or WebP images into a private Word document with one image per page."],
  ["annotate", "Sign and Annotate PDF", "Add text, drawings, and signatures to a PDF locally in your browser."],
  ["watermark", "Watermark PDF", "Add a configurable text watermark to every PDF page."],
  ["page-numbers", "Add PDF Page Numbers", "Number PDF pages automatically with flexible positions and formats."],
  ["metadata", "Edit PDF Metadata", "View and update PDF title, author, subject, and keyword metadata privately."],
  ["redact", "Redact PDF", "Permanently remove sensitive content instead of merely covering it."],
  ["protect", "Protect PDF", "Encrypt a PDF with a password without sending it to a server."],
  ["unlock", "Unlock PDF", "Remove a known PDF password locally and save an unlocked copy."],
].map(([slug, title, description]) => ({ slug, title, description }));

const escapeHtml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function replaceMeta(html, attribute, key, content) {
  const pattern = new RegExp(`<meta\\s+[^>]*${attribute}=["']${key}["'][^>]*>`, "i");
  return html.replace(pattern, `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`);
}

function renderPage(template, page) {
  const title = `${page.title} — Private, Free, In Your Browser | Private Document Toolbox`;
  const url = `${siteRoot}/${page.slug}/`;
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = replaceMeta(html, "name", "description", page.description);
  html = replaceMeta(html, "property", "og:title", title);
  html = replaceMeta(html, "property", "og:description", page.description);
  html = html.replace(
    "</head>",
    `    <link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />\n  </head>`,
  );
  const fallback = `<main style="max-width:48rem;margin:4rem auto;padding:0 1rem;font-family:system-ui,sans-serif"><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.description)}</p><p>Files are processed on your device and never uploaded. No account, server upload, or server-side copy.</p><p><a href="./">Open ${escapeHtml(page.title)}</a></p></main>`;
  return html.replace('<div id="root"></div>', `<div id="root">${fallback}</div>`);
}

const template = await readFile(join(dist, "index.html"), "utf8");
const homeUrl = `${siteRoot}/`;
let home = template.replace(
  "</head>",
  `    <link rel="canonical" href="${homeUrl}" />\n    <meta property="og:url" content="${homeUrl}" />\n  </head>`,
);
await writeFile(join(dist, "index.html"), home);

for (const page of pages) {
  const output = join(dist, page.slug, "index.html");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, renderPage(template, page));
}

const urls = [homeUrl, ...pages.map((page) => `${siteRoot}/${page.slug}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`)
  .join("\n")}\n</urlset>\n`;
await writeFile(join(dist, "sitemap.xml"), sitemap);
await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${siteRoot}/sitemap.xml\n`);

console.log(`generated ${pages.length} static tool pages and sitemap.xml`);
