import { useCallback, useState } from "react";
import { getDocSummary, getPageCount } from "../lib/api";
import type { DocSummary } from "../lib/types";
import { readFileBytes } from "../lib/utils";

/**
 * Shared state machine for tools that operate on one PDF:
 * pick file → read bytes → probe page count and first-page preview
 * (unless the tool accepts encrypted files, which can't be probed).
 */
export function useSinglePdf(options?: { probe?: boolean }) {
  const probe = options?.probe ?? true;
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [summary, setSummary] = useState<DocSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onFiles = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setLoading(true);
      setError("");
      try {
        const data = await readFileBytes(f);
        if (probe) {
          // getPageCount validates the file (and gives the friendly
          // encrypted-PDF error); the summary preview is best-effort.
          setPageCount(await getPageCount(data));
          setSummary(await getDocSummary(data));
        }
        setFile(f);
        setBytes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read this PDF.");
      } finally {
        setLoading(false);
      }
    },
    [probe],
  );

  const reset = useCallback(() => {
    setFile(null);
    setBytes(null);
    setPageCount(0);
    setSummary(null);
    setError("");
  }, []);

  return { file, bytes, pageCount, summary, loading, error, setError, onFiles, reset };
}
