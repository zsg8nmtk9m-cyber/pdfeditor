import { useState } from "react";
import { CheckCircle2, Download, FileText, RefreshCw } from "lucide-react";
import { Button, Card } from "./ui";
import { downloadBlob, formatBytes, makeZip } from "../lib/utils";
import type { OutputFile } from "../lib/utils";

interface ResultPanelProps {
  files: OutputFile[];
  /** Name used for the "download all" ZIP when there are multiple files. */
  zipName?: string;
  onReset: () => void;
  /** Extra line shown under the heading, e.g. compression stats. */
  note?: string;
}

export default function ResultPanel({ files, zipName = "files.zip", onReset, note }: ResultPanelProps) {
  const [zipping, setZipping] = useState(false);

  async function downloadAll() {
    setZipping(true);
    try {
      const zip = await makeZip(files, zipName);
      downloadBlob(zip.blob, zip.name);
    } finally {
      setZipping(false);
    }
  }

  return (
    <Card>
      <div className="mb-5 flex items-center gap-3">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Done!</h2>
          <p className="text-sm text-slate-500">
            {note ??
              (files.length === 1
                ? "Your file is ready to download."
                : `${files.length} files are ready to download.`)}
          </p>
        </div>
      </div>

      <ul className="mb-6 space-y-2">
        {files.map((f, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
          >
            <FileText className="h-5 w-5 shrink-0 text-indigo-500" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
              {f.name}
            </span>
            <span className="shrink-0 text-xs text-slate-400">{formatBytes(f.blob.size)}</span>
            <Button
              variant="secondary"
              className="!px-3 !py-1.5"
              onClick={() => downloadBlob(f.blob, f.name)}
            >
              <Download className="h-4 w-4" /> Download
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        {files.length > 1 && (
          <Button onClick={downloadAll} busy={zipping}>
            <Download className="h-4 w-4" /> Download all (ZIP)
          </Button>
        )}
        {files.length === 1 && (
          <Button onClick={() => downloadBlob(files[0].blob, files[0].name)}>
            <Download className="h-4 w-4" /> Download
          </Button>
        )}
        <Button variant="ghost" onClick={onReset}>
          <RefreshCw className="h-4 w-4" /> Start over
        </Button>
      </div>
    </Card>
  );
}
