import { useState } from "react";
import { Unlock as UnlockIcon } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, inputClass } from "../../components/ui";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { isEncrypted, unlockPdf } from "../../lib/api";
import { baseName, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

export default function Unlock() {
  // probe: false — encrypted files can't be opened without the password.
  const pdf = useSinglePdf({ probe: false });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputFile | null>(null);

  async function run() {
    if (!pdf.bytes || !pdf.file) return;
    setBusy(true);
    pdf.setError("");
    try {
      if (!(await isEncrypted(pdf.bytes))) {
        pdf.setError("This PDF isn't password-protected — nothing to unlock.");
        return;
      }
      const bytes = await unlockPdf(pdf.bytes, password);
      setResult({ name: `${baseName(pdf.file.name)}-unlocked.pdf`, blob: pdfBlob(bytes) });
    } catch (err) {
      pdf.setError(err instanceof Error ? err.message : "Unlocking failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    pdf.reset();
    setResult(null);
    setPassword("");
  }

  return (
    <ToolPage>
      {result ? (
        <ResultPanel
          files={[result]}
          note="Password removed — this copy opens without a password."
          onReset={reset}
        />
      ) : !pdf.file ? (
        <div className="space-y-4">
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={pdf.onFiles}
            hint="Select a password-protected PDF"
          />
          <ErrorBox>{pdf.error}</ErrorBox>
        </div>
      ) : (
        <Card className="space-y-5">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{pdf.file.name}</span>
          </p>
          <Field label="Current password">
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter the document's password"
            />
          </Field>
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 ring-1 ring-slate-200">
            Only unlock documents you own or have permission to modify. The password
            is used locally to decrypt the file and is never sent anywhere.
          </p>
          <ErrorBox>{pdf.error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy} disabled={!password}>
              <UnlockIcon className="h-4 w-4" /> Unlock PDF
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
