import { useEffect, useRef, useState } from "react";
import { FileType2 } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileList from "../../components/FileList";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, ErrorBox, Field, ProgressBar, Select } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { imagesToDocx } from "../../lib/office/api";
import type { OfficeOrientation, OfficePageSize } from "../../lib/office/types";
import { takeHandoffFiles } from "../../lib/handoff";
import { docxBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function ImagesToDocx() {
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<OfficePageSize>("a4");
  const [orientation, setOrientation] = useState<OfficeOrientation>("auto");
  const [marginMm, setMarginMm] = useState<0 | 10 | 20>(10);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OutputFile | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const handed = takeHandoffFiles();
    if (handed) setFiles(handed);
    return () => controller.current?.abort();
  }, []);

  function move(index: number, direction: -1 | 1) {
    setFiles((previous) => {
      const next = [...previous];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  }

  async function run() {
    const abortController = new AbortController();
    controller.current = abortController;
    setBusy(true);
    setProgress(0);
    setError("");
    try {
      const bytes = await imagesToDocx(
        files,
        { pageSize, orientation, marginMm },
        (done, total) => setProgress(done / total),
        abortController.signal,
      );
      setResult({ name: "images.docx", blob: docxBlob(bytes) });
    } catch (caught) {
      if ((caught as { name?: string })?.name !== "AbortError") {
        setError(errorText(caught, t, t.imagesToDocx.failed));
      }
    } finally {
      if (controller.current === abortController) controller.current = null;
      setBusy(false);
    }
  }

  function reset() {
    controller.current?.abort();
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
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple
            compact={files.length > 0}
            onFiles={(incoming) => setFiles((previous) => [...previous, ...incoming])}
            hint={t.imagesToDocx.hint}
          />
          {files.length > 0 && (
            <>
              <FileList
                files={files}
                kind="image"
                onRemove={(index) => setFiles((previous) => previous.filter((_, item) => item !== index))}
                onMove={move}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t.imagesToDocx.pageSize}>
                  <Select value={pageSize} onChange={(event) => setPageSize(event.target.value as OfficePageSize)}>
                    <option value="a4">{t.imagesToDocx.sizeA4}</option>
                    <option value="letter">{t.imagesToDocx.sizeLetter}</option>
                  </Select>
                </Field>
                <Field label={t.imagesToDocx.orientation}>
                  <Select value={orientation} onChange={(event) => setOrientation(event.target.value as OfficeOrientation)}>
                    <option value="auto">{t.imagesToDocx.orientAuto}</option>
                    <option value="portrait">{t.imagesToDocx.orientPortrait}</option>
                    <option value="landscape">{t.imagesToDocx.orientLandscape}</option>
                  </Select>
                </Field>
                <Field label={t.imagesToDocx.margin}>
                  <Select value={marginMm} onChange={(event) => setMarginMm(Number(event.target.value) as 0 | 10 | 20)}>
                    <option value={0}>{t.imagesToDocx.marginNone}</option>
                    <option value={10}>{t.imagesToDocx.marginNarrow}</option>
                    <option value={20}>{t.imagesToDocx.marginNormal}</option>
                  </Select>
                </Field>
              </div>
              <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 ring-1 ring-blue-200">
                <p>{t.imagesToDocx.note}</p>
                <p className="mt-1 text-xs text-blue-600">{t.imagesToDocx.limits}</p>
              </div>
              {busy && (
                <div className="space-y-2" aria-live="polite">
                  <ProgressBar value={progress} />
                  <p className="text-xs text-slate-500">{Math.round(progress * 100)}%</p>
                </div>
              )}
              <ErrorBox>{error}</ErrorBox>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void run()} busy={busy}>
                  <FileType2 className="h-4 w-4" /> {t.imagesToDocx.action(files.length)}
                </Button>
                {busy && (
                  <Button variant="secondary" onClick={() => controller.current?.abort()}>
                    {t.common.cancel}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </ToolPage>
  );
}
