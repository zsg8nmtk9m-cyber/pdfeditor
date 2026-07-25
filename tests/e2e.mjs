/**
 * End-to-end suite for PDF Toolbox, run against a served production build
 * (see tests/run.mjs). Exercises every tool in a real Chromium and verifies
 * outputs by re-opening them with pdf-lib / pdf.js in Node.
 *
 * Env: BASE_URL (default http://localhost:4173),
 *      CHROMIUM_PATH (optional executable override for sandboxed hosts).
 */
import { chromium } from "playwright";
import { PDFDocument, PDFName } from "pdf-lib";
import { getDocument as pdfjsGetDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, "fixtures");
const OUT = join(here, ".artifacts");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL ?? "http://localhost:4173";

let failures = 0;
function check(name, cond) {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.log(`FAIL  ${name}`);
  }
}
const near = (a, b, tol = 2.5) => Math.abs(a - b) <= tol;

async function pageCount(path, password) {
  const doc = await PDFDocument.load(readFileSync(path), { password });
  return doc.getPageCount();
}

async function pageRotations(path) {
  const doc = await PDFDocument.load(readFileSync(path));
  return doc.getPages().map((p) => p.getRotation().angle);
}

async function firstPageText(path) {
  const doc = await pdfjsGetDocument({ data: new Uint8Array(readFileSync(path)) }).promise;
  const content = await (await doc.getPage(1)).getTextContent();
  await doc.destroy();
  return content.items;
}

async function grabDownload(page, buttonLocator, saveAs) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    buttonLocator.click(),
  ]);
  const path = join(OUT, saveAs);
  await download.saveAs(path);
  return path;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

// ---------- home ----------
console.log("home");
await page.goto(BASE);
check("hero renders", await page.getByRole("heading", { level: 1 }).isVisible());
check("14 tool cards", (await page.locator("a[href^='/']:has(h3)").count()) === 14);

// ---------- merge ----------
console.log("merge");
await page.goto(BASE + "/merge");
await page.locator("input[type=file]").setInputFiles([join(FIX, "a.pdf"), join(FIX, "b.pdf")]);
await page.getByText("3 pages ·").waitFor({ timeout: 20000 });
check("merge cards show page counts", await page.getByText("2 pages ·").isVisible());
check(
  "merge cards show thumbnails",
  (await page.locator("img[alt^='First page of']").count()) === 2,
);
await page.getByRole("button", { name: /Merge 2 PDFs/ }).click();
await page.getByText("Done!").waitFor({ timeout: 20000 });
let out = await grabDownload(page, page.getByRole("button", { name: /^Download$/ }).last(), "merged.pdf");
check("merged has 5 pages", (await pageCount(out)) === 5);

// ---------- cross-tool handoff (merge result -> compress) ----------
console.log("handoff");
await page.getByLabel("Continue in another tool").selectOption({ label: "Compress PDF" });
await page.waitForURL("**/compress");
await page.getByText("merged.pdf").waitFor({ timeout: 20000 });
check("handed-off file loads in Compress", await page.getByText("5 pages ·").isVisible());

// ---------- recent files picker ----------
console.log("recents");
await page.goto(BASE + "/split");
const recentChip = page.getByRole("button", { name: /merged\.pdf/ });
await recentChip.waitFor({ timeout: 20000 });
check("recents strip offers merged.pdf", true);
await recentChip.click();
await page.getByText(/5 pages/).waitFor({ timeout: 20000 });
check("clicking a recent file loads it", true);

// ---------- drag-and-drop a file onto a home tool card ----------
console.log("drag-and-drop");
await page.goto(BASE + "/");
{
  // Synthesize a file drop: build a DataTransfer in the page from the
  // fixture's bytes and dispatch dragover+drop on the Compress card.
  const bytes = Array.from(new Uint8Array(readFileSync(join(FIX, "big.pdf"))));
  await page.evaluate((data) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(data)], "dropped.pdf", { type: "application/pdf" }));
    const card = document.querySelector('[data-tool="compress"]');
    card.dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, bubbles: true }));
    card.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true }));
  }, bytes);
  await page.waitForURL("**/compress");
  await page.getByText("dropped.pdf").waitFor({ timeout: 20000 });
  check("dropping a PDF on a card opens that tool with the file", true);
  check("dropped file is loaded and probed", await page.getByText("5 pages ·").isVisible());
}

// ---------- dropping multiple files on a multi-file tool ----------
console.log("drag-and-drop (multi-file)");
await page.goto(BASE + "/");
{
  const a = Array.from(new Uint8Array(readFileSync(join(FIX, "a.pdf"))));
  const b = Array.from(new Uint8Array(readFileSync(join(FIX, "b.pdf"))));
  await page.evaluate(([d1, d2]) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(d1)], "one.pdf", { type: "application/pdf" }));
    dt.items.add(new File([new Uint8Array(d2)], "two.pdf", { type: "application/pdf" }));
    const card = document.querySelector('[data-tool="merge"]');
    card.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true }));
  }, [a, b]);
  await page.waitForURL("**/merge");
  // Files are added one at a time (each waits on its preview), so wait for
  // the second rather than asserting on it immediately.
  await page.getByText("one.pdf").waitFor({ timeout: 20000 });
  await page.getByText("two.pdf").waitFor({ timeout: 20000 });
  check("dropping two PDFs on Merge loads both", true);
}

// ---------- split by ranges ----------
console.log("split");
await page.goto(BASE + "/split");
await page.locator("input[type=file]").setInputFiles(join(FIX, "big.pdf"));
await page.getByText(/5 pages/).waitFor();
await page.getByPlaceholder(/e\.g\. 1-3/).fill("1-2, 4-5");
await page.getByRole("button", { name: "Split PDF" }).click();
await page.getByText("Done!").waitFor({ timeout: 20000 });
check("two output files listed", (await page.locator("li:has-text('.pdf')").count()) === 2);
out = await grabDownload(
  page,
  page.locator("li", { hasText: "pages-1-2" }).getByRole("button", { name: "Download" }),
  "split-1-2.pdf",
);
check("split part has 2 pages", (await pageCount(out)) === 2);

// ---------- split: extract pages by clicking thumbnails ----------
console.log("split-extract (visual picker)");
await page.goto(BASE + "/split");
await page.locator("input[type=file]").setInputFiles(join(FIX, "big.pdf"));
await page.getByText(/5 pages/).waitFor();
await page.getByRole("button", { name: "Extract pages", exact: false }).click();
await page.getByRole("button", { name: "Page 1", exact: true }).waitFor({ timeout: 30000 });
await page.getByRole("button", { name: "Page 1", exact: true }).click();
await page.getByRole("button", { name: "Page 3", exact: true }).click();
check(
  "clicking thumbnails syncs the text field",
  (await page.getByPlaceholder("e.g. 1, 3-5").inputValue()) === "1, 3",
);
await page.getByRole("button", { name: "Split PDF" }).click();
await page.getByText("Done!").waitFor({ timeout: 20000 });
out = await grabDownload(page, page.getByRole("button", { name: /^Download$/ }).last(), "extracted.pdf");
check("extracted PDF has the 2 clicked pages", (await pageCount(out)) === 2);

// ---------- rotate: specific pages via thumbnail clicks ----------
console.log("rotate (visual picker)");
await page.goto(BASE + "/rotate");
await page.locator("input[type=file]").setInputFiles(join(FIX, "big.pdf"));
await page.getByText(/5 pages/).waitFor();
await page.getByRole("radio").nth(1).check(); // "Specific pages"
await page.getByRole("button", { name: "Page 2", exact: true }).waitFor({ timeout: 30000 });
await page.getByRole("button", { name: "Page 2", exact: true }).click();
await page.getByRole("button", { name: "Rotate PDF" }).click();
await page.getByText("Done!").waitFor({ timeout: 20000 });
out = await grabDownload(page, page.getByRole("button", { name: /^Download$/ }).last(), "rotated-p2.pdf");
{
  const rot = await pageRotations(out);
  check(
    "only clicked page rotated 90°",
    rot[1] === 90 && rot[0] === 0 && rot[2] === 0 && rot.length === 5,
  );
}

// ---------- compress ----------
console.log("compress");
await page.goto(BASE + "/compress");
await page.locator("input[type=file]").setInputFiles(join(FIX, "big.pdf"));
await page.locator("img[alt='First page']").waitFor({ timeout: 20000 });
check("compress shows first-page preview", true);
await page.getByRole("button", { name: "Compress PDF" }).click();
await page.getByText("Done!").waitFor({ timeout: 60000 });
out = await grabDownload(page, page.getByRole("button", { name: /^Download$/ }).last(), "compressed.pdf");
check("compressed keeps 5 pages", (await pageCount(out)) === 5);

// ---------- batch (compress two files -> ZIP) ----------
console.log("batch");
await page.goto(BASE + "/batch");
await page.locator("input[type=file]").setInputFiles([join(FIX, "a.pdf"), join(FIX, "b.pdf")]);
await page.getByRole("button", { name: "Process 2 files" }).click();
await page.getByText("Done!").waitFor({ timeout: 60000 });
check("batch produced 2 output files", (await page.locator("li:has-text('.pdf')").count()) === 2);
out = await grabDownload(page, page.getByRole("button", { name: /Download all/ }), "batch.zip");
check("batch zip non-empty", readFileSync(out).length > 1000);

// ---------- batch rotate applies to every page of every file ----------
console.log("batch (rotate)");
await page.goto(BASE + "/batch");
await page.locator("input[type=file]").setInputFiles(join(FIX, "a.pdf"));
await page.getByRole("button", { name: "Rotate", exact: true }).click();
await page.getByRole("button", { name: "Process 1 file" }).click();
await page.getByText("Done!").waitFor({ timeout: 30000 });
out = await grabDownload(page, page.getByRole("button", { name: /^Download$/ }).last(), "batch-rotated.pdf");
{
  const rot = await pageRotations(out);
  check("batch rotate turned all 3 pages 90°", rot.length === 3 && rot.every((r) => r === 90));
}

// ---------- protect ----------
console.log("protect");
await page.goto(BASE + "/protect");
await page.locator("input[type=file]").setInputFiles(join(FIX, "a.pdf"));
const pw = page.locator("input[type=password]");
await pw.nth(0).fill("secret123");
await pw.nth(1).fill("secret123");
await page.getByRole("button", { name: "Protect PDF" }).click();
await page.getByText("Done!").waitFor({ timeout: 20000 });
const protectedPath = await grabDownload(
  page,
  page.getByRole("button", { name: /^Download$/ }).last(),
  "protected.pdf",
);
let lockedWithoutPw = false;
try {
  await PDFDocument.load(readFileSync(protectedPath));
} catch {
  lockedWithoutPw = true;
}
check("protected file rejects load without password", lockedWithoutPw);
check("protected file opens with password", (await pageCount(protectedPath, "secret123")) === 3);

// ---------- unlock ----------
console.log("unlock");
await page.goto(BASE + "/unlock");
await page.locator("input[type=file]").setInputFiles(protectedPath);
await page.locator("input[type=password]").fill("secret123");
await page.getByRole("button", { name: "Unlock PDF" }).click();
await page.getByText("Done!").waitFor({ timeout: 20000 });
out = await grabDownload(page, page.getByRole("button", { name: /^Download$/ }).last(), "unlocked.pdf");
check("unlocked opens without password", (await pageCount(out)) === 3);

// ---------- pdf -> images ----------
console.log("pdf-to-images");
await page.goto(BASE + "/pdf-to-images");
await page.locator("input[type=file]").setInputFiles(join(FIX, "b.pdf"));
await page.getByRole("button", { name: "Convert to images" }).click();
await page.getByText("Done!").waitFor({ timeout: 30000 });
out = await grabDownload(page, page.getByRole("button", { name: /Download all/ }), "images.zip");
check("images zip non-empty", readFileSync(out).length > 1000);

// ---------- images -> pdf ----------
console.log("images-to-pdf");
out = await grabDownload(
  page,
  page.locator("li", { hasText: "page-1" }).getByRole("button", { name: "Download" }),
  "page1.png",
);
await page.goto(BASE + "/images-to-pdf");
await page.locator("input[type=file]").setInputFiles(out);
await page.getByRole("button", { name: /Create PDF from 1 image/ }).click();
await page.getByText("Done!").waitFor({ timeout: 20000 });
out = await grabDownload(page, page.getByRole("button", { name: /^Download$/ }).last(), "from-images.pdf");
check("images->pdf has 1 page", (await pageCount(out)) === 1);

// ---------- watermark with non-WinAnsi (Turkish) text ----------
console.log("watermark (Unicode)");
await page.goto(BASE + "/watermark");
await page.locator("input[type=file]").setInputFiles(join(FIX, "a.pdf"));
await page.getByPlaceholder("e.g. CONFIDENTIAL").fill("Onaylandı — ĞÜŞİÖÇ");
await page.getByRole("button", { name: "Add watermark" }).click();
await page.getByText("Done!").waitFor({ timeout: 30000 });
out = await grabDownload(page, page.getByRole("button", { name: /^Download$/ }).last(), "watermarked.pdf");
check("watermarked keeps 3 pages", (await pageCount(out)) === 3);
{
  const items = await firstPageText(out);
  check(
    "Turkish watermark text embedded and extractable",
    items.some((it) => it.str.includes("Onaylandı")),
  );
}

// ---------- sign & annotate ----------
console.log("annotate");
await page.goto(BASE + "/annotate");
await page.locator("input[type=file]").setInputFiles(join(FIX, "a.pdf"));
await page.locator("img[alt='Page 1']").waitFor({ timeout: 30000 });
await page.getByRole("button", { name: "Add text" }).click();
await page.waitForTimeout(300);
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.type("APPROVED BY QA");
// Escape commits the edit — layout-independent, unlike clicking the page
// (whose corner can sit under the sticky header after scroll-into-view).
await page.keyboard.press("Escape");
check(
  "text element shows typed content",
  (await page.locator("[data-annot='text']").textContent()) === "APPROVED BY QA",
);
await page.getByRole("button", { name: "Add signature" }).click();
const sigCanvas = page.getByTestId("signature-canvas");
const box = await sigCanvas.boundingBox();
await page.mouse.move(box.x + 60, box.y + 90);
await page.mouse.down();
await page.mouse.move(box.x + 200, box.y + 60, { steps: 10 });
await page.mouse.move(box.x + 380, box.y + 110, { steps: 10 });
await page.mouse.up();
await page.getByRole("button", { name: "Use signature" }).click();
check("signature element placed", await page.locator("img[alt='Signature']").isVisible());
await page.getByRole("button", { name: "Apply & download" }).click();
await page.getByText("Done!").waitFor({ timeout: 30000 });
out = await grabDownload(page, page.getByRole("button", { name: /^Download$/ }).last(), "signed.pdf");
check("signed PDF keeps 3 pages", (await pageCount(out)) === 3);
{
  const items = await firstPageText(out);
  const hit = items.find((it) => it.str.includes("APPROVED BY QA"));
  const expX = 595 / 2 - 40;
  const expY = 842 - (842 / 2 - 10 + 16 * 0.9);
  check(
    "annotated text lands at the expected PDF coordinates",
    !!hit && near(hit.transform[4], expX) && near(hit.transform[5], expY),
  );
  const doc = await PDFDocument.load(readFileSync(out));
  const hasImage = doc.getPage(0).node.Resources()?.has(PDFName.of("XObject")) ?? false;
  check("signature image embedded on page 1", hasImage);
}

// ---------- annotate on a rotated page ----------
console.log("annotate (rotated page)");
await page.goto(BASE + "/annotate");
await page.locator("input[type=file]").setInputFiles(join(FIX, "rotated.pdf"));
await page.locator("img[alt='Page 1']").waitFor({ timeout: 30000 });
await page.getByRole("button", { name: "Add text" }).click();
await page.waitForTimeout(300);
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.type("ROTATED OK");
// Escape commits the edit — layout-independent, unlike clicking the page
// (whose corner can sit under the sticky header after scroll-into-view).
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Apply & download" }).click();
await page.getByText("Done!").waitFor({ timeout: 30000 });
out = await grabDownload(page, page.getByRole("button", { name: /^Download$/ }).last(), "signed-rotated.pdf");
{
  const items = await firstPageText(out);
  const hit = items.find((it) => it.str.includes("ROTATED OK"));
  const u = 842 / 2 - 40;
  const b = 595 / 2 - 10 + 16 * 0.9;
  check(
    "rotated-page text lands at the expected PDF coordinates",
    !!hit && near(hit.transform[4], b) && near(hit.transform[5], u),
  );
}

// ---------- organize (reorder via buttons + delete) ----------
console.log("organize");
await page.goto(BASE + "/organize");
await page.locator("input[type=file]").setInputFiles(join(FIX, "a.pdf"));
await page.getByText(/3 pages/).waitFor({ timeout: 30000 });
await page.getByRole("button", { name: "Delete page 2" }).click();
await page.getByRole("button", { name: "Apply changes" }).click();
await page.getByText("Done!").waitFor({ timeout: 20000 });
out = await grabDownload(page, page.getByRole("button", { name: /^Download$/ }).last(), "organized.pdf");
check("organize deleted a page", (await pageCount(out)) === 2);

// ---------- i18n (run last: switches the UI language) ----------
console.log("i18n");
await page.goto(BASE + "/");
await page.getByLabel("Language").selectOption("tr");
check(
  "hero switches to Turkish",
  await page.getByText("doğrudan tarayıcınızda").isVisible(),
);
check("tool cards translate", await page.getByText("PDF Birleştir").isVisible());
await page.goto(BASE + "/merge");
check(
  "tool pages translate after reload (persisted)",
  await page.getByText("Dosya seçin veya buraya sürükleyin").isVisible(),
);
check(
  "html lang attribute updates",
  (await page.evaluate(() => document.documentElement.lang)) === "tr",
);
await page.goto(BASE + "/");
await page.getByLabel("Language").selectOption("en");
check(
  "switching back to English works",
  await page.getByText("right in your browser").isVisible(),
);

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
