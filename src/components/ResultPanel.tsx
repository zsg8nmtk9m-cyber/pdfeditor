import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Download, FileText, RefreshCw } from "lucide-react";
import { Button, Card, Select } from "./ui";
import { useT } from "../i18n";
import { getDocSummary } from "../lib/api";
import { saveRecent } from "../lib/fileStore";
import { setHandoff } from "../lib/handoff";
import { TOOLS } from "../tools";
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
  const t = useT();
  const [zipping, setZipping] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // "Continue in another tool" applies to single-PDF results only.
  const canHandOff = files.length === 1 && files[0].name.toLowerCase().endsWith(".pdf");
  // Batch and images-to-pdf take many/non-PDF inputs, so a single-file
  // handoff into them makes no sense — leave them out of the target list.
  const handoffTools = TOOLS.filter(
    (t) => t.id !== "images-to-pdf" && t.id !== "batch" && t.path !== pathname,
  );

  async function downloadAll() {
    setZipping(true);
    try {
      const zip = await makeZip(files, zipName);
      downloadBlob(zip.blob, zip.name);
    } finally {
      setZipping(false);
    }
  }

  async function continueIn(path: string) {
    const bytes = new Uint8Array(await files[0].blob.arrayBuffer());
    setHandoff(files[0].name, bytes);
    try {
      const summary = await getDocSummary(bytes);
      await saveRecent(files[0].name, bytes, summary.thumbnail);
    } catch {
      // best-effort; handoff works regardless
    }
    navigate(path);
  }

  return (
    <Card>
      <div className="mb-5 flex items-center gap-3">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.common.done}</h2>
          <p className="text-sm text-slate-500">
            {note ?? (files.length === 1 ? t.result.oneReady : t.result.manyReady(files.length))}
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
              <Download className="h-4 w-4" /> {t.common.download}
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        {files.length > 1 && (
          <Button onClick={downloadAll} busy={zipping}>
            <Download className="h-4 w-4" /> {t.common.downloadAllZip}
          </Button>
        )}
        {files.length === 1 && (
          <Button onClick={() => downloadBlob(files[0].blob, files[0].name)}>
            <Download className="h-4 w-4" /> {t.common.download}
          </Button>
        )}
        <Button variant="ghost" onClick={onReset}>
          <RefreshCw className="h-4 w-4" /> {t.common.startOver}
        </Button>
        {canHandOff && (
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            <Select
              aria-label="Continue in another tool"
              className="!w-auto"
              value=""
              onChange={(e) => e.target.value && void continueIn(e.target.value)}
            >
              <option value="" disabled>
                {t.result.continueIn}
              </option>
              {handoffTools.map((tool) => (
                <option key={tool.id} value={tool.path}>
                  {t.tools[tool.id].name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
    </Card>
  );
}
