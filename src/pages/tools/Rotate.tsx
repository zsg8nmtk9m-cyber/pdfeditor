import { useState } from "react";
import { RotateCw } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, inputClass } from "../../components/ui";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { rotatePdf } from "../../lib/api";
import { baseName, parsePageRanges, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

const ANGLES = [
  { value: 90, label: "90° right" },
  { value: 180, label: "180°" },
  { value: 270, label: "90° left" },
] as const;

export default function Rotate() {
  const pdf = useSinglePdf();
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [scope, setScope] = useState<"all" | "range">("all");
  const [rangeText, setRangeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputFile | null>(null);

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
        <Card className="space-y-5">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{pdf.file.name}</span> —{" "}
            {pdf.pageCount} page{pdf.pageCount === 1 ? "" : "s"}
          </p>

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
                  onChange={(e) => setRangeText(e.target.value)}
                />
              )}
            </div>
          </Field>

          <ErrorBox>{pdf.error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy}>
              <RotateCw className="h-4 w-4" /> Rotate PDF
            </Button>
            <Button variant="ghost" onClick={reset}>
              Choose another file
            </Button>
          </div>
        </Card>
      )}
    </ToolPage>
  );
}
