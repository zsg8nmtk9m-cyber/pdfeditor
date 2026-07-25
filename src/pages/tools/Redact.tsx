import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, EyeOff, Loader2, Trash2 } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, ProgressBar } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { redactPdf, renderPageImage } from "../../lib/api";
import type { PageImage, RedactionRect } from "../../lib/types";
import { baseName, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

interface Box extends RedactionRect {
  id: number;
}

const MAX_PAGE_WIDTH = 680;
/** Ignore accidental click-drags too small to be a real selection. */
const MIN_BOX_PTS = 4;

export default function Redact() {
  const t = useT();
  const pdf = useSinglePdf();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageImage, setPageImage] = useState<PageImage | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [draft, setDraft] = useState<Box | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OutputFile | null>(null);
  const nextId = useRef(1);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pdf.bytes) {
      setPageImage(null);
      return;
    }
    let alive = true;
    setPageImage(null);
    renderPageImage(pdf.bytes, pageIndex, 2)
      .then((img) => alive && setPageImage(img))
      .catch(() => alive && pdf.setError(t.annotate.renderFailed));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf.bytes, pageIndex]);

  const scale = pageImage ? Math.min(MAX_PAGE_WIDTH / pageImage.widthPts, 1.4) : 1;

  /** Pointer position in page points, clamped to the page. */
  function pointAt(e: React.PointerEvent): { x: number; y: number } {
    const rect = surfaceRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max((e.clientX - rect.left) / scale, 0), pageImage!.widthPts),
      y: Math.min(Math.max((e.clientY - rect.top) / scale, 0), pageImage!.heightPts),
    };
  }

  function startDraw(e: React.PointerEvent) {
    if (!pageImage) return;
    e.preventDefault();
    const origin = pointAt(e);
    const surface = e.currentTarget as HTMLElement;
    surface.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const rect = surfaceRef.current!.getBoundingClientRect();
      const cx = Math.min(Math.max((ev.clientX - rect.left) / scale, 0), pageImage.widthPts);
      const cy = Math.min(Math.max((ev.clientY - rect.top) / scale, 0), pageImage.heightPts);
      setDraft({
        id: -1,
        pageIndex,
        x: Math.min(origin.x, cx),
        y: Math.min(origin.y, cy),
        w: Math.abs(cx - origin.x),
        h: Math.abs(cy - origin.y),
      });
    };
    const onUp = () => {
      surface.removeEventListener("pointermove", onMove);
      setDraft((d) => {
        if (d && d.w >= MIN_BOX_PTS && d.h >= MIN_BOX_PTS) {
          setBoxes((prev) => [...prev, { ...d, id: nextId.current++ }]);
        }
        return null;
      });
    };
    surface.addEventListener("pointermove", onMove);
    surface.addEventListener("pointerup", onUp, { once: true });
  }

  async function run() {
    if (!pdf.bytes || !pdf.file) return;
    setBusy(true);
    setProgress(0);
    pdf.setError("");
    try {
      const bytes = await redactPdf(
        pdf.bytes,
        boxes.map(({ id: _id, ...rect }) => rect),
        150,
        (done, total) => setProgress(done / total),
      );
      setResult({ name: `${baseName(pdf.file.name)}-redacted.pdf`, blob: pdfBlob(bytes) });
    } catch (err) {
      pdf.setError(errorText(err, t, t.redact.failed));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    pdf.reset();
    setResult(null);
    setBoxes([]);
    setDraft(null);
    setPageIndex(0);
  }

  const onThisPage = boxes.filter((b) => b.pageIndex === pageIndex);

  if (result) {
    return (
      <ToolPage>
        <ResultPanel files={[result]} note={t.redact.resultNote} onReset={reset} />
      </ToolPage>
    );
  }

  return (
    <ToolPage>
      {!pdf.file ? (
        <div className="space-y-4">
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={pdf.onFiles}
            hint={t.common.selectOnePdf}
          />
          <ErrorBox>{pdf.error}</ErrorBox>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="!p-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-600">{t.redact.instruction}</p>
              <div className="ml-auto flex items-center gap-3">
                {boxes.length > 0 && (
                  <Button variant="ghost" onClick={() => setBoxes([])}>
                    <Trash2 className="h-4 w-4" /> {t.redact.clearAll}
                  </Button>
                )}
                <Button variant="ghost" onClick={reset}>
                  {t.common.chooseAnotherFile}
                </Button>
                <Button onClick={run} busy={busy} disabled={boxes.length === 0}>
                  <EyeOff className="h-4 w-4" /> {t.redact.action(boxes.length)}
                </Button>
              </div>
            </div>
          </Card>

          <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">
            {t.redact.note}
          </p>

          {busy && <ProgressBar value={progress} />}
          <ErrorBox>{pdf.error}</ErrorBox>

          <div className="overflow-x-auto">
            {!pageImage ? (
              <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
              </div>
            ) : (
              <div
                ref={surfaceRef}
                data-testid="redact-surface"
                onPointerDown={startDraw}
                className="relative mx-auto cursor-crosshair select-none touch-none bg-white shadow-md ring-1 ring-slate-200"
                style={{
                  width: pageImage.widthPts * scale,
                  height: pageImage.heightPts * scale,
                }}
              >
                <img
                  src={pageImage.dataUrl}
                  alt={t.pageGrid.pageAria(pageIndex + 1)}
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                />
                {[...onThisPage, ...(draft ? [draft] : [])].map((b) => (
                  <div
                    key={b.id}
                    className={`absolute bg-slate-900 ${
                      b.id === -1 ? "opacity-60" : "opacity-90"
                    }`}
                    style={{
                      left: b.x * scale,
                      top: b.y * scale,
                      width: b.w * scale,
                      height: b.h * scale,
                    }}
                  >
                    {b.id !== -1 && (
                      <button
                        aria-label={t.redact.removeBox}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setBoxes((prev) => prev.filter((x) => x.id !== b.id))}
                        className="absolute -right-2 -top-2 rounded-full bg-white p-0.5 text-slate-500 shadow ring-1 ring-slate-300 hover:text-rose-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {pdf.pageCount > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                className="!px-3 !py-1.5"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> {t.annotate.prev}
              </Button>
              <span className="text-sm font-medium text-slate-600">
                {t.annotate.pageOf(pageIndex + 1, pdf.pageCount)}
              </span>
              <Button
                variant="secondary"
                className="!px-3 !py-1.5"
                disabled={pageIndex === pdf.pageCount - 1}
                onClick={() => setPageIndex((p) => p + 1)}
              >
                {t.annotate.next} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
}
