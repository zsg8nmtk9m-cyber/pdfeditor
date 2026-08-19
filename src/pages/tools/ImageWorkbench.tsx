import { useEffect, useRef, useState } from "react";
import { ImageDown } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileList from "../../components/FileList";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, ErrorBox, Field, ProgressBar, Select, inputClass } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { processImages } from "../../lib/image/api";
import type {
  ImageCropMode,
  ImageOutputFormat,
  ImageRotation,
} from "../../lib/image/types";
import { takeHandoffFiles } from "../../lib/handoff";
import { formatBytes } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

type ResizePreset = "original" | "web" | "email" | "thumbnail" | "custom";

const PRESETS: Record<Exclude<ResizePreset, "custom">, [number, number]> = {
  original: [12000, 12000],
  web: [1920, 1080],
  email: [1280, 1280],
  thumbnail: [512, 512],
};

interface ImageResult {
  files: OutputFile[];
  note: string;
}

export default function ImageWorkbench() {
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<ImageOutputFormat>("jpeg");
  const [preset, setPreset] = useState<ResizePreset>("web");
  const [maxWidth, setMaxWidth] = useState(1920);
  const [maxHeight, setMaxHeight] = useState(1080);
  const [crop, setCrop] = useState<ImageCropMode>("none");
  const [rotation, setRotation] = useState<ImageRotation>(0);
  const [quality, setQuality] = useState(0.8);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImageResult | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const handed = takeHandoffFiles();
    if (handed) setFiles(handed);
    return () => controller.current?.abort();
  }, []);

  function applyPreset(next: ResizePreset) {
    setPreset(next);
    if (next !== "custom") {
      const [width, height] = PRESETS[next];
      setMaxWidth(width);
      setMaxHeight(height);
    }
  }

  async function run() {
    const abortController = new AbortController();
    controller.current = abortController;
    setBusy(true);
    setProgress(0);
    setError("");
    try {
      const outputs = await processImages(
        files,
        { format, maxWidth, maxHeight, quality, crop, rotation },
        (done, total) => setProgress(done / total),
        abortController.signal,
      );
      const outputFiles = outputs.map((output, index) => ({
        name: `image-${index + 1}.${output.extension}`,
        blob: new Blob([output.bytes], { type: output.mimeType }),
      }));
      const before = files.reduce((sum, file) => sum + file.size, 0);
      const after = outputFiles.reduce((sum, file) => sum + file.blob.size, 0);
      setResult({
        files: outputFiles,
        note: t.imageWorkbench.summary(formatBytes(before), formatBytes(after)),
      });
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
        <ResultPanel
          files={result.files}
          zipName="optimized-images.zip"
          note={result.note}
          onReset={reset}
        />
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={t.imageWorkbench.format}>
                  <Select value={format} onChange={(event) => setFormat(event.target.value as ImageOutputFormat)}>
                    <option value="jpeg">{t.imageWorkbench.formatJpeg}</option>
                    <option value="png">{t.imageWorkbench.formatPng}</option>
                    <option value="webp">{t.imageWorkbench.formatWebp}</option>
                  </Select>
                </Field>
                <Field label={t.imageWorkbench.preset}>
                  <Select value={preset} onChange={(event) => applyPreset(event.target.value as ResizePreset)}>
                    <option value="original">{t.imageWorkbench.presetOriginal}</option>
                    <option value="web">{t.imageWorkbench.presetWeb}</option>
                    <option value="email">{t.imageWorkbench.presetEmail}</option>
                    <option value="thumbnail">{t.imageWorkbench.presetThumbnail}</option>
                    <option value="custom">{t.imageWorkbench.presetCustom}</option>
                  </Select>
                </Field>
                <Field label={t.imageWorkbench.crop}>
                  <Select value={crop} onChange={(event) => setCrop(event.target.value as ImageCropMode)}>
                    <option value="none">{t.imageWorkbench.cropNone}</option>
                    <option value="square">{t.imageWorkbench.cropSquare}</option>
                    <option value="4:3">{t.imageWorkbench.cropFourThree}</option>
                    <option value="16:9">{t.imageWorkbench.cropSixteenNine}</option>
                  </Select>
                </Field>
                <Field label={t.imageWorkbench.rotation}>
                  <Select value={rotation} onChange={(event) => setRotation(Number(event.target.value) as ImageRotation)}>
                    <option value={0}>{t.imageWorkbench.rotateNone}</option>
                    <option value={90}>{t.imageWorkbench.rotateRight}</option>
                    <option value={180}>{t.imageWorkbench.rotateHalf}</option>
                    <option value={270}>{t.imageWorkbench.rotateLeft}</option>
                  </Select>
                </Field>
                <Field label={t.imageWorkbench.maxWidth}>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={12000}
                    value={maxWidth}
                    onChange={(event) => {
                      setPreset("custom");
                      setMaxWidth(Number(event.target.value));
                    }}
                  />
                </Field>
                <Field label={t.imageWorkbench.maxHeight}>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={12000}
                    value={maxHeight}
                    onChange={(event) => {
                      setPreset("custom");
                      setMaxHeight(Number(event.target.value));
                    }}
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
