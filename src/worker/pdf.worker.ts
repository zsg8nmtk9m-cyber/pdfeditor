/**
 * The PDF worker: owns pdf-lib and pdf.js so parsing, rebuilding and
 * rasterization never block the UI thread. Each request runs an operation
 * from lib/ops or lib/render; a progress callback is appended as the last
 * argument (operations that don't take one simply ignore it).
 */
import * as ops from "../lib/ops";
import { renderDocSummary, renderThumbnails } from "../lib/render";
import type { WorkerRequest, WorkerResponse } from "./protocol";

// The worker global; typed loosely because tsconfig uses the DOM lib.
const ctx = self as unknown as {
  postMessage(msg: WorkerResponse, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const handlers: Record<string, (...args: any[]) => Promise<unknown>> = {
  pageCount: ops.getPageCount,
  merge: ops.mergePdfs,
  extractPages: ops.extractPages,
  rebuild: ops.rebuildPdf,
  rotate: ops.rotatePdf,
  watermark: ops.addWatermark,
  pageNumbers: ops.addPageNumbers,
  protect: ops.protectPdf,
  unlock: ops.unlockPdf,
  isEncrypted: ops.isEncrypted,
  metadataRead: ops.readMetadata,
  metadataWrite: ops.writeMetadata,
  // Progress-aware operations (callback arrives as the trailing argument).
  imagesToPdf: ops.imagesToPdf,
  compress: ops.compressPdf,
  pdfToImages: ops.pdfToImages,
  thumbnails: renderThumbnails,
  docSummary: renderDocSummary,
};

/** Output buffers are transferred (not copied) back to the UI thread. */
function transfersOf(result: unknown): Transferable[] {
  if (result instanceof Uint8Array) return [result.buffer as ArrayBuffer];
  return [];
}

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, op, args } = e.data;
  const handler = handlers[op];
  if (!handler) {
    ctx.postMessage({ id, type: "error", message: `Unknown operation "${op}"` });
    return;
  }
  const progress = (done: number, total: number) =>
    ctx.postMessage({ id, type: "progress", done, total });
  try {
    const result = await handler(...args, progress);
    ctx.postMessage({ id, type: "result", result }, transfersOf(result));
  } catch (err) {
    ctx.postMessage({
      id,
      type: "error",
      message: err instanceof Error ? err.message : "The operation failed.",
    });
  }
};
