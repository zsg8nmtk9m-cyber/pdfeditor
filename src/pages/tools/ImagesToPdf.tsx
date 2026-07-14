import { useState } from "react";
import { FileImage } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileList from "../../components/FileList";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, ErrorBox, Field, ProgressBar, Select } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { imagesToPdf } from "../../lib/api";
import type { PageSizeMode } from "../../lib/types";
import { pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function ImagesToPdf() {
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeMode>("a4");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
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
    setProgress(0);
    setError("");
    try {
      const bytes = await imagesToPdf(files, { pageSize, margin: 24 }, (done, total) =>
        setProgress(done / total),
      );
      setResult({ name: "images.pdf", blob: pdfBlob(bytes) });
    } catch (err) {
      setError(errorText(err, t, t.imagesToPdf.failed));
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
            accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
            multiple
            compact={files.length > 0}
            onFiles={(f) => setFiles((prev) => [...prev, ...f])}
            hint={t.imagesToPdf.hint}
          />
          {files.length > 0 && (
            <>
              <FileList
                files={files}
                kind="image"
                onRemove={(i) => setFiles((prev) => prev.filter((_, j) => j !== i))}
                onMove={move}
              />
              <div className="max-w-xs">
                <Field label={t.imagesToPdf.pageSize}>
                  <Select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as PageSizeMode)}
                  >
                    <option value="a4">{t.imagesToPdf.sizeA4}</option>
                    <option value="letter">{t.imagesToPdf.sizeLetter}</option>
                    <option value="fit">{t.imagesToPdf.sizeFit}</option>
                  </Select>
                </Field>
              </div>
              {busy && <ProgressBar value={progress} />}
              <ErrorBox>{error}</ErrorBox>
              <Button onClick={run} busy={busy}>
                <FileImage className="h-4 w-4" /> {t.imagesToPdf.action(files.length)}
              </Button>
            </>
          )}
        </div>
      )}
    </ToolPage>
  );
}
