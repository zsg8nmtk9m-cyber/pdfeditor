import { useState } from "react";
import { Images } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, ProgressBar, Select } from "../../components/ui";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { pdfToImages } from "../../lib/ops";
import { baseName } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function PdfToImages() {
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
      pdf.setError(err instanceof Error ? err.message : "Conversion failed.");
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Image format">
              <Select value={format} onChange={(e) => setFormat(e.target.value as "png" | "jpeg")}>
                <option value="png">PNG (lossless)</option>
                <option value="jpeg">JPG (smaller files)</option>
              </Select>
            </Field>
            <Field label="Resolution">
              <Select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
                <option value={1}>Standard (72 dpi)</option>
                <option value={2}>High (144 dpi)</option>
                <option value={3}>Very high (216 dpi)</option>
              </Select>
            </Field>
          </div>

          {busy && <ProgressBar value={progress} />}
          <ErrorBox>{pdf.error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy}>
              <Images className="h-4 w-4" /> Convert to images
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
