import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Combine, FileWarning, Loader2, X } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, ErrorBox } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { getDocSummary, mergePdfs } from "../../lib/api";
import { saveRecent } from "../../lib/fileStore";
import { takeHandoff } from "../../lib/handoff";
import { formatBytes, pdfBlob, readFileBytes } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

interface MergeItem {
  id: number;
  file: File;
  bytes: Uint8Array;
  /** Null while the preview is still rendering. */
  pageCount: number | null;
  thumbnail: string | null;
}

let nextItemId = 1;

export default function Merge() {
  const t = useT();
  const [items, setItems] = useState<MergeItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OutputFile | null>(null);
  const dragIndex = useRef<number | null>(null);

  async function addFiles(files: File[]) {
    for (const file of files) {
      const id = nextItemId++;
      try {
        const bytes = await readFileBytes(file);
        setItems((prev) => [
          ...prev,
          { id, file, bytes, pageCount: null, thumbnail: null },
        ]);
        const summary = await getDocSummary(bytes);
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? { ...it, pageCount: summary.pageCount, thumbnail: summary.thumbnail }
              : it,
          ),
        );
        void saveRecent(file.name, bytes, summary.thumbnail);
      } catch {
        setError(t.merge.couldNotReadFile(file.name));
      }
    }
  }

  // Pick up a file handed off from another tool's result screen.
  useEffect(() => {
    const file = takeHandoff();
    if (file) void addFiles([file]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function move(index: number, to: number) {
    if (to < 0 || to >= items.length || to === index) return;
    setItems((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function run() {
    setBusy(true);
    setError("");
    try {
      const merged = await mergePdfs(items.map((it) => it.bytes));
      setResult({ name: "merged.pdf", blob: pdfBlob(merged) });
    } catch (err) {
      setError(errorText(err, t, t.merge.failed));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setItems([]);
    setResult(null);
    setError("");
  }

  return (
    <ToolPage>
      {result ? (
        <ResultPanel files={[result]} onReset={reset} />
      ) : (
        <div className="space-y-5">
          <Dropzone
            accept="application/pdf,.pdf"
            multiple
            compact={items.length > 0}
            onFiles={addFiles}
            hint={t.merge.hint}
          />

          {items.length > 0 && (
            <>
              <p className="text-sm text-slate-500">{t.merge.reorder}</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => (dragIndex.current = i)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      const from = dragIndex.current;
                      if (from !== null && from !== i) {
                        move(from, i);
                        dragIndex.current = i;
                      }
                    }}
                    onDragEnd={() => (dragIndex.current = null)}
                    className="group relative cursor-grab rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md active:cursor-grabbing"
                  >
                    <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {item.pageCount === null ? (
                        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                      ) : item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={`First page of ${item.file.name}`}
                          draggable={false}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="flex flex-col items-center gap-1 px-2 text-center text-amber-600">
                          <FileWarning className="h-6 w-6" />
                          <span className="text-[10px] font-semibold leading-tight">
                            {t.merge.cannotPreview}
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate text-xs font-semibold text-slate-800">
                      {item.file.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.pageCount !== null && item.pageCount > 0
                        ? t.common.pagesDot(item.pageCount)
                        : ""}
                      {formatBytes(item.file.size)}
                    </p>
                    <span className="absolute left-2 top-2 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        aria-label={t.merge.moveEarlier(item.file.name)}
                        disabled={i === 0}
                        onClick={() => move(i, i - 1)}
                        className="rounded-lg bg-white/95 p-1.5 text-slate-600 shadow ring-1 ring-slate-200 hover:text-indigo-600 disabled:opacity-40"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        aria-label={t.merge.moveLater(item.file.name)}
                        disabled={i === items.length - 1}
                        onClick={() => move(i, i + 1)}
                        className="rounded-lg bg-white/95 p-1.5 text-slate-600 shadow ring-1 ring-slate-200 hover:text-indigo-600 disabled:opacity-40"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        aria-label={t.fileList.remove(item.file.name)}
                        onClick={() =>
                          setItems((prev) => prev.filter((it) => it.id !== item.id))
                        }
                        className="rounded-lg bg-white/95 p-1.5 text-slate-600 shadow ring-1 ring-slate-200 hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <ErrorBox>{error}</ErrorBox>
              <Button onClick={run} busy={busy} disabled={items.length < 2}>
                <Combine className="h-4 w-4" />
                {t.merge.action(items.length)}
              </Button>
            </>
          )}
        </div>
      )}
    </ToolPage>
  );
}
