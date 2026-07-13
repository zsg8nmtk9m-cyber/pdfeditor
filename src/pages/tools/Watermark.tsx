import { useState } from "react";
import { Stamp } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileSummary from "../../components/FileSummary";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, Select, inputClass } from "../../components/ui";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { addWatermark } from "../../lib/api";
import { baseName, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function Watermark() {
  const pdf = useSinglePdf();
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(20);
  const [color, setColor] = useState("#dc2626");
  const [diagonal, setDiagonal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputFile | null>(null);

  async function run() {
    if (!pdf.bytes || !pdf.file) return;
    if (!text.trim()) {
      pdf.setError("Enter the watermark text.");
      return;
    }
    setBusy(true);
    pdf.setError("");
    try {
      const bytes = await addWatermark(pdf.bytes, {
        text: text.trim(),
        fontSize,
        opacity: opacity / 100,
        color,
        diagonal,
      });
      setResult({
        name: `${baseName(pdf.file.name)}-watermarked.pdf`,
        blob: pdfBlob(bytes),
      });
    } catch (err) {
      pdf.setError(err instanceof Error ? err.message : "Watermarking failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    pdf.reset();
    setResult(null);
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
          <FileSummary
            name={pdf.file.name}
            size={pdf.file.size}
            pageCount={pdf.pageCount}
            thumbnail={pdf.summary?.thumbnail ?? null}
          />

          <Field label="Watermark text">
            <input
              className={inputClass}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. CONFIDENTIAL"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Font size — ${fontSize} pt`}>
              <input
                type="range"
                min={16}
                max={120}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </Field>
            <Field label={`Opacity — ${opacity}%`}>
              <input
                type="range"
                min={5}
                max={100}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </Field>
            <Field label="Color">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                />
                <span className="text-sm text-slate-500">{color}</span>
              </div>
            </Field>
            <Field label="Direction">
              <Select
                value={diagonal ? "diagonal" : "horizontal"}
                onChange={(e) => setDiagonal(e.target.value === "diagonal")}
              >
                <option value="diagonal">Diagonal</option>
                <option value="horizontal">Horizontal</option>
              </Select>
            </Field>
          </div>

          {/* Live preview over the document's real first page. The font size
              and diagonal angle are scaled from PDF points to preview pixels
              so what you see closely matches the output. */}
          <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 py-3">
            {pdf.summary?.thumbnail ? (
              <div className="relative h-full">
                <img
                  src={pdf.summary.thumbnail}
                  alt="First page"
                  className="h-full w-auto shadow-sm"
                />
                <span
                  className="absolute left-1/2 top-1/2 select-none whitespace-nowrap font-bold"
                  style={{
                    color,
                    opacity: opacity / 100,
                    fontSize: `${
                      fontSize * (232 / Math.max(pdf.summary.heightPts, 1))
                    }px`,
                    transform: `translate(-50%, -50%) rotate(${
                      diagonal
                        ? -Math.round(
                            (Math.atan2(pdf.summary.heightPts, pdf.summary.widthPts) *
                              180) /
                              Math.PI,
                          )
                        : 0
                    }deg)`,
                  }}
                >
                  {text || "Preview"}
                </span>
              </div>
            ) : (
              <span
                className="select-none whitespace-nowrap font-bold"
                style={{
                  color,
                  opacity: opacity / 100,
                  fontSize: `${Math.min(fontSize, 60)}px`,
                  transform: diagonal ? "rotate(-45deg)" : undefined,
                }}
              >
                {text || "Preview"}
              </span>
            )}
            <span className="absolute bottom-2 right-3 text-[10px] uppercase tracking-wider text-slate-400">
              Preview
            </span>
          </div>

          <ErrorBox>{pdf.error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy}>
              <Stamp className="h-4 w-4" /> Add watermark
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
