import { useEffect, useState } from "react";
import { FileCog } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, inputClass } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { readMetadata, writeMetadata } from "../../lib/api";
import { saveRecent } from "../../lib/fileStore";
import { takeHandoff } from "../../lib/handoff";
import type { PdfMetadata } from "../../lib/types";
import { baseName, pdfBlob, readFileBytes } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

const FIELD_KEYS: (keyof PdfMetadata)[] = [
  "title",
  "author",
  "subject",
  "keywords",
  "creator",
  "producer",
];

export default function Metadata() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [meta, setMeta] = useState<PdfMetadata | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OutputFile | null>(null);

  async function onFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    setError("");
    try {
      const data = await readFileBytes(f);
      setMeta(await readMetadata(data));
      setFile(f);
      setBytes(data);
      void saveRecent(f.name, data, null);
    } catch (err) {
      setError(errorText(err, t, t.errors.couldNotRead));
    }
  }

  // Pick up a file handed off from another tool's result screen.
  useEffect(() => {
    const handed = takeHandoff();
    if (handed) void onFiles([handed]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    if (!bytes || !file || !meta) return;
    setBusy(true);
    setError("");
    try {
      const out = await writeMetadata(bytes, meta);
      setResult({ name: `${baseName(file.name)}-metadata.pdf`, blob: pdfBlob(out) });
    } catch (err) {
      setError(errorText(err, t, t.metadata.failed));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setBytes(null);
    setMeta(null);
    setResult(null);
    setError("");
  }

  return (
    <ToolPage>
      {result ? (
        <ResultPanel files={[result]} onReset={reset} />
      ) : !file || !meta ? (
        <div className="space-y-4">
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={onFiles}
            hint={t.common.selectOnePdf}
          />
          <ErrorBox>{error}</ErrorBox>
        </div>
      ) : (
        <Card className="space-y-5">
          <p className="text-sm text-slate-500">{t.metadata.editing(file.name)}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELD_KEYS.map((key) => (
              <Field key={key} label={t.metadata[key]}>
                <input
                  className={inputClass}
                  value={meta[key]}
                  onChange={(e) => setMeta({ ...meta, [key]: e.target.value })}
                />
              </Field>
            ))}
          </div>
          <ErrorBox>{error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy}>
              <FileCog className="h-4 w-4" /> {t.metadata.action}
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
