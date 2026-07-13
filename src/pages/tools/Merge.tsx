import { useState } from "react";
import { Combine } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileList from "../../components/FileList";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, ErrorBox } from "../../components/ui";
import { mergePdfs } from "../../lib/api";
import { pdfBlob, readFileBytes } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function Merge() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OutputFile | null>(null);

  function move(i: number, dir: -1 | 1) {
    setFiles((prev) => {
      const next = [...prev];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });
  }

  async function run() {
    setBusy(true);
    setError("");
    try {
      const inputs = await Promise.all(files.map(readFileBytes));
      const merged = await mergePdfs(inputs);
      setResult({ name: "merged.pdf", blob: pdfBlob(merged) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merging failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFiles([]);
    setResult(null);
    setError("");
  }

  return (
    <ToolPage>
      {result ? (
        <ResultPanel files={[result]} onReset={reset} />
      ) : (
        <div className="space-y-4">
          <Dropzone
            accept="application/pdf,.pdf"
            multiple
            compact={files.length > 0}
            onFiles={(f) => setFiles((prev) => [...prev, ...f])}
            hint="Select two or more PDF files"
          />
          {files.length > 0 && (
            <>
              <FileList
                files={files}
                onRemove={(i) => setFiles((prev) => prev.filter((_, j) => j !== i))}
                onMove={move}
              />
              <ErrorBox>{error}</ErrorBox>
              <p className="text-sm text-slate-500">
                Files are merged top to bottom — use the arrows to reorder.
              </p>
              <Button onClick={run} busy={busy} disabled={files.length < 2}>
                <Combine className="h-4 w-4" />
                Merge {files.length} PDF{files.length === 1 ? "" : "s"}
              </Button>
            </>
          )}
        </div>
      )}
    </ToolPage>
  );
}
