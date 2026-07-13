import { useCallback, useEffect, useRef, useState } from "react";
import { renderThumbnails } from "../lib/api";

/** Render (and cache) all page thumbnails for the given document bytes. */
export function usePageThumbnails(bytes: Uint8Array | null, targetWidth = 224) {
  const [thumbs, setThumbs] = useState<string[] | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!bytes) {
      setThumbs(null);
      return;
    }
    let alive = true;
    setThumbs(null);
    setProgress(0);
    renderThumbnails(bytes, targetWidth, (done, total) => {
      if (alive) setProgress(done / total);
    })
      .then((t) => alive && setThumbs(t))
      .catch(() => alive && setThumbs([]));
    return () => {
      alive = false;
    };
  }, [bytes, targetWidth]);

  return { thumbs, progress };
}

/**
 * Click/shift-click page selection state for thumbnail grids.
 *
 * `onGesture` fires after user-initiated changes (click, select-all, clear)
 * but NOT after programmatic `replace` — this lets callers mirror clicks
 * into a text field without reformatting the field while the user types.
 */
export function usePageSelection(onGesture?: (next: ReadonlySet<number>) => void) {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const anchor = useRef<number | null>(null);
  const gesture = useRef(onGesture);
  gesture.current = onGesture;

  const apply = useCallback((next: ReadonlySet<number>) => {
    selectedRef.current = next;
    setSelected(next);
    gesture.current?.(next);
  }, []);

  const toggle = useCallback(
    (index: number, shiftKey: boolean) => {
      const next = new Set(selectedRef.current);
      if (shiftKey && anchor.current !== null) {
        const [lo, hi] = [Math.min(anchor.current, index), Math.max(anchor.current, index)];
        for (let i = lo; i <= hi; i++) next.add(i);
      } else if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      anchor.current = index;
      apply(next);
    },
    [apply],
  );

  const selectAll = useCallback(
    (count: number) => apply(new Set(Array.from({ length: count }, (_, i) => i))),
    [apply],
  );

  const clear = useCallback(() => {
    anchor.current = null;
    apply(new Set());
  }, [apply]);

  /** Programmatic update (e.g. from a typed range) — does not fire onGesture. */
  const replace = useCallback((indices: number[]) => {
    selectedRef.current = new Set(indices);
    setSelected(selectedRef.current);
  }, []);

  return { selected, toggle, selectAll, clear, replace };
}
