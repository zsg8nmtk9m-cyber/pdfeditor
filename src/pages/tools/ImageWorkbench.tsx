import { useEffect, useRef, useState } from "react";
import { ImageDown } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileList from "../../components/FileList";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, ErrorBox, Field, ProgressBar, Select, inputClass } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { processImages } from "../../lib/image/api";
import type { ImageOutputFormat } from "../../lib/image/types";
import { takeHandoffFiles } from "../../lib/handoff";
import type { OutputFile } from "../../lib/utils";

export default function ImageWorkbench() {
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<ImageOutputFormat>("jpeg");
  const [maxWidth, setMaxWidth] = useState(1920);
  const [maxHeight, setMaxHeight] = useState(1920);
  const [quality, setQuality] = useState(0.8);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OutputFile[] | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const handed = takeHandoffFiles();
    if (handed) setFiles(handed);
    return () => controller.current?.abort();
  }, []);

  async function run() {
    const abortController = new AbortController();
    controller.current = abortController;
    setBusy(true);
    setProgress(0);
    setError("");
    try {
      const outputs = await processImages(
        files,
        { format, maxWidth, maxHeight, quality },
        (done, total) => setProgress(done / total),
        abortController.signal,
      );
      setResult(outputs.map((output, index) => ({
        name: `image-${index + 1}.${output.extension}`,
        blob: new Blob([output.bytes], { type: output.mimeType }),
      })));
    } catch (caught) {
      if ((caught as { name?: string })?.name !== "AbortError") {
        setError(errorText(caught, t, t.imageWorkbench.failed));
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
        <ResultPanel files={result} zipName="optimized-images.zip" onReset={reset} />
      ) : (
        <div className="space-y-4">
          <Dropzone
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple
            compact={files.length > 0}
            onFiles={(incoming) => setFiles((previous) => [...previous, ...incoming])}
            hint={t.imageWorkbench.hint}
          />
          {files.length > 0 && (
            <>
              <FileList
                files={files}
                kind="image"
                onRemove={(index) => setFiles((previous) => previous.filter((_, item) => item !== index))}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t.imageWorkbench.format}>
                  <Select value={format} onChange={(event) => setFormat(event.target.value as ImageOutputFormat)}>
                    <option value="jpeg">{t.imageWorkbench.formatJpeg}</option>
                    <option value="png">{t.imageWorkbench.formatPng}</option>
                    <option value="webp">{t.imageWorkbench.formatWebp}</option>
                  </Select>
                </Field>
                <Field label={t.imageWorkbench.maxWidth}>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={12000}
                    value={maxWidth}
                    onChange={(event) => setMaxWidth(Number(event.target.value))}
                  />
                </Field>
                <Field label={t.imageWorkbench.maxHeight}>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={12000}
                    value={maxHeight}
                    onChange={(event) => setMaxHeight(Number(event.target.value))}
                  />
                </Field>
              </div>
              {format !== "png" && (
                <Field label={t.imageWorkbench.quality(Math.round(quality * 100))}>
                  <input
                    className="w-full accent-indigo-600"
                    type="range"
                    min={40}
                    max={95}
                    value={Math.round(quality * 100)}
                    onChange={(event) => setQuality(Number(event.target.value) / 100)}
                  />
                </Field>
              )}
              <div className="rounded-xl bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-900 ring-1 ring-fuchsia-200">
                <p>{t.imageWorkbench.note}</p>
                <p className="mt-1 text-xs text-fuchsia-700">{t.imageWorkbench.limits}</p>
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
                  <ImageDown className="h-4 w-4" /> {t.imageWorkbench.action(files.length)}
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
