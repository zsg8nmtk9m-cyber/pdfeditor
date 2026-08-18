import { imagesToDocx } from "../lib/office/ops";
import type { OfficeWorkerRequest, OfficeWorkerResponse } from "../lib/office/types";

const ctx = self as unknown as {
  postMessage(message: OfficeWorkerResponse, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<OfficeWorkerRequest>) => void) | null;
};

ctx.onmessage = async (event) => {
  const request = event.data;
  try {
    const bytes = await imagesToDocx(request.files, request.options, (done, total) => {
      ctx.postMessage({ id: request.id, type: "progress", done, total });
    });
    const buffer = bytes.buffer as ArrayBuffer;
    ctx.postMessage({ id: request.id, type: "result", bytes: buffer }, [buffer]);
  } catch (error) {
    ctx.postMessage({
      id: request.id,
      type: "error",
      message: error instanceof Error ? error.message : "Office conversion failed.",
    });
  }
};
