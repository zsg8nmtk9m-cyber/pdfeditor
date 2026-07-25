/**
 * In-memory handoff slot for moving files between tools without a
 * download/upload round trip. Used in two ways:
 *  - a source tool stores its produced file, navigates, and the destination
 *    picks it up on mount ("Continue in another tool");
 *  - the home page stores files dropped onto a tool card, then navigates.
 * The destination tool picks them up as if the user had dropped them there.
 */

let pending: File[] | null = null;

/** Hand off an arbitrary set of files (e.g. dropped onto a tool card). */
export function setHandoffFiles(files: File[]): void {
  pending = files.length ? files : null;
}

/** Convenience for handing off a single produced PDF (result → next tool). */
export function setHandoff(name: string, bytes: Uint8Array): void {
  pending = [new File([bytes], name, { type: "application/pdf" })];
}

/** Take every handed-off file (multi-file tools: merge, batch, images→pdf). */
export function takeHandoffFiles(): File[] | null {
  const files = pending;
  pending = null;
  return files;
}

/** Take just the first handed-off file (single-PDF tools). */
export function takeHandoff(): File | null {
  return takeHandoffFiles()?.[0] ?? null;
}
