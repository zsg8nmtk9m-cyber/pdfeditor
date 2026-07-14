import { useState } from "react";
import { RotateCw } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import PageGrid, { ThumbnailsLoading } from "../../components/PageGrid";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, inputClass } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { usePageSelection, usePageThumbnails } from "../../hooks/usePageThumbnails";
import { rotatePdf } from "../../lib/api";
import {
  baseName,
  indicesToRangeText,
  parsePageRanges,
  pdfBlob,
  tryParseIndices,
} from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function Rotate() {
  const t = useT();
  const ANGLES = [
    { value: 90, label: t.rotate.right90 },
    { value: 180, label: t.rotate.deg180 },
    { value: 270, label: t.rotate.left90 },
  ] as const;
  const pdf = useSinglePdf();
  const { thumbs, progress } = usePageThumbnails(pdf.bytes);
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [scope, setScope] = useState<"all" | "range">("all");
  const [rangeText, setRangeText] = useState("");
  const selection = usePageSelection((next) => setRangeText(indicesToRangeText(next)));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputFile | null>(null);

  function onTextChange(value: string) {
    setRangeText(value);
    const indices = tryParseIndices(value, pdf.pageCount);
    if (indices) selection.replace(indices);
  }

  // Preview: rotate all thumbnails, or just the selected ones.
  function previewRotation(index: number): number {
    if (scope === "all") return angle;
    return selection.selected.has(index) ? angle : 0;
  }

  async function run() {
    if (!pdf.bytes || !pdf.file) return;
    setBusy(true);
    pdf.setError("");
    try {
      const pages =
        scope === "range"
          ? parsePageRanges(rangeText, pdf.pageCount).flat()
          : undefined;
      const bytes = await rotatePdf(pdf.bytes, angle, pages);
      setResult({ name: `${baseName(pdf.file.name)}-rotated.pdf`, blob: pdfBlob(bytes) });
    } catch (err) {
      pdf.setError(errorText(err, t, t.rotate.failed));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    pdf.reset();
    setResult(null);
    setRangeText("");
    setScope("all");
    selection.clear();
  }

  return (
    <ToolPage>
      {result ? (
        <ResultPanel files={[result]} onReset={reset} />
      ) : !pdf.file ? (
        <div className="space-y-4">
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={pdf.onFiles}
            hint={t.common.selectOnePdf}
          />
          <ErrorBox>{pdf.error}</ErrorBox>
        </div>
      ) : (
        <div className="space-y-5">
          <Card className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-800">{pdf.file.name}</span> —{" "}
                {t.common.pages(pdf.pageCount)}
              </p>
              <Button variant="ghost" onClick={reset}>
                {t.common.chooseAnotherFile}
              </Button>
            </div>

            <Field label={t.rotate.rotationLabel}>
              <div className="flex flex-wrap gap-3">
                {ANGLES.map((a) => (
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

            <Field label={t.rotate.applyTo}>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    checked={scope === "all"}
                    onChange={() => setScope("all")}
                    className="accent-indigo-600"
                  />
                  {t.rotate.allPages}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    checked={scope === "range"}
                    onChange={() => setScope("range")}
                    className="accent-indigo-600"
                  />
                  {t.rotate.specificPages}
                </label>
                {scope === "range" && (
                  <input
                    className={`${inputClass} max-w-48`}
                    placeholder={t.common.rangePlaceholder}
                    value={rangeText}
                    onChange={(e) => onTextChange(e.target.value)}
                  />
                )}
              </div>
            </Field>

            <ErrorBox>{pdf.error}</ErrorBox>
            <Button onClick={run} busy={busy}>
              <RotateCw className="h-4 w-4" /> {t.rotate.action}
            </Button>
          </Card>

          {!thumbs ? (
            <ThumbnailsLoading progress={progress} />
          ) : (
            <>
              <p className="text-sm text-slate-500">
                {scope === "range" ? t.rotate.hintSelected : t.rotate.hintAll}
              </p>
              <PageGrid
                thumbs={thumbs}
                rotation={previewRotation}
                {...(scope === "range"
                  ? { selected: selection.selected, onToggle: selection.toggle }
                  : {})}
              />
            </>
          )}
        </div>
      )}
    </ToolPage>
  );
}
