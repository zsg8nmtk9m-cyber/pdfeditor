import type { ImagesToDocxOptions, OfficeWorkerRequest, OfficeWorkerResponse } from "./types";

let nextId = 1;

export function imagesToDocx(
  files: File[],
  options: ImagesToDocxOptions,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const worker = new Worker(new URL("../../worker/office.worker.ts", import.meta.url), {
    type: "module",
  });
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = () => {
      finish();
      reject(new DOMException("The conversion was cancelled.", "AbortError"));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "Office conversion failed."));
    };
    worker.onmessage = (event: MessageEvent<OfficeWorkerResponse>) => {
      const response = event.data;
      if (response.id !== id) return;
      if (response.type === "progress") {
        onProgress(response.done, response.total);
      } else if (response.type === "result") {
        finish();
        resolve(new Uint8Array(response.bytes));
      } else {
        finish();
        reject(new Error(response.message));
      }
    };
    const request: OfficeWorkerRequest = { id, type: "run", files, options };
    worker.postMessage(request);
  });
}
