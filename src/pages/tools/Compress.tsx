import { useState } from "react";
import { FileArchive } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileSummary from "../../components/FileSummary";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, ProgressBar } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { compressPdf } from "../../lib/api";
import { COMPRESS_PRESETS } from "../../lib/types";
import type { CompressPreset } from "../../lib/types";
import { baseName, formatBytes, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function Compress() {
  const t = useT();
  const pdf = useSinglePdf();
  const [preset, setPreset] = useState<CompressPreset>("recommended");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ file: OutputFile; note: string } | null>(null);

  async function run() {
    if (!pdf.bytes || !pdf.file) return;
    setBusy(true);
    setProgress(0);
    pdf.setError("");
    try {
      const { dpi, quality } = COMPRESS_PRESETS[preset];
      const out = await compressPdf(pdf.bytes, { dpi, quality }, (done, total) =>
        setProgress(done / total),
      );
      const before = pdf.file.size;
      const after = out.byteLength;
      const saved = Math.max(0, Math.round((1 - after / before) * 100));
      setResult({
        file: { name: `${baseName(pdf.file.name)}-compressed.pdf`, blob: pdfBlob(out) },
        note:
          after < before
            ? t.compress.savings(formatBytes(before), formatBytes(after), saved)
            : t.compress.noSavings(formatBytes(before), formatBytes(after)),
      });
    } catch (err) {
      pdf.setError(errorText(err, t, t.compress.failed));
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
        <ResultPanel files={[result.file]} note={result.note} onReset={reset} />
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

          <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">
            {t.compress.note}
          </p>

          {busy && <ProgressBar value={progress} />}
          <ErrorBox>{pdf.error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy}>
              <FileArchive className="h-4 w-4" /> {t.compress.action}
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
