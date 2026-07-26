import { useCallback, useState } from "react";

const MAX_STEPS = 50;

/**
 * State with an undo/redo history.
 *
 * `set` replaces the value WITHOUT recording a step — use it for
 * high-frequency transient updates (drag frames). Call `checkpoint()` with
 * the value still in its "before" state to record an undo step; the next
 * `set` then becomes undoable as one unit. `checkpoint` clears the redo
 * stack, matching editor conventions.
 */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState({
    value: initial,
    undo: [] as T[],
    redo: [] as T[],
  });

  const set = useCallback((updater: T | ((prev: T) => T)) => {
    setState((s) => ({
      ...s,
      value: typeof updater === "function" ? (updater as (p: T) => T)(s.value) : updater,
    }));
  }, []);

  const checkpoint = useCallback(() => {
    setState((s) => ({ ...s, undo: [...s.undo, s.value].slice(-MAX_STEPS), redo: [] }));
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (s.undo.length === 0) return s;
      return {
        value: s.undo[s.undo.length - 1],
        undo: s.undo.slice(0, -1),
        redo: [...s.redo, s.value],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.redo.length === 0) return s;
      return {
        value: s.redo[s.redo.length - 1],
        undo: [...s.undo, s.value],
        redo: s.redo.slice(0, -1),
      };
    });
  }, []);

  /** Replace the value and drop all history (file change / start over). */
  const reset = useCallback((value: T) => setState({ value, undo: [], redo: [] }), []);

  return {
    value: state.value,
    set,
    checkpoint,
    undo,
    redo,
    reset,
    canUndo: state.undo.length > 0,
    canRedo: state.redo.length > 0,
  };
}

/** True when the event is the platform undo (Ctrl/Cmd+Z) or redo chord. */
export function isUndoKey(e: KeyboardEvent): boolean {
  return (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z";
}

export function isRedoKey(e: KeyboardEvent): boolean {
  return (
    (e.ctrlKey || e.metaKey) &&
    ((e.shiftKey && e.key.toLowerCase() === "z") || e.key.toLowerCase() === "y")
  );
}
