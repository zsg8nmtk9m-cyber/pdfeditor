/**
 * Typed client for the PDF worker. UI code imports operations from here with
 * the same signatures as lib/ops, but every call runs off the main thread.
 * Inputs are structured-cloned (so callers keep their buffers usable);
 * result buffers are transferred back without copying.
 */
import type { WorkerRequest, WorkerResponse } from "../worker/protocol";
import type {
  AnnotationElement,
  ComparePage,
  CompressOptions,
  DocSummary,
  FormFieldInfo,
  FormValues,
  ImagesToPdfOptions,
  PageEdit,
  PageImage,
  PageNumberOptions,
  PdfMetadata,
  PdfToImagesOptions,
  ProgressCallback,
  RedactionRect,
  WatermarkOptions,
} from "./types";

interface Pending {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  onProgress?: ProgressCallback;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../worker/pdf.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      const entry = pending.get(msg.id);
      if (!entry) return;
      if (msg.type === "progress") {
        entry.onProgress?.(msg.done, msg.total);
      } else if (msg.type === "result") {
        pending.delete(msg.id);
        entry.resolve(msg.result);
      } else {
        pending.delete(msg.id);
        // Preserve the stable error code across the worker boundary so the
        // UI can localize known failures.
        entry.reject(Object.assign(new Error(msg.message), msg.code ? { code: msg.code } : {}));
      }
    };
    worker.onerror = (e) => {
      // The worker itself crashed — fail everything in flight and recreate
      // the worker lazily on the next call.
      const error = new Error(e.message || "The PDF engine crashed. Please try again.");
      for (const entry of pending.values()) entry.reject(error);
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

function call<T>(op: string, args: unknown[], onProgress?: ProgressCallback): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onProgress });
    const request: WorkerRequest = { id, op, args };
    getWorker().postMessage(request);
  });
}

// ---------------------------------------------------------------- Operations

export const getPageCount = (bytes: Uint8Array) => call<number>("pageCount", [bytes]);

export const mergePdfs = (files: Uint8Array[]) => call<Uint8Array>("merge", [files]);

export const extractPages = (bytes: Uint8Array, pageIndices: number[]) =>
  call<Uint8Array>("extractPages", [bytes, pageIndices]);

export const rebuildPdf = (bytes: Uint8Array, edits: PageEdit[]) =>
  call<Uint8Array>("rebuild", [bytes, edits]);

export const rotatePdf = (bytes: Uint8Array, angle: 90 | 180 | 270, pageIndices?: number[]) =>
  call<Uint8Array>("rotate", [bytes, angle, pageIndices]);

export const addWatermark = (bytes: Uint8Array, opts: WatermarkOptions) =>
  call<Uint8Array>("watermark", [bytes, opts]);

export const addPageNumbers = (bytes: Uint8Array, opts: PageNumberOptions) =>
  call<Uint8Array>("pageNumbers", [bytes, opts]);

export const protectPdf = (bytes: Uint8Array, password: string) =>
  call<Uint8Array>("protect", [bytes, password]);

export const unlockPdf = (bytes: Uint8Array, password: string) =>
  call<Uint8Array>("unlock", [bytes, password]);

export const isEncrypted = (bytes: Uint8Array) => call<boolean>("isEncrypted", [bytes]);

export const readMetadata = (bytes: Uint8Array) => call<PdfMetadata>("metadataRead", [bytes]);

export const writeMetadata = (bytes: Uint8Array, meta: PdfMetadata) =>
  call<Uint8Array>("metadataWrite", [bytes, meta]);

export const readFormFields = (bytes: Uint8Array) =>
  call<FormFieldInfo[]>("formFields", [bytes]);

export const fillForm = (bytes: Uint8Array, values: FormValues, flatten: boolean) =>
  call<Uint8Array>("formFill", [bytes, values, flatten]);

export const imagesToPdf = (
  files: File[],
  opts: ImagesToPdfOptions,
  onProgress?: ProgressCallback,
) => call<Uint8Array>("imagesToPdf", [files, opts], onProgress);

export const compressPdf = (
  bytes: Uint8Array,
  opts: CompressOptions,
  onProgress?: ProgressCallback,
) => call<Uint8Array>("compress", [bytes, opts], onProgress);

export const pdfToImages = (
  bytes: Uint8Array,
  opts: PdfToImagesOptions,
  onProgress?: ProgressCallback,
) => call<Blob[]>("pdfToImages", [bytes, opts], onProgress);

export const renderThumbnails = (
  bytes: Uint8Array,
  targetWidth: number,
  onProgress?: ProgressCallback,
) => call<string[]>("thumbnails", [bytes, targetWidth], onProgress);

export const getDocSummary = (bytes: Uint8Array, targetWidth?: number) =>
  call<DocSummary>("docSummary", [bytes, targetWidth]);

export const renderPageImage = (bytes: Uint8Array, pageIndex: number, scale?: number) =>
  call<PageImage>("pageImage", [bytes, pageIndex, scale]);

export const annotatePdf = (bytes: Uint8Array, elements: AnnotationElement[]) =>
  call<Uint8Array>("annotate", [bytes, elements]);

export const comparePdfs = (
  a: Uint8Array,
  b: Uint8Array,
  dpi?: number,
  onProgress?: ProgressCallback,
) => call<ComparePage[]>("compare", [a, b, dpi], onProgress);

export const redactPdf = (
  bytes: Uint8Array,
  rects: RedactionRect[],
  dpi?: number,
  onProgress?: ProgressCallback,
) => call<Uint8Array>("redact", [bytes, rects, dpi], onProgress);
