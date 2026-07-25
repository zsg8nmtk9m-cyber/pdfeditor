/**
 * Rendering helpers built on pdf.js — used for thumbnails, PDF→image
 * conversion and (rasterizing) compression.
 *
 * This module runs INSIDE the PDF worker (see src/worker/pdf.worker.ts), so
 * all drawing uses OffscreenCanvas — no DOM access.
 */
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { DocSummary, PageImage } from "./types";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Available in workers but missing from TypeScript's DOM lib.
declare class FileReaderSync {
  readAsDataURL(blob: Blob): string;
}

/** Synchronous blob → data URL, worker-only (see FileReaderSync above). */
export function blobToDataUrl(blob: Blob): string {
  return new FileReaderSync().readAsDataURL(blob);
}

/**
 * Open a document with pdf.js. pdf.js transfers the buffer to its worker
 * (detaching it), so we always hand it a copy.
 */
export async function openForRender(
  bytes: Uint8Array,
  password?: string,
): Promise<PDFDocumentProxy> {
  return getDocument({ data: bytes.slice(), password }).promise;
}

export interface RenderedPage {
  canvas: OffscreenCanvas;
  /** Page size in PDF points (after rotation). */
  widthPts: number;
  heightPts: number;
}

export async function renderPage(
  pdf: PDFDocumentProxy,
  pageIndex: number,
  scale: number,
): Promise<RenderedPage> {
  const page = await pdf.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  const canvas = new OffscreenCanvas(
    Math.max(1, Math.floor(viewport.width)),
    Math.max(1, Math.floor(viewport.height)),
  );
  const ctx = canvas.getContext("2d", { alpha: false })!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  page.cleanup();
  return { canvas, widthPts: viewport.width / scale, heightPts: viewport.height / scale };
}

export function releaseCanvas(canvas: OffscreenCanvas): void {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Cheap per-file summary for pickers: page count plus a first-page
 * thumbnail. Never throws — unreadable (e.g. encrypted) files yield
 * `{ pageCount: 0, thumbnail: null }` so callers can show a fallback.
 */
export async function renderDocSummary(
  bytes: Uint8Array,
  targetWidth = 200,
): Promise<DocSummary> {
  try {
    const pdf = await openForRender(bytes);
    try {
      const page = await pdf.getPage(1);
      const base = page.getViewport({ scale: 1 });
      page.cleanup();
      const { canvas } = await renderPage(pdf, 0, targetWidth / base.width);
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 });
      releaseCanvas(canvas);
      return {
        pageCount: pdf.numPages,
        thumbnail: new FileReaderSync().readAsDataURL(blob),
        widthPts: base.width,
        heightPts: base.height,
      };
    } finally {
      await pdf.destroy();
    }
  } catch {
    return { pageCount: 0, thumbnail: null, widthPts: 0, heightPts: 0 };
  }
}

/** Render one page at high resolution for the annotate editor. */
export async function renderPageImage(
  bytes: Uint8Array,
  pageIndex: number,
  scale = 2,
): Promise<PageImage> {
  const pdf = await openForRender(bytes);
  try {
    const { canvas, widthPts, heightPts } = await renderPage(pdf, pageIndex, scale);
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
    releaseCanvas(canvas);
    return { dataUrl: new FileReaderSync().readAsDataURL(blob), widthPts, heightPts };
  } finally {
    await pdf.destroy();
  }
}

/**
 * Render every page as a small data-URL thumbnail.
 * Calls `onProgress(done, total)` as pages finish.
 */
export async function renderThumbnails(
  bytes: Uint8Array,
  targetWidth = 320,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const pdf = await openForRender(bytes);
  const reader = new FileReaderSync();
  try {
    const thumbs: string[] = [];
    for (let i = 0; i < pdf.numPages; i++) {
      const page = await pdf.getPage(i + 1);
      const base = page.getViewport({ scale: 1 });
      const scale = targetWidth / base.width;
      page.cleanup();
      const { canvas } = await renderPage(pdf, i, scale);
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 });
      releaseCanvas(canvas);
      thumbs.push(reader.readAsDataURL(blob));
      onProgress?.(i + 1, pdf.numPages);
    }
    return thumbs;
  } finally {
    await pdf.destroy();
  }
}
