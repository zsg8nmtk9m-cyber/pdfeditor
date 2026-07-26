import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Crop as CropIcon, Loader2, Trash2 } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { cropPdf, renderPageImage } from "../../lib/api";
import type { CropArea, PageImage } from "../../lib/types";
import { baseName, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

const MAX_PAGE_WIDTH = 680;
/** Ignore accidental click-drags too small to be a real selection. */
const MIN_AREA_PTS = 8;

export default function CropTool() {
  const t = useT();
  const pdf = useSinglePdf();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageImage, setPageImage] = useState<PageImage | null>(null);
  const [area, setArea] = useState<CropArea | null>(null);
  const [draft, setDraft] = useState<CropArea | null>(null);
  const [allPages, setAllPages] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputFile | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef<CropArea | null>(null);

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

  function startDraw(e: React.PointerEvent) {
    if (!pageImage) return;
    e.preventDefault();
    const rect = surfaceRef.current!.getBoundingClientRect();
    const clampX = (v: number) => Math.min(Math.max(v, 0), pageImage.widthPts);
    const clampY = (v: number) => Math.min(Math.max(v, 0), pageImage.heightPts);
    const origin = {
      x: clampX((e.clientX - rect.left) / scale),
      y: clampY((e.clientY - rect.top) / scale),
    };
    const surface = e.currentTarget as HTMLElement;
    surface.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const cx = clampX((ev.clientX - rect.left) / scale);
      const cy = clampY((ev.clientY - rect.top) / scale);
      const d: CropArea = {
        x: Math.min(origin.x, cx),
        y: Math.min(origin.y, cy),
        w: Math.abs(cx - origin.x),
        h: Math.abs(cy - origin.y),
      };
      draftRef.current = d;
      setDraft(d);
    };
    const onUp = () => {
      surface.removeEventListener("pointermove", onMove);
      const d = draftRef.current;
      draftRef.current = null;
      setDraft(null);
      if (d && d.w >= MIN_AREA_PTS && d.h >= MIN_AREA_PTS) setArea(d);
    };
    surface.addEventListener("pointermove", onMove);
    surface.addEventListener("pointerup", onUp, { once: true });
  }

  async function run() {
    if (!pdf.bytes || !pdf.file || !area) return;
    setBusy(true);
    pdf.setError("");
    try {
      const bytes = await cropPdf(pdf.bytes, area, allPages ? undefined : [pageIndex]);
      setResult({ name: `${baseName(pdf.file.name)}-cropped.pdf`, blob: pdfBlob(bytes) });
    } catch (err) {
      pdf.setError(errorText(err, t, t.crop.failed));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    pdf.reset();
    setResult(null);
    setArea(null);
    setDraft(null);
    draftRef.current = null;
    setAllPages(true);
    setPageIndex(0);
  }

  const shown = draft ?? area;

  if (result) {
    return (
      <ToolPage>
        <ResultPanel files={[result]} onReset={reset} />
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
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <p className="text-sm text-slate-600">
                {area
                  ? t.crop.selection(Math.round(area.w), Math.round(area.h))
                  : t.crop.instruction}
              </p>
              <div className="flex items-center gap-4 text-sm text-slate-700">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="crop-scope"
                    checked={allPages}
                    onChange={() => setAllPages(true)}
                    className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {t.crop.allPages}
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="crop-scope"
                    checked={!allPages}
                    onChange={() => setAllPages(false)}
                    className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {t.crop.thisPage}
                </label>
              </div>
              <div className="ml-auto flex items-center gap-3">
                {area && (
                  <Button variant="ghost" onClick={() => setArea(null)}>
                    <Trash2 className="h-4 w-4" /> {t.crop.clear}
                  </Button>
                )}
                <Button variant="ghost" onClick={reset}>
                  {t.common.chooseAnotherFile}
                </Button>
                <Button onClick={run} busy={busy} disabled={!area}>
                  <CropIcon className="h-4 w-4" /> {t.crop.action}
                </Button>
              </div>
            </div>
          </Card>

          <p className="rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-800 ring-1 ring-sky-200">
            {t.crop.note}
          </p>

          <ErrorBox>{pdf.error}</ErrorBox>

          <div className="overflow-x-auto">
            {!pageImage ? (
              <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
              </div>
            ) : (
              <div
                ref={surfaceRef}
                data-testid="crop-surface"
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
                {shown && (
                  <>
                    {/* Dim everything outside the kept area. */}
                    {[
                      { left: 0, top: 0, width: "100%", height: shown.y * scale },
                      {
                        left: 0,
                        top: (shown.y + shown.h) * scale,
                        width: "100%",
                        height: (pageImage.heightPts - shown.y - shown.h) * scale,
                      },
                      {
                        left: 0,
                        top: shown.y * scale,
                        width: shown.x * scale,
                        height: shown.h * scale,
                      },
                      {
                        left: (shown.x + shown.w) * scale,
                        top: shown.y * scale,
                        width: (pageImage.widthPts - shown.x - shown.w) * scale,
                        height: shown.h * scale,
                      },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className="pointer-events-none absolute bg-slate-900/50"
                        style={s}
                      />
                    ))}
                    <div
                      className="pointer-events-none absolute border-2 border-dashed border-indigo-500"
                      style={{
                        left: shown.x * scale,
                        top: shown.y * scale,
                        width: shown.w * scale,
                        height: shown.h * scale,
                      }}
                    />
                  </>
                )}
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
