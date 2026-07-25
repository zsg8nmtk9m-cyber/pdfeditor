/**
 * All PDF manipulation operations, built on pdf-lib (@cantoo fork, which adds
 * AES encryption support). This module runs INSIDE the PDF worker — UI code
 * calls these through src/lib/api.ts.
 */
import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";
import type { PDFFont } from "pdf-lib";
import { blobToDataUrl, openForRender, releaseCanvas, renderPage } from "./render";
import type {
  AnnotationElement,
  ComparePage,
  CompressOptions,
  FormFieldInfo,
  FormValues,
  ImagesToPdfOptions,
  NumberFormat,
  PageEdit,
  PageNumberOptions,
  PageSizeMode,
  PdfMetadata,
  PdfToImagesOptions,
  ProgressCallback,
  RedactionRect,
  WatermarkOptions,
} from "./types";
import { TEXT_BASELINE, TEXT_LINE_HEIGHT } from "./types";

/**
 * Stable error codes for failures the UI localizes. The message stays as an
 * English fallback; the code survives the worker boundary.
 */
export type OpErrorCode = "encrypted" | "wrong-password";

export class EncryptedPdfError extends Error {
  code: OpErrorCode = "encrypted";
  constructor() {
    super(
      "This PDF is password-protected. Use the Unlock PDF tool first, then try again.",
    );
    this.name = "EncryptedPdfError";
  }
}

/** Load a PDF for editing, translating encryption failures into a friendly error. */
export async function loadPdf(bytes: Uint8Array, password?: string): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { password, updateMetadata: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/encrypted|password/i.test(msg)) throw new EncryptedPdfError();
    throw err;
  }
}

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await loadPdf(bytes);
  return doc.getPageCount();
}

// ---------------------------------------------------------------- Fonts

// The 14 standard PDF fonts only encode WinAnsi (roughly Latin-1 plus a few
// typographic marks). Anything beyond that — Turkish ğışİ, Cyrillic, Greek,
// Polish łż… — needs an embedded Unicode font.
// eslint-disable-next-line no-control-regex
const WINANSI_SAFE =
  /^[\x00-\x7F -ÿŒœŠšŸŽžƒˆ˜–—‘’‚“”„†‡•…‰‹›€™]*$/;

const UNICODE_FONTS = {
  regular: new URL("../assets/DejaVuSans.ttf", import.meta.url).href,
  bold: new URL("../assets/DejaVuSans-Bold.ttf", import.meta.url).href,
};
const unicodeFontCache = new Map<string, Promise<ArrayBuffer>>();

function unicodeFontBytes(variant: keyof typeof UNICODE_FONTS): Promise<ArrayBuffer> {
  let cached = unicodeFontCache.get(variant);
  if (!cached) {
    cached = fetch(UNICODE_FONTS[variant]).then((r) => r.arrayBuffer());
    unicodeFontCache.set(variant, cached);
  }
  return cached;
}

/**
 * Pick a font that can encode `text`: a standard font when possible (keeps
 * files tiny), otherwise an embedded, subsetted DejaVu Sans.
 */
async function embedTextFont(
  doc: PDFDocument,
  text: string,
  variant: "regular" | "bold" = "regular",
): Promise<PDFFont> {
  if (WINANSI_SAFE.test(text)) {
    return doc.embedFont(
      variant === "bold" ? StandardFonts.HelveticaBold : StandardFonts.Helvetica,
    );
  }
  // fontkit is only needed for non-WinAnsi text; load it on demand so it
  // stays out of the main worker chunk.
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  doc.registerFontkit(fontkit);
  return doc.embedFont(await unicodeFontBytes(variant), { subset: true });
}

// ---------------------------------------------------------------- Merge

export async function mergePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const bytes of files) {
    const src = await loadPdf(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const page of pages) out.addPage(page);
  }
  return out.save();
}

// ---------------------------------------------------------------- Split / extract

/** Build one new PDF containing the given 0-based pages of `src`, in order. */
export async function extractPages(
  srcBytes: Uint8Array,
  pageIndices: number[],
): Promise<Uint8Array> {
  const src = await loadPdf(srcBytes);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, pageIndices);
  for (const page of pages) out.addPage(page);
  return out.save();
}

// ---------------------------------------------------------------- Organize

/** Rebuild a document from an ordered list of (possibly rotated) source pages. */
export async function rebuildPdf(
  srcBytes: Uint8Array,
  edits: PageEdit[],
): Promise<Uint8Array> {
  const src = await loadPdf(srcBytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    edits.map((e) => e.srcIndex),
  );
  copied.forEach((page, i) => {
    const extra = edits[i].rotation % 360;
    if (extra !== 0) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((((current + extra) % 360) + 360) % 360));
    }
    out.addPage(page);
  });
  return out.save();
}

// ---------------------------------------------------------------- Rotate

export async function rotatePdf(
  srcBytes: Uint8Array,
  angle: 90 | 180 | 270,
  pageIndices?: number[],
): Promise<Uint8Array> {
  const doc = await loadPdf(srcBytes);
  const targets = pageIndices ?? doc.getPageIndices();
  for (const i of targets) {
    const page = doc.getPage(i);
    const current = page.getRotation().angle;
    page.setRotation(degrees((((current + angle) % 360) + 360) % 360));
  }
  return doc.save();
}

// ---------------------------------------------------------------- Watermark

function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  const n = parseInt(
    m.length === 3 ? m.split("").map((c) => c + c).join("") : m,
    16,
  );
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export async function addWatermark(
  srcBytes: Uint8Array,
  opts: WatermarkOptions,
): Promise<Uint8Array> {
  const doc = await loadPdf(srcBytes);
  const font = await embedTextFont(doc, opts.text, "bold");
  const color = hexToRgb(opts.color);
  const textWidth = font.widthOfTextAtSize(opts.text, opts.fontSize);

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const angleDeg = opts.diagonal
      ? (Math.atan2(height, width) * 180) / Math.PI
      : 0;
    const rad = (angleDeg * Math.PI) / 180;
    // Place the text so its visual center lands on the page center.
    const cx = width / 2;
    const cy = height / 2;
    const halfAlong = textWidth / 2;
    const halfUp = opts.fontSize * 0.35;
    const x = cx - halfAlong * Math.cos(rad) + halfUp * Math.sin(rad);
    const y = cy - halfAlong * Math.sin(rad) - halfUp * Math.cos(rad);
    page.drawText(opts.text, {
      x,
      y,
      size: opts.fontSize,
      font,
      color,
      opacity: opts.opacity,
      rotate: degrees(angleDeg),
    });
  }
  return doc.save();
}

// ---------------------------------------------------------------- Page numbers

function numberLabel(format: NumberFormat, n: number, total: number): string {
  switch (format) {
    case "n":
      return String(n);
    case "n-of-total":
      return `${n} / ${total}`;
    case "page-n-of-total":
      return `Page ${n} of ${total}`;
  }
}

export async function addPageNumbers(
  srcBytes: Uint8Array,
  opts: PageNumberOptions,
): Promise<Uint8Array> {
  const doc = await loadPdf(srcBytes);
  const font = await embedTextFont(doc, numberLabel(opts.format, 1, 1));
  const pages = doc.getPages();
  const margin = 28;
  const total = pages.length + opts.startAt - 1;

  pages.forEach((page, i) => {
    const label = numberLabel(opts.format, i + opts.startAt, total);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(label, opts.fontSize);
    let x: number;
    if (opts.position.endsWith("left")) x = margin;
    else if (opts.position.endsWith("right")) x = width - margin - textWidth;
    else x = (width - textWidth) / 2;
    const y = opts.position.startsWith("top")
      ? height - margin
      : margin - opts.fontSize * 0.3;
    page.drawText(label, {
      x,
      y,
      size: opts.fontSize,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });
  });
  return doc.save();
}

// ---------------------------------------------------------------- Images → PDF

const PAGE_SIZES: Record<Exclude<PageSizeMode, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

/** Convert an arbitrary browser-decodable image into PNG bytes via canvas. */
async function transcodeToPng(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: "image/png" });
  releaseCanvas(canvas);
  return new Uint8Array(await blob.arrayBuffer());
}

export async function imagesToPdf(
  files: File[],
  opts: ImagesToPdfOptions,
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let done = 0;
  for (const file of files) {
    const type = file.type.toLowerCase();
    let image;
    if (type === "image/jpeg") {
      image = await doc.embedJpg(await file.arrayBuffer());
    } else if (type === "image/png") {
      image = await doc.embedPng(await file.arrayBuffer());
    } else {
      image = await doc.embedPng(await transcodeToPng(file));
    }

    if (opts.pageSize === "fit") {
      const page = doc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    } else {
      let [pw, ph] = PAGE_SIZES[opts.pageSize];
      // Auto-rotate the page to match the image orientation.
      if (image.width > image.height) [pw, ph] = [ph, pw];
      const page = doc.addPage([pw, ph]);
      const maxW = pw - opts.margin * 2;
      const maxH = ph - opts.margin * 2;
      const scale = Math.min(maxW / image.width, maxH / image.height, 1);
      const w = image.width * scale;
      const h = image.height * scale;
      page.drawImage(image, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    }
    onProgress?.(++done, files.length);
  }
  return doc.save();
}

// ---------------------------------------------------------------- Compress

/**
 * Compress by re-rendering each page to a JPEG at the requested DPI and
 * rebuilding the document. Very effective on scanned/graphic-heavy PDFs;
 * note that text becomes non-selectable.
 */
export async function compressPdf(
  srcBytes: Uint8Array,
  opts: CompressOptions,
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const pdf = await openForRender(srcBytes);
  try {
    const out = await PDFDocument.create();
    const scale = opts.dpi / 72;
    for (let i = 0; i < pdf.numPages; i++) {
      const { canvas, widthPts, heightPts } = await renderPage(pdf, i, scale);
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: opts.quality });
      releaseCanvas(canvas);
      const jpg = await out.embedJpg(await blob.arrayBuffer());
      const page = out.addPage([widthPts, heightPts]);
      page.drawImage(jpg, { x: 0, y: 0, width: widthPts, height: heightPts });
      onProgress?.(i + 1, pdf.numPages);
    }
    return out.save();
  } finally {
    await pdf.destroy();
  }
}

// ---------------------------------------------------------------- PDF → images

export async function pdfToImages(
  srcBytes: Uint8Array,
  opts: PdfToImagesOptions,
  onProgress?: ProgressCallback,
): Promise<Blob[]> {
  const pdf = await openForRender(srcBytes);
  try {
    const blobs: Blob[] = [];
    for (let i = 0; i < pdf.numPages; i++) {
      const { canvas } = await renderPage(pdf, i, opts.scale);
      blobs.push(
        await canvas.convertToBlob(
          opts.format === "png"
            ? { type: "image/png" }
            : { type: "image/jpeg", quality: opts.quality },
        ),
      );
      releaseCanvas(canvas);
      onProgress?.(i + 1, pdf.numPages);
    }
    return blobs;
  } finally {
    await pdf.destroy();
  }
}

// ---------------------------------------------------------------- Annotate

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/**
 * Map a point from display space (page as rendered by pdf.js: rotation
 * applied, origin top-left, y down) into unrotated PDF space (origin
 * bottom-left, y up). W/H are the page's unrotated dimensions and R its
 * rotation. Derived from pdf.js's viewport transform:
 *   R=0:   u = x,     v = H - y      R=90:  u = y,     v = x
 *   R=180: u = W - x, v = y          R=270: u = H - y, v = W - x
 */
function displayToPdf(R: number, W: number, H: number, u: number, v: number) {
  switch (R) {
    case 90:
      return { x: v, y: u };
    case 180:
      return { x: W - u, y: v };
    case 270:
      return { x: W - v, y: H - u };
    default:
      return { x: u, y: H - v };
  }
}

/** Content drawn on a rotated page must itself be rotated to appear upright. */
function contentRotation(R: number): number {
  return R === 270 ? -90 : R;
}

/**
 * Flatten annotate-editor elements (text boxes and signature images) into
 * the document's page content.
 */
export async function annotatePdf(
  srcBytes: Uint8Array,
  elements: AnnotationElement[],
): Promise<Uint8Array> {
  const doc = await loadPdf(srcBytes);
  const allText = elements.map((el) => el.text ?? "").join("");
  const font = await embedTextFont(doc, allText);
  const imageCache = new Map<string, Awaited<ReturnType<typeof doc.embedPng>>>();

  for (const el of elements) {
    const page = doc.getPage(el.pageIndex);
    const { width: W, height: H } = page.getSize();
    const R = ((page.getRotation().angle % 360) + 360) % 360;
    const rotate = degrees(contentRotation(R));

    if (el.kind === "image" && el.imageDataUrl) {
      let image = imageCache.get(el.imageDataUrl);
      if (!image) {
        image = await doc.embedPng(dataUrlToBytes(el.imageDataUrl));
        imageCache.set(el.imageDataUrl, image);
      }
      // drawImage anchors at the image's bottom-left and rotates around it;
      // pick the anchor so the image covers the element's display rect.
      let anchor: { x: number; y: number };
      switch (R) {
        case 90:
          anchor = { x: el.y + el.h, y: el.x };
          break;
        case 180:
          anchor = { x: W - el.x, y: el.y + el.h };
          break;
        case 270:
          anchor = { x: W - el.y - el.h, y: H - el.x };
          break;
        default:
          anchor = { x: el.x, y: H - el.y - el.h };
      }
      page.drawImage(image, { ...anchor, width: el.w, height: el.h, rotate });
    } else if (el.kind === "text" && el.text) {
      const size = el.fontSize ?? 16;
      const color = hexToRgb(el.color ?? "#111827");
      // Draw line by line so multi-line text follows the display layout on
      // rotated pages too (drawText's own lineHeight assumes rotation 0).
      el.text.split("\n").forEach((line, i) => {
        if (!line) return;
        const baseline = el.y + size * TEXT_BASELINE + i * size * TEXT_LINE_HEIGHT;
        const { x, y } = displayToPdf(R, W, H, el.x, baseline);
        page.drawText(line, { x, y, size, font, color, rotate });
      });
    }
  }
  return doc.save();
}

// ---------------------------------------------------------------- Compare

/** Per-channel difference above which a pixel counts as changed. */
const DIFF_THRESHOLD = 32;

/**
 * Visually compare two documents page by page.
 *
 * Both pages are rendered at the same scale onto identically sized canvases
 * (so differing page sizes still line up at the top-left) and compared pixel
 * by pixel. The result image shows the second file faded to grey with every
 * changed pixel painted red, which reads far better than a side-by-side at
 * thumbnail size.
 */
export async function comparePdfs(
  aBytes: Uint8Array,
  bBytes: Uint8Array,
  dpi = 100,
  onProgress?: ProgressCallback,
): Promise<ComparePage[]> {
  const pdfA = await openForRender(aBytes);
  const pdfB = await openForRender(bBytes);
  try {
    const total = Math.max(pdfA.numPages, pdfB.numPages);
    const scale = dpi / 72;
    const results: ComparePage[] = [];

    for (let i = 0; i < total; i++) {
      const inA = i < pdfA.numPages;
      const inB = i < pdfB.numPages;

      if (!inA || !inB) {
        // Page added or removed — show it whole rather than diffing.
        const { canvas } = await renderPage(inA ? pdfA : pdfB, i, scale);
        const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 });
        releaseCanvas(canvas);
        results.push({
          pageIndex: i,
          diffDataUrl: blobToDataUrl(blob),
          changedRatio: 1,
          onlyIn: inA ? "a" : "b",
        });
      } else {
        const ra = await renderPage(pdfA, i, scale);
        const rb = await renderPage(pdfB, i, scale);
        const w = Math.max(ra.canvas.width, rb.canvas.width);
        const h = Math.max(ra.canvas.height, rb.canvas.height);

        const ca = new OffscreenCanvas(w, h);
        const cxa = ca.getContext("2d")!;
        cxa.fillStyle = "#ffffff";
        cxa.fillRect(0, 0, w, h);
        cxa.drawImage(ra.canvas, 0, 0);

        const cb = new OffscreenCanvas(w, h);
        const cxb = cb.getContext("2d")!;
        cxb.fillStyle = "#ffffff";
        cxb.fillRect(0, 0, w, h);
        cxb.drawImage(rb.canvas, 0, 0);

        releaseCanvas(ra.canvas);
        releaseCanvas(rb.canvas);

        const da = cxa.getImageData(0, 0, w, h).data;
        const db = cxb.getImageData(0, 0, w, h).data;
        const diff = cxb.createImageData(w, h);
        let changed = 0;

        for (let p = 0; p < da.length; p += 4) {
          const differs =
            Math.abs(da[p] - db[p]) > DIFF_THRESHOLD ||
            Math.abs(da[p + 1] - db[p + 1]) > DIFF_THRESHOLD ||
            Math.abs(da[p + 2] - db[p + 2]) > DIFF_THRESHOLD;
          if (differs) {
            changed++;
            diff.data[p] = 220;
            diff.data[p + 1] = 38;
            diff.data[p + 2] = 38;
          } else {
            // Unchanged content stays as a light grey ghost for context.
            const grey = db[p] * 0.299 + db[p + 1] * 0.587 + db[p + 2] * 0.114;
            const faded = 255 - (255 - grey) * 0.3;
            diff.data[p] = faded;
            diff.data[p + 1] = faded;
            diff.data[p + 2] = faded;
          }
          diff.data[p + 3] = 255;
        }

        cxb.putImageData(diff, 0, 0);
        const blob = await cb.convertToBlob({ type: "image/png" });
        releaseCanvas(ca);
        releaseCanvas(cb);
        results.push({
          pageIndex: i,
          diffDataUrl: blobToDataUrl(blob),
          changedRatio: changed / (w * h),
          onlyIn: null,
        });
      }
      onProgress?.(i + 1, total);
    }
    return results;
  } finally {
    await pdfA.destroy();
    await pdfB.destroy();
  }
}

// ---------------------------------------------------------------- Redact

/**
 * Permanently remove the content under the given areas.
 *
 * Drawing black boxes over text would leave the text extractable — the
 * classic redaction failure. Instead every page carrying a redaction is
 * rendered to pixels, the areas are painted out on that raster, and the page
 * is rebuilt from the image, so the original glyphs no longer exist in the
 * file. Pages without redactions are copied untouched and keep their real
 * text.
 */
export async function redactPdf(
  srcBytes: Uint8Array,
  rects: RedactionRect[],
  dpi = 150,
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const byPage = new Map<number, RedactionRect[]>();
  for (const r of rects) {
    const list = byPage.get(r.pageIndex);
    if (list) list.push(r);
    else byPage.set(r.pageIndex, [r]);
  }

  const src = await loadPdf(srcBytes);
  const pdf = await openForRender(srcBytes);
  try {
    const out = await PDFDocument.create();
    const scale = dpi / 72;
    const total = pdf.numPages;
    for (let i = 0; i < total; i++) {
      const pageRects = byPage.get(i);
      if (!pageRects) {
        const [copied] = await out.copyPages(src, [i]);
        out.addPage(copied);
      } else {
        // Render at display orientation, paint the areas out, rebuild.
        const { canvas, widthPts, heightPts } = await renderPage(pdf, i, scale);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#000000";
        for (const r of pageRects) {
          ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
        }
        const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
        releaseCanvas(canvas);
        const img = await out.embedJpg(await blob.arrayBuffer());
        const page = out.addPage([widthPts, heightPts]);
        page.drawImage(img, { x: 0, y: 0, width: widthPts, height: heightPts });
      }
      onProgress?.(i + 1, total);
    }
    return out.save();
  } finally {
    await pdf.destroy();
  }
}

// ---------------------------------------------------------------- Protect / unlock

export async function protectPdf(
  srcBytes: Uint8Array,
  password: string,
): Promise<Uint8Array> {
  const doc = await loadPdf(srcBytes);
  doc.encrypt({
    userPassword: password,
    ownerPassword: password,
    permissions: { printing: "highResolution", copying: false, modifying: false },
  });
  return doc.save();
}

export async function unlockPdf(
  srcBytes: Uint8Array,
  password: string,
): Promise<Uint8Array> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(srcBytes, { password, updateMetadata: false });
  } catch {
    throw Object.assign(new Error("Wrong password — could not decrypt this PDF."), {
      code: "wrong-password" satisfies OpErrorCode,
    });
  }
  return doc.save();
}

export async function isEncrypted(bytes: Uint8Array): Promise<boolean> {
  try {
    const doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    return doc.isEncrypted;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- Forms

/** List every fillable AcroForm field with its current value and options. */
export async function readFormFields(bytes: Uint8Array): Promise<FormFieldInfo[]> {
  const doc = await loadPdf(bytes);
  const infos: FormFieldInfo[] = [];
  for (const field of doc.getForm().getFields()) {
    const base = { name: field.getName(), readOnly: field.isReadOnly() };
    if (field instanceof PDFTextField) {
      infos.push({
        ...base,
        kind: "text",
        value: field.getText() ?? "",
        multiline: field.isMultiline(),
      });
    } else if (field instanceof PDFCheckBox) {
      infos.push({ ...base, kind: "checkbox", value: field.isChecked() });
    } else if (field instanceof PDFRadioGroup) {
      infos.push({
        ...base,
        kind: "radio",
        value: field.getSelected() ?? "",
        options: field.getOptions(),
      });
    } else if (field instanceof PDFDropdown) {
      infos.push({
        ...base,
        kind: "dropdown",
        value: field.getSelected()[0] ?? "",
        options: field.getOptions(),
      });
    } else if (field instanceof PDFOptionList) {
      infos.push({
        ...base,
        kind: "optionlist",
        value: field.getSelected()[0] ?? "",
        options: field.getOptions(),
      });
    }
    // Buttons and signature fields aren't fillable — skipped.
  }
  return infos;
}

/**
 * Write values into the form. With `flatten` the fields are stamped into the
 * page content and removed, so the result prints exactly as filled and can't
 * be edited (or have its values quietly changed) afterwards.
 */
export async function fillForm(
  bytes: Uint8Array,
  values: FormValues,
  flatten: boolean,
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const form = doc.getForm();
  // Appearance streams need a font that can encode every typed value.
  const typed = Object.values(values).filter((v): v is string => typeof v === "string");
  const font = await embedTextFont(doc, typed.join(""));

  for (const [name, value] of Object.entries(values)) {
    const field = form.getField(name);
    if (field.isReadOnly()) continue;
    if (field instanceof PDFTextField) {
      field.setText(typeof value === "string" ? value : "");
    } else if (field instanceof PDFCheckBox) {
      if (value) field.check();
      else field.uncheck();
    } else if (
      field instanceof PDFRadioGroup ||
      field instanceof PDFDropdown ||
      field instanceof PDFOptionList
    ) {
      // Selecting "" throws; an unset choice simply stays unset.
      if (typeof value === "string" && value) field.select(value);
    }
  }

  form.updateFieldAppearances(font);
  // flatten() would regenerate appearances with the default (WinAnsi-only)
  // font and throw on Unicode values — ours are already up to date.
  if (flatten) form.flatten({ updateFieldAppearances: false });
  return doc.save();
}

// ---------------------------------------------------------------- Metadata

export async function readMetadata(bytes: Uint8Array): Promise<PdfMetadata> {
  const doc = await loadPdf(bytes);
  return {
    title: doc.getTitle() ?? "",
    author: doc.getAuthor() ?? "",
    subject: doc.getSubject() ?? "",
    keywords: doc.getKeywords() ?? "",
    creator: doc.getCreator() ?? "",
    producer: doc.getProducer() ?? "",
  };
}

export async function writeMetadata(
  bytes: Uint8Array,
  meta: PdfMetadata,
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  doc.setTitle(meta.title);
  doc.setAuthor(meta.author);
  doc.setSubject(meta.subject);
  doc.setKeywords(meta.keywords ? meta.keywords.split(/[,;]\s*/) : []);
  doc.setCreator(meta.creator);
  doc.setProducer(meta.producer);
  return doc.save();
}
