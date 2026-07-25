import { useState } from "react";
import { Download, FileText, GitCompare, X } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, ProgressBar } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { comparePdfs, imagesToPdf } from "../../lib/api";
import type { ComparePage } from "../../lib/types";
import { downloadBlob, formatBytes, pdfBlob, readFileBytes } from "../../lib/utils";

interface Side {
  file: File;
  bytes: Uint8Array;
}

/** Below this fraction of changed pixels a page is treated as identical. */
const NOISE_FLOOR = 0.0002;

function dataUrlToFile(dataUrl: string, name: string): File {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new File([bytes], name, { type: "image/png" });
}

export default function Compare() {
  const t = useT();
  const [a, setA] = useState<Side | null>(null);
  const [b, setB] = useState<Side | null>(null);
  const [pages, setPages] = useState<ComparePage[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  async function load(files: File[], which: "a" | "b") {
    const file = files[0];
    if (!file) return;
    setError("");
    setPages(null);
    try {
      const bytes = await readFileBytes(file);
      (which === "a" ? setA : setB)({ file, bytes });
    } catch {
      setError(t.errors.couldNotRead);
    }
  }

  async function run() {
    if (!a || !b) return;
    setBusy(true);
    setProgress(0);
    setError("");
    try {
      const result = await comparePdfs(a.bytes, b.bytes, 100, (done, total) =>
        setProgress(done / total),
      );
      setPages(result);
    } catch (err) {
      setError(errorText(err, t, t.compare.failed));
    } finally {
      setBusy(false);
    }
  }

  /** Build a PDF of the diff pages so the comparison can be shared. */
  async function exportReport() {
    if (!pages) return;
    setExporting(true);
    try {
      const images = changed.map((p) =>
        dataUrlToFile(p.diffDataUrl, `page-${p.pageIndex + 1}.png`),
      );
      const bytes = await imagesToPdf(images, { pageSize: "fit", margin: 0 });
      downloadBlob(pdfBlob(bytes), "comparison.pdf");
    } catch (err) {
      setError(errorText(err, t, t.compare.failed));
    } finally {
      setExporting(false);
    }
  }

  function reset() {
    setA(null);
    setB(null);
    setPages(null);
    setError("");
  }

  const changed = (pages ?? []).filter(
    (p) => p.onlyIn !== null || p.changedRatio > NOISE_FLOOR,
  );

  function slot(side: Side | null, which: "a" | "b", label: string) {
    return side ? (
      <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="truncate text-sm font-medium text-slate-800">{side.file.name}</p>
          <p className="text-xs text-slate-400">{formatBytes(side.file.size)}</p>
        </div>
        <button
          aria-label={t.fileList.remove(side.file.name)}
          onClick={() => {
            (which === "a" ? setA : setB)(null);
            setPages(null);
          }}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <Dropzone
          accept="application/pdf,.pdf"
          compact
          onFiles={(f) => void load(f, which)}
          hint={t.common.selectOnePdf}
        />
      </div>
    );
  }

  return (
    <ToolPage>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {slot(a, "a", t.compare.original)}
          {slot(b, "b", t.compare.revised)}
        </div>

        {busy && <ProgressBar value={progress} />}
        <ErrorBox>{error}</ErrorBox>

        {a && b && !pages && (
          <Button onClick={run} busy={busy}>
            <GitCompare className="h-4 w-4" /> {t.compare.action}
          </Button>
        )}

        {pages && (
          <>
            <Card className="flex flex-wrap items-center gap-4">
              <div className="flex-1">
                <p className="text-lg font-bold text-slate-900">
                  {changed.length === 0
                    ? t.compare.identical
                    : t.compare.summary(changed.length, pages.length)}
                </p>
                {changed.length > 0 && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <span className="inline-block h-3 w-3 rounded-sm bg-rose-600" />
                    {t.compare.legend}
                  </p>
                )}
              </div>
              {changed.length > 0 && (
                <Button variant="secondary" onClick={exportReport} busy={exporting}>
                  <Download className="h-4 w-4" /> {t.compare.exportReport}
                </Button>
              )}
              <Button variant="ghost" onClick={reset}>
                {t.common.startOver}
              </Button>
            </Card>

            {changed.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {changed.map((p) => (
                  <div
                    key={p.pageIndex}
                    className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200"
                  >
                    <img
                      src={p.diffDataUrl}
                      alt={t.pageGrid.pageAria(p.pageIndex + 1)}
                      className="w-full rounded-lg ring-1 ring-slate-100"
                    />
                    <p className="mt-2 flex items-center justify-between px-1 pb-1 text-xs">
                      <span className="font-semibold text-slate-700">
                        {t.pageGrid.pageAria(p.pageIndex + 1)}
                      </span>
                      <span className="text-slate-500">
                        {p.onlyIn === "a"
                          ? t.compare.onlyInOriginal
                          : p.onlyIn === "b"
                            ? t.compare.onlyInRevised
                            : t.compare.percentChanged(
                                Math.max(0.1, p.changedRatio * 100).toFixed(1),
                              )}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ToolPage>
  );
}
