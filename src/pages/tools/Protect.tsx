import { useState } from "react";
import { Lock } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, inputClass } from "../../components/ui";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { protectPdf } from "../../lib/api";
import { baseName, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function Protect() {
  const pdf = useSinglePdf();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputFile | null>(null);

  async function run() {
    if (!pdf.bytes || !pdf.file) return;
    if (password.length < 4) {
      pdf.setError("Choose a password of at least 4 characters.");
      return;
    }
    if (password !== confirm) {
      pdf.setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    pdf.setError("");
    try {
      const bytes = await protectPdf(pdf.bytes, password);
      setResult({ name: `${baseName(pdf.file.name)}-protected.pdf`, blob: pdfBlob(bytes) });
    } catch (err) {
      pdf.setError(err instanceof Error ? err.message : "Encryption failed.");
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
        <ResultPanel
          files={[result]}
          note="Your PDF is now encrypted. Anyone opening it will need the password."
          onReset={reset}
        />
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password">
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Repeat password">
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
            The file is encrypted with AES. If you forget the password there is no way
            to recover the document — keep it somewhere safe.
          </p>
          <ErrorBox>{pdf.error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy}>
              <Lock className="h-4 w-4" /> Protect PDF
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
