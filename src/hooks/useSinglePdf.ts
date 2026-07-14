import { useCallback, useEffect, useState } from "react";
import { errorText, useT } from "../i18n";
import { getDocSummary, getPageCount } from "../lib/api";
import { saveRecent } from "../lib/fileStore";
import { takeHandoff } from "../lib/handoff";
import type { DocSummary } from "../lib/types";
import { readFileBytes } from "../lib/utils";

/**
 * Shared state machine for tools that operate on one PDF:
 * pick file → read bytes → probe page count and first-page preview
 * (unless the tool accepts encrypted files, which can't be probed).
 */
export function useSinglePdf(options?: { probe?: boolean }) {
  const t = useT();
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
        let thumb: string | null = null;
        if (probe) {
          // getPageCount validates the file (and gives the friendly
          // encrypted-PDF error); the summary preview is best-effort.
          setPageCount(await getPageCount(data));
          const s = await getDocSummary(data);
          setSummary(s);
          thumb = s.thumbnail;
        }
        setFile(f);
        setBytes(data);
        void saveRecent(f.name, data, thumb);
      } catch (err) {
        setError(errorText(err, t, t.errors.couldNotRead));
      } finally {
        setLoading(false);
      }
    },
    [probe, t],
  );

  // Pick up a file handed off from another tool's result screen.
  useEffect(() => {
    const file = takeHandoff();
    if (file) void onFiles([file]);
  }, [onFiles]);

  const reset = useCallback(() => {
    setFile(null);
    setBytes(null);
    setPageCount(0);
    setSummary(null);
    setError("");
  }, []);

  return { file, bytes, pageCount, summary, loading, error, setError, onFiles, reset };
}
