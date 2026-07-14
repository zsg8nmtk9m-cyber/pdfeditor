import { useState } from "react";
import { Lock } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileSummary from "../../components/FileSummary";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, inputClass } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { protectPdf } from "../../lib/api";
import { baseName, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function Protect() {
  const t = useT();
  const pdf = useSinglePdf();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputFile | null>(null);

  async function run() {
    if (!pdf.bytes || !pdf.file) return;
    if (password.length < 4) {
      pdf.setError(t.protect.tooShort);
      return;
    }
    if (password !== confirm) {
      pdf.setError(t.protect.mismatch);
      return;
    }
    setBusy(true);
    pdf.setError("");
    try {
      const bytes = await protectPdf(pdf.bytes, password);
      setResult({ name: `${baseName(pdf.file.name)}-protected.pdf`, blob: pdfBlob(bytes) });
    } catch (err) {
      pdf.setError(errorText(err, t, t.protect.failed));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    pdf.reset();
    setResult(null);
    setPassword("");
    setConfirm("");
  }

  return (
    <ToolPage>
      {result ? (
        <ResultPanel files={[result]} note={t.protect.resultNote} onReset={reset} />
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
            <Field label={t.protect.password}>
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field label={t.protect.repeat}>
              <input
                type="password"
                className={inputClass}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 ring-1 ring-slate-200">
            {t.protect.note}
          </p>
          <ErrorBox>{pdf.error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy}>
              <Lock className="h-4 w-4" /> {t.protect.action}
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
