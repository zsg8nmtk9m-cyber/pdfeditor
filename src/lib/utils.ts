import { zipSync } from "fflate";

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** "document.pdf" -> "document" */
export function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

export async function readFileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/**
 * Parse a page-range expression like "1-3, 5, 8-10" into a list of ranges of
 * 0-based page indices. Throws with a user-friendly message on invalid input.
 */
export function parsePageRanges(input: string, pageCount: number): number[][] {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter at least one page or range, e.g. 1-3, 5");
  const ranges: number[][] = [];
  for (const part of trimmed.split(",")) {
    const piece = part.trim();
    if (!piece) continue;
    const m = piece.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw new Error(`"${piece}" is not a valid page or range`);
    const start = parseInt(m[1], 10);
    const end = m[2] ? parseInt(m[2], 10) : start;
    if (start < 1 || end < 1) throw new Error("Page numbers start at 1");
    if (start > pageCount || end > pageCount)
      throw new Error(`This document only has ${pageCount} page${pageCount === 1 ? "" : "s"}`);
    if (end < start) throw new Error(`Range "${piece}" is reversed`);
    const range: number[] = [];
    for (let p = start; p <= end; p++) range.push(p - 1);
    ranges.push(range);
  }
  if (ranges.length === 0) throw new Error("Enter at least one page or range, e.g. 1-3, 5");
  return ranges;
}

export interface OutputFile {
  name: string;
  blob: Blob;
}

export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function makeZip(files: OutputFile[], zipName: string): Promise<OutputFile> {
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    entries[f.name] = new Uint8Array(await f.blob.arrayBuffer());
  }
  const zipped = zipSync(entries, { level: 6 });
  return {
    name: zipName,
    blob: new Blob([zipped], { type: "application/zip" }),
  };
}
