import { useState } from "react";
import { Layers } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileList from "../../components/FileList";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  ProgressBar,
  Select,
  inputClass,
} from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { addWatermark, compressPdf, rotatePdf } from "../../lib/api";
import { COMPRESS_PRESETS } from "../../lib/types";
import type { CompressPreset } from "../../lib/types";
import { baseName, pdfBlob, readFileBytes } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

type Operation = "compress" | "rotate" | "watermark";

export default function Batch() {
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [op, setOp] = useState<Operation>("compress");

  // Per-operation options.
  const [preset, setPreset] = useState<CompressPreset>("recommended");
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [wmText, setWmText] = useState("CONFIDENTIAL");
  const [wmSize, setWmSize] = useState(48);
  const [wmOpacity, setWmOpacity] = useState(20);
  const [wmColor, setWmColor] = useState("#dc2626");
  const [wmDiagonal, setWmDiagonal] = useState(true);

  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ files: OutputFile[]; note: string } | null>(null);

  const operations: { id: Operation; label: string }[] = [
    { id: "compress", label: t.batch.opCompress },
    { id: "rotate", label: t.batch.opRotate },
    { id: "watermark", label: t.batch.opWatermark },
  ];

  const angles = [
    { value: 90, label: t.rotate.right90 },
    { value: 180, label: t.rotate.deg180 },
    { value: 270, label: t.rotate.left90 },
  ] as const;

  /** Run the chosen operation on a single file's bytes. */
  async function processOne(bytes: Uint8Array): Promise<{ out: Uint8Array; suffix: string }> {
    if (op === "compress") {
      const { dpi, quality } = COMPRESS_PRESETS[preset];
      return { out: await compressPdf(bytes, { dpi, quality }), suffix: "compressed" };
    }
    if (op === "rotate") {
      return { out: await rotatePdf(bytes, angle), suffix: "rotated" };
    }
    return {
      out: await addWatermark(bytes, {
        text: wmText.trim(),
        fontSize: wmSize,
        opacity: wmOpacity / 100,
        color: wmColor,
        diagonal: wmDiagonal,
      }),
      suffix: "watermarked",
    };
  }

  async function run() {
    if (op === "watermark" && !wmText.trim()) {
      setError(t.watermark.emptyText);
      return;
    }
    setBusy(true);
    setError("");
    setCurrent(0);

    const outputs: OutputFile[] = [];
    let skipped = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        setCurrent(i + 1);
        const file = files[i];
        try {
          // Each file is read and processed in turn; the worker serializes
          // the heavy work so the tab stays responsive throughout.
          const bytes = await readFileBytes(file);
          const { out, suffix } = await processOne(bytes);
          outputs.push({ name: `${baseName(file.name)}-${suffix}.pdf`, blob: pdfBlob(out) });
        } catch {
          // A bad file (encrypted, corrupt) shouldn't sink the whole batch.
          skipped++;
        }
      }
      if (outputs.length === 0) {
        setError(t.batch.allSkipped);
        return;
      }
      setResult({ files: outputs, note: t.batch.doneNote(outputs.length, skipped) });
    } catch (err) {
      setError(errorText(err, t, t.batch.failed));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFiles([]);
    setResult(null);
    setError("");
    setCurrent(0);
  }

  if (result) {
    return (
      <ToolPage>
        <ResultPanel files={result.files} zipName={`batch-${op}.zip`} note={result.note} onReset={reset} />
      </ToolPage>
    );
  }

  return (
    <ToolPage>
      <div className="space-y-5">
        <Dropzone
          accept="application/pdf,.pdf"
          multiple
          compact={files.length > 0}
          onFiles={(f) => setFiles((prev) => [...prev, ...f])}
          hint={t.batch.hint}
        />

        {files.length > 0 && (
          <>
            <FileList
              files={files}
              onRemove={(i) => setFiles((prev) => prev.filter((_, j) => j !== i))}
            />

            <Card className="space-y-5">
              <Field label={t.batch.operation}>
                <div className="flex flex-wrap gap-3">
                  {operations.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setOp(o.id)}
                      className={`rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition-colors ${
                        op === o.id
                          ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500"
                          : "bg-white text-slate-700 ring-slate-200 hover:ring-indigo-300"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>

              {op === "compress" && (
                <div className="grid gap-3 sm:grid-cols-3">
                  {(Object.keys(COMPRESS_PRESETS) as CompressPreset[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setPreset(key)}
                      className={`rounded-xl px-4 py-3 text-left ring-1 transition-colors ${
                        preset === key
                          ? "bg-indigo-50 ring-2 ring-indigo-500"
                          : "bg-white ring-slate-200 hover:ring-indigo-300"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-slate-800">
                        {t.compress.presets[key].label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {t.compress.presets[key].hint}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {op === "rotate" && (
                <Field label={t.rotate.rotationLabel}>
                  <div className="flex flex-wrap gap-3">
                    {angles.map((a) => (
                      <button
                        key={a.value}
                        onClick={() => setAngle(a.value)}
                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition-colors ${
                          angle === a.value
                            ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500"
                            : "bg-white text-slate-700 ring-slate-200 hover:ring-indigo-300"
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              {op === "watermark" && (
                <div className="space-y-4">
                  <Field label={t.watermark.textLabel}>
                    <input
                      className={inputClass}
                      value={wmText}
                      onChange={(e) => setWmText(e.target.value)}
                      placeholder={t.watermark.placeholder}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t.watermark.fontSize(wmSize)}>
                      <input
                        type="range"
                        min={16}
                        max={120}
                        value={wmSize}
                        onChange={(e) => setWmSize(Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                    </Field>
                    <Field label={t.watermark.opacity(wmOpacity)}>
                      <input
                        type="range"
                        min={5}
                        max={100}
                        value={wmOpacity}
                        onChange={(e) => setWmOpacity(Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                    </Field>
                    <Field label={t.watermark.color}>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={wmColor}
                          onChange={(e) => setWmColor(e.target.value)}
                          className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                        />
                        <span className="text-sm text-slate-500">{wmColor}</span>
                      </div>
                    </Field>
                    <Field label={t.watermark.direction}>
                      <Select
                        value={wmDiagonal ? "diagonal" : "horizontal"}
                        onChange={(e) => setWmDiagonal(e.target.value === "diagonal")}
                      >
                        <option value="diagonal">{t.watermark.diagonal}</option>
                        <option value="horizontal">{t.watermark.horizontal}</option>
                      </Select>
                    </Field>
                  </div>
                </div>
              )}

              {busy && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600">
                    {t.batch.processing(current, files.length)}
                  </p>
                  <ProgressBar value={files.length ? current / files.length : 0} />
                </div>
              )}

              <ErrorBox>{error}</ErrorBox>

              <Button onClick={run} busy={busy} disabled={files.length === 0}>
                <Layers className="h-4 w-4" /> {t.batch.action(files.length)}
              </Button>
            </Card>
          </>
        )}
      </div>
    </ToolPage>
  );
}
