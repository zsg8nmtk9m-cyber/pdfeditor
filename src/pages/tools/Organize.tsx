import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCw, Trash2, Undo2 } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, ProgressBar } from "../../components/ui";
import { rebuildPdf, renderThumbnails } from "../../lib/api";
import { saveRecent } from "../../lib/fileStore";
import { takeHandoff } from "../../lib/handoff";
import { baseName, pdfBlob, readFileBytes } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

interface PageItem {
  id: number;
  srcIndex: number;
  rotation: number; // extra rotation in degrees
  thumb: string;
}

export default function Organize() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OutputFile | null>(null);
  const dragIndex = useRef<number | null>(null);

  async function onFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    setLoading(true);
    setError("");
    setProgress(0);
    try {
      const data = await readFileBytes(f);
      const thumbs = await renderThumbnails(data, 320, (done, total) =>
        setProgress(done / total),
      );
      setPages(
        thumbs.map((thumb, i) => ({ id: i, srcIndex: i, rotation: 0, thumb })),
      );
      setFile(f);
      setBytes(data);
      void saveRecent(f.name, data, thumbs[0] ?? null);
    } catch (err) {
      setError(
        err instanceof Error && /password/i.test(err.message)
          ? "This PDF is password-protected. Use the Unlock PDF tool first."
          : "Could not read this PDF.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Pick up a file handed off from another tool's result screen.
  useEffect(() => {
    const handed = takeHandoff();
    if (handed) void onFiles([handed]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function movePage(from: number, to: number) {
    if (to < 0 || to >= pages.length || from === to) return;
    setPages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function rotatePage(i: number) {
    setPages((prev) =>
      prev.map((p, j) => (j === i ? { ...p, rotation: (p.rotation + 90) % 360 } : p)),
    );
  }

  function deletePage(i: number) {
    setPages((prev) => prev.filter((_, j) => j !== i));
  }

  async function run() {
    if (!bytes || !file) return;
    setBusy(true);
    setError("");
    try {
      const out = await rebuildPdf(
        bytes,
        pages.map((p) => ({ srcIndex: p.srcIndex, rotation: p.rotation })),
      );
      setResult({ name: `${baseName(file.name)}-organized.pdf`, blob: pdfBlob(out) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rebuild the PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setBytes(null);
    setPages([]);
    setResult(null);
    setError("");
  }

  if (result) {
    return (
      <ToolPage>
        <ResultPanel files={[result]} onReset={reset} />
      </ToolPage>
    );
  }

  return (
    <ToolPage>
      {!file ? (
        <div className="space-y-4">
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={onFiles}
            hint="Select one PDF file"
          />
          {loading && (
            <Card>
              <p className="mb-2 text-sm font-medium text-slate-600">
                Rendering page previews…
              </p>
              <ProgressBar value={progress} />
            </Card>
          )}
          <ErrorBox>{error}</ErrorBox>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{file.name}</span> —{" "}
              {pages.length} page{pages.length === 1 ? "" : "s"} · drag to reorder
            </p>
            <Button variant="ghost" onClick={reset}>
              <Undo2 className="h-4 w-4" /> Choose another file
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {pages.map((page, i) => (
              <div
                key={page.id}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  const from = dragIndex.current;
                  if (from !== null && from !== i) {
                    movePage(from, i);
                    dragIndex.current = i;
                  }
                }}
                onDragEnd={() => (dragIndex.current = null)}
                className="group relative cursor-grab rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md active:cursor-grabbing"
              >
                <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                  <img
                    src={page.thumb}
                    alt={`Page ${i + 1}`}
                    draggable={false}
                    className="max-h-full max-w-full object-contain transition-transform"
                    style={{ transform: `rotate(${page.rotation}deg)` }}
                  />
                </div>
                <p className="mt-1.5 text-center text-xs font-medium text-slate-500">
                  {i + 1}
                  {page.rotation > 0 && (
                    <span className="ml-1 text-indigo-500">+{page.rotation}°</span>
                  )}
                </p>
                <div className="absolute inset-x-2 top-2 flex justify-between opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <div className="flex gap-1">
                    <button
                      aria-label={`Move page ${i + 1} left`}
                      onClick={() => movePage(i, i - 1)}
                      disabled={i === 0}
                      className="rounded-lg bg-white/95 p-1.5 text-slate-600 shadow ring-1 ring-slate-200 hover:text-indigo-600 disabled:opacity-40"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label={`Move page ${i + 1} right`}
                      onClick={() => movePage(i, i + 1)}
                      disabled={i === pages.length - 1}
                      className="rounded-lg bg-white/95 p-1.5 text-slate-600 shadow ring-1 ring-slate-200 hover:text-indigo-600 disabled:opacity-40"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      aria-label={`Rotate page ${i + 1}`}
                      onClick={() => rotatePage(i)}
                      className="rounded-lg bg-white/95 p-1.5 text-slate-600 shadow ring-1 ring-slate-200 hover:text-indigo-600"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label={`Delete page ${i + 1}`}
                      onClick={() => deletePage(i)}
                      className="rounded-lg bg-white/95 p-1.5 text-slate-600 shadow ring-1 ring-slate-200 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <ErrorBox>{error}</ErrorBox>
          <Button onClick={run} busy={busy} disabled={pages.length === 0}>
            <Check className="h-4 w-4" /> Apply changes
          </Button>
        </div>
      )}
    </ToolPage>
  );
}
