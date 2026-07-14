/**
 * In-memory handoff slot for "continue in another tool": the source tool
 * stores the produced file here, navigates, and the destination tool picks
 * it up on mount as if the user had dropped it.
 */

let pending: File | null = null;

export function setHandoff(name: string, bytes: Uint8Array): void {
  pending = new File([bytes], name, { type: "application/pdf" });
}

export function takeHandoff(): File | null {
  const file = pending;
  pending = null;
  return file;
}
