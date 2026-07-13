import { useState } from "react";
import { FileCog } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, inputClass } from "../../components/ui";
import { readMetadata, writeMetadata } from "../../lib/api";
import type { PdfMetadata } from "../../lib/types";
import { baseName, pdfBlob, readFileBytes } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

const FIELDS: { key: keyof PdfMetadata; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "subject", label: "Subject" },
  { key: "keywords", label: "Keywords (comma separated)" },
  { key: "creator", label: "Creator application" },
  { key: "producer", label: "Producer" },
];

export default function Metadata() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this PDF.");
    }
  }

  async function run() {
    if (!bytes || !file || !meta) return;
    setBusy(true);
    setError("");
    try {
      const out = await writeMetadata(bytes, meta);
      setResult({ name: `${baseName(file.name)}-metadata.pdf`, blob: pdfBlob(out) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update metadata.");
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
            hint="Select one PDF file"
          />
          <ErrorBox>{error}</ErrorBox>
        </div>
      ) : (
        <Card className="space-y-5">
          <p className="text-sm text-slate-500">
            Editing metadata of{" "}
            <span className="font-semibold text-slate-800">{file.name}</span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map(({ key, label }) => (
              <Field key={key} label={label}>
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
              <FileCog className="h-4 w-4" /> Save metadata
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
