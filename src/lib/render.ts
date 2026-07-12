/**
 * Rendering helpers built on pdf.js — used for thumbnails, previews,
 * PDF→image conversion and (rasterizing) compression.
 */
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

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
  canvas: HTMLCanvasElement;
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
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d", { alpha: false })!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return { canvas, widthPts: viewport.width / scale, heightPts: viewport.height / scale };
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
  try {
    const thumbs: string[] = [];
    for (let i = 0; i < pdf.numPages; i++) {
      const page = await pdf.getPage(i + 1);
      const base = page.getViewport({ scale: 1 });
      const scale = targetWidth / base.width;
      page.cleanup();
      const { canvas } = await renderPage(pdf, i, scale);
      thumbs.push(canvas.toDataURL("image/jpeg", 0.8));
      onProgress?.(i + 1, pdf.numPages);
    }
    return thumbs;
  } finally {
    await pdf.destroy();
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/jpeg",
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not export image"))),
      type,
      quality,
    );
  });
}
