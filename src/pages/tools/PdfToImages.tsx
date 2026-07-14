import { useState } from "react";
import { Images } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileSummary from "../../components/FileSummary";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, ProgressBar, Select } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { pdfToImages } from "../../lib/api";
import { baseName } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function PdfToImages() {
  const t = useT();
  const pdf = useSinglePdf();
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<OutputFile[] | null>(null);

  async function run() {
    if (!pdf.bytes || !pdf.file) return;
    setBusy(true);
    setProgress(0);
    pdf.setError("");
    try {
      const blobs = await pdfToImages(
        pdf.bytes,
        { format, scale, quality: 0.9 },
        (done, total) => setProgress(done / total),
      );
      const base = baseName(pdf.file.name);
      const ext = format === "png" ? "png" : "jpg";
      setResults(
        blobs.map((blob, i) => ({ name: `${base}-page-${i + 1}.${ext}`, blob })),
      );
    } catch (err) {
      pdf.setError(errorText(err, t, t.pdfToImages.failed));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    pdf.reset();
    setResults(null);
  }

  if (results) {
    return (
      <ToolPage>
        <ResultPanel
          files={results}
          zipName={`${baseName(pdf.file?.name ?? "pdf")}-images.zip`}
          onReset={reset}
        />
      </ToolPage>
    );
  }

  return (
    <ToolPage>
      {!pdf.file ? (
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
            <Field label={t.pdfToImages.format}>
              <Select value={format} onChange={(e) => setFormat(e.target.value as "png" | "jpeg")}>
                <option value="png">{t.pdfToImages.formatPng}</option>
                <option value="jpeg">{t.pdfToImages.formatJpg}</option>
              </Select>
            </Field>
            <Field label={t.pdfToImages.resolution}>
              <Select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
                <option value={1}>{t.pdfToImages.resStandard}</option>
                <option value={2}>{t.pdfToImages.resHigh}</option>
                <option value={3}>{t.pdfToImages.resVeryHigh}</option>
              </Select>
            </Field>
          </div>

          {busy && <ProgressBar value={progress} />}
          <ErrorBox>{pdf.error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy}>
              <Images className="h-4 w-4" /> {t.pdfToImages.action}
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
