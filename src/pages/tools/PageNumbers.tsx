import { useState } from "react";
import { ListOrdered } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileSummary from "../../components/FileSummary";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, Select, inputClass } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { addPageNumbers } from "../../lib/api";
import type { NumberFormat, NumberPosition } from "../../lib/types";
import { baseName, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function PageNumbers() {
  const t = useT();
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
      pdf.setError(errorText(err, t, t.pageNumbers.failed));
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
            hint={t.common.selectOnePdf}
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
            <Field label={t.pageNumbers.position}>
              <Select
                value={position}
                onChange={(e) => setPosition(e.target.value as NumberPosition)}
              >
                <option value="bottom-center">{t.pageNumbers.bottomCenter}</option>
                <option value="bottom-left">{t.pageNumbers.bottomLeft}</option>
                <option value="bottom-right">{t.pageNumbers.bottomRight}</option>
                <option value="top-center">{t.pageNumbers.topCenter}</option>
                <option value="top-left">{t.pageNumbers.topLeft}</option>
                <option value="top-right">{t.pageNumbers.topRight}</option>
              </Select>
            </Field>
            <Field label={t.pageNumbers.format}>
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value as NumberFormat)}
              >
                <option value="n">{t.pageNumbers.formatN}</option>
                <option value="n-of-total">{t.pageNumbers.formatNofTotal}</option>
                <option value="page-n-of-total">{t.pageNumbers.formatPageNofTotal}</option>
              </Select>
            </Field>
            <Field label={t.pageNumbers.fontSize}>
              <Select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
                <option value={9}>{t.pageNumbers.sizeSmall}</option>
                <option value={11}>{t.pageNumbers.sizeNormal}</option>
                <option value={14}>{t.pageNumbers.sizeLarge}</option>
              </Select>
            </Field>
            <Field label={t.pageNumbers.startAt}>
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
              <ListOrdered className="h-4 w-4" /> {t.pageNumbers.action}
            </Button>
            <Button variant="ghost" onClick={reset}>
              {t.common.chooseAnotherFile}
            </Button>
          </div>
        </Card>
      )}
    </ToolPage>
  );
}
