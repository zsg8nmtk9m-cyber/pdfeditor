export type ImageOutputFormat = "jpeg" | "png" | "webp";

export interface ImageWorkbenchOptions {
  format: ImageOutputFormat;
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

export interface ProcessedImage {
  bytes: ArrayBuffer;
  mimeType: string;
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
}

export interface ImageRunRequest {
  id: number;
  type: "run";
  files: File[];
  options: ImageWorkbenchOptions;
}

export type ImageWorkerRequest = ImageRunRequest;

export type ImageWorkerResponse =
  | { id: number; type: "progress"; done: number; total: number }
  | { id: number; type: "result"; outputs: ProcessedImage[] }
  | { id: number; type: "error"; message: string };
