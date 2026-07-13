import { useState } from "react";
import { RotateCw } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import PageGrid, { ThumbnailsLoading } from "../../components/PageGrid";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, inputClass } from "../../components/ui";
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

const ANGLES = [
  { value: 90, label: "90° right" },
  { value: 180, label: "180°" },
  { value: 270, label: "90° left" },
] as const;

export default function Rotate() {
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
      pdf.setError(err instanceof Error ? err.message : "Rotation failed.");
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
            hint="Select one PDF file"
          />
          <ErrorBox>{pdf.error}</ErrorBox>
        </div>
      ) : (
        <div className="space-y-5">
          <Card className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-800">{pdf.file.name}</span> —{" "}
                {pdf.pageCount} page{pdf.pageCount === 1 ? "" : "s"}
              </p>
              <Button variant="ghost" onClick={reset}>
                Choose another file
              </Button>
            </div>

            <Field label="Rotation">
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

            <Field label="Apply to">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    checked={scope === "all"}
                    onChange={() => setScope("all")}
                    className="accent-indigo-600"
                  />
                  All pages
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    checked={scope === "range"}
                    onChange={() => setScope("range")}
                    className="accent-indigo-600"
                  />
                  Specific pages
                </label>
                {scope === "range" && (
                  <input
                    className={`${inputClass} max-w-48`}
                    placeholder="e.g. 1, 3-5"
                    value={rangeText}
                    onChange={(e) => onTextChange(e.target.value)}
                  />
                )}
              </div>
            </Field>

            <ErrorBox>{pdf.error}</ErrorBox>
            <Button onClick={run} busy={busy}>
              <RotateCw className="h-4 w-4" /> Rotate PDF
            </Button>
          </Card>

          {!thumbs ? (
            <ThumbnailsLoading progress={progress} />
          ) : (
            <>
              <p className="text-sm text-slate-500">
                {scope === "range"
                  ? "Click the pages to rotate — the preview updates live."
                  : "Preview of the rotation applied to every page."}
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
