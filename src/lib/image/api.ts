import type {
  ImageWorkbenchOptions,
  ImageWorkerRequest,
  ImageWorkerResponse,
  ProcessedImage,
} from "./types";

let nextId = 1;

export function processImages(
  files: File[],
  options: ImageWorkbenchOptions,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<ProcessedImage[]> {
  const worker = new Worker(new URL("../../worker/image.worker.ts", import.meta.url), {
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
      reject(new DOMException("The operation was cancelled.", "AbortError"));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "Image processing failed."));
    };
    worker.onmessage = (event: MessageEvent<ImageWorkerResponse>) => {
      const response = event.data;
      if (response.id !== id) return;
      if (response.type === "progress") {
        onProgress(response.done, response.total);
      } else if (response.type === "result") {
        finish();
        resolve(response.outputs);
      } else {
        finish();
        reject(new Error(response.message));
      }
    };
    const request: ImageWorkerRequest = { id, type: "run", files, options };
    worker.postMessage(request);
  });
}
