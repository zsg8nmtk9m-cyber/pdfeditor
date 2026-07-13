/**
 * All PDF manipulation operations, built on pdf-lib (@cantoo fork, which adds
 * AES encryption support). This module runs INSIDE the PDF worker — UI code
 * calls these through src/lib/api.ts.
 */
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { openForRender, releaseCanvas, renderPage } from "./render";
import type {
  CompressOptions,
  ImagesToPdfOptions,
  NumberFormat,
  PageEdit,
  PageNumberOptions,
  PageSizeMode,
  PdfMetadata,
  PdfToImagesOptions,
  ProgressCallback,
  WatermarkOptions,
} from "./types";

export class EncryptedPdfError extends Error {
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
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
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
  const font = await doc.embedFont(StandardFonts.Helvetica);
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
    throw new Error("Wrong password — could not decrypt this PDF.");
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
