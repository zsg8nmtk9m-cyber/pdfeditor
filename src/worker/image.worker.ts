import { runImageWorkbench } from "../lib/image/ops";
import type { ImageWorkerRequest, ImageWorkerResponse } from "../lib/image/types";

const ctx = self as unknown as {
  postMessage(message: ImageWorkerResponse, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<ImageWorkerRequest>) => void) | null;
};

ctx.onmessage = async (event) => {
  const request = event.data;
  try {
    const outputs = await runImageWorkbench(request.files, request.options, (done, total) => {
      ctx.postMessage({ id: request.id, type: "progress", done, total });
    });
    ctx.postMessage(
      { id: request.id, type: "result", outputs },
      outputs.map((output) => output.bytes),
    );
  } catch (error) {
    ctx.postMessage({
      id: request.id,
      type: "error",
      message: error instanceof Error ? error.message : "Image processing failed.",
    });
  }
};
