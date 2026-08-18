export type OfficePageSize = "a4" | "letter";
export type OfficeOrientation = "auto" | "portrait" | "landscape";

export interface ImagesToDocxOptions {
  pageSize: OfficePageSize;
  orientation: OfficeOrientation;
  marginMm: 0 | 10 | 20;
}

export interface OfficeRunRequest {
  id: number;
  type: "run";
  files: File[];
  options: ImagesToDocxOptions;
}

export type OfficeWorkerRequest = OfficeRunRequest;

export type OfficeWorkerResponse =
  | { id: number; type: "progress"; done: number; total: number }
  | { id: number; type: "result"; bytes: ArrayBuffer }
  | { id: number; type: "error"; message: string };
