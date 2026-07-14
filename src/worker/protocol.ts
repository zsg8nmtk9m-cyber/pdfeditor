/** Message protocol between the UI and the PDF worker. */

export interface WorkerRequest {
  id: number;
  op: string;
  args: unknown[];
}

export type WorkerResponse =
  | { id: number; type: "result"; result: unknown }
  | { id: number; type: "error"; message: string; code?: string }
  | { id: number; type: "progress"; done: number; total: number };
