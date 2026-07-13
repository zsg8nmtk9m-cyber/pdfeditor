import { useState } from "react";
import { ListOrdered } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileSummary from "../../components/FileSummary";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, Select, inputClass } from "../../components/ui";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { addPageNumbers } from "../../lib/api";
import type { NumberFormat, NumberPosition } from "../../lib/types";
import { baseName, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function PageNumbers() {
  const pdf = useSinglePdf();
  const [position, setPosition] = useState<NumberPosition>("bottom-center");
  const [format, setFormat] = useState<NumberFormat>("n");
  const [fontSize, setFontSize] = useState(11);
  const [startAt, setStartAt] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputFile | null>(null);

  async function run() {
    if (!pdf.bytes || !pdf.file) return;
    setBusy(true);
    pdf.setError("");
    try {
      const bytes = await addPageNumbers(pdf.bytes, {
        position,
        format,
        fontSize,
        startAt: Math.max(1, startAt),
      });
      setResult({ name: `${baseName(pdf.file.name)}-numbered.pdf`, blob: pdfBlob(bytes) });
    } catch (err) {
      pdf.setError(err instanceof Error ? err.message : "Numbering failed.");
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Position">
              <Select
                value={position}
                onChange={(e) => setPosition(e.target.value as NumberPosition)}
              >
                <option value="bottom-center">Bottom center</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
                <option value="top-center">Top center</option>
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
              </Select>
            </Field>
            <Field label="Format">
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value as NumberFormat)}
              >
                <option value="n">1, 2, 3…</option>
                <option value="n-of-total">1 / 12</option>
                <option value="page-n-of-total">Page 1 of 12</option>
              </Select>
            </Field>
            <Field label="Font size">
              <Select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
                <option value={9}>Small (9 pt)</option>
                <option value={11}>Normal (11 pt)</option>
                <option value={14}>Large (14 pt)</option>
              </Select>
            </Field>
            <Field label="Start counting at">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={startAt}
                onChange={(e) => setStartAt(Number(e.target.value) || 1)}
              />
            </Field>
          </div>

          <ErrorBox>{pdf.error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy}>
              <ListOrdered className="h-4 w-4" /> Add page numbers
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
