import { useState } from "react";
import { ListOrdered } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import FileSummary from "../../components/FileSummary";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, Select, inputClass } from "../../components/ui";
import { errorText, useT } from "../../i18n";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { addPageNumbers } from "../../lib/api";
import type { NumberFormat, NumberPosition } from "../../lib/types";
import { baseName, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

/** Must match the margin used by addPageNumbers in lib/ops.ts. */
const MARGIN_PTS = 28;
const PREVIEW_HEIGHT_PX = 380;
/**
 * At true scale an 11 pt number on an A4 page is only ~5 px in the preview —
 * accurate but unreadable. Positions stay exact; the glyphs are floored to a
 * legible size so the user can actually see what they're placing.
 */
const MIN_LABEL_PX = 8;

export default function PageNumbers() {
  const t = useT();
  const pdf = useSinglePdf();
  const [position, setPosition] = useState<NumberPosition>("bottom-center");
  const [format, setFormat] = useState<NumberFormat>("n");
  const [fontSize, setFontSize] = useState(11);
  const [startAt, setStartAt] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputFile | null>(null);

  /** The label the first page will carry, mirroring numberLabel() in ops. */
  function previewLabel(): string {
    const total = pdf.pageCount + startAt - 1;
    if (format === "n") return String(startAt);
    if (format === "n-of-total") return `${startAt} / ${total}`;
    return `Page ${startAt} of ${total}`;
  }

  async function run() {
    if (!pdf.bytes || !pdf.file) return;
    setBusy(true);
    pdf.setError("");
    try {
      const bytes = await addPageNumbers(pdf.bytes, {
        position,
        format,
        fontSize,
        startAt: Math.max(1, startAt),
      });
      setResult({ name: `${baseName(pdf.file.name)}-numbered.pdf`, blob: pdfBlob(bytes) });
    } catch (err) {
      pdf.setError(errorText(err, t, t.pageNumbers.failed));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    pdf.reset();
    setResult(null);
  }

  return (
    <ToolPage>
      {result ? (
        <ResultPanel files={[result]} onReset={reset} />
      ) : !pdf.file ? (
        <div className="space-y-4">
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={pdf.onFiles}
            hint={t.common.selectOnePdf}
          />
          <ErrorBox>{pdf.error}</ErrorBox>
        </div>
      ) : (
        <Card className="space-y-5">
          <FileSummary
            name={pdf.file.name}
            size={pdf.file.size}
            pageCount={pdf.pageCount}
            thumbnail={pdf.summary?.thumbnail ?? null}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.pageNumbers.position}>
              <Select
                value={position}
                onChange={(e) => setPosition(e.target.value as NumberPosition)}
              >
                <option value="bottom-center">{t.pageNumbers.bottomCenter}</option>
                <option value="bottom-left">{t.pageNumbers.bottomLeft}</option>
                <option value="bottom-right">{t.pageNumbers.bottomRight}</option>
                <option value="top-center">{t.pageNumbers.topCenter}</option>
                <option value="top-left">{t.pageNumbers.topLeft}</option>
                <option value="top-right">{t.pageNumbers.topRight}</option>
              </Select>
            </Field>
            <Field label={t.pageNumbers.format}>
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value as NumberFormat)}
              >
                <option value="n">{t.pageNumbers.formatN}</option>
                <option value="n-of-total">{t.pageNumbers.formatNofTotal}</option>
                <option value="page-n-of-total">{t.pageNumbers.formatPageNofTotal}</option>
              </Select>
            </Field>
            <Field label={t.pageNumbers.fontSize}>
              <Select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
                <option value={9}>{t.pageNumbers.sizeSmall}</option>
                <option value={11}>{t.pageNumbers.sizeNormal}</option>
                <option value={14}>{t.pageNumbers.sizeLarge}</option>
              </Select>
            </Field>
            <Field label={t.pageNumbers.startAt}>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={startAt}
                onChange={(e) => setStartAt(Number(e.target.value) || 1)}
              />
            </Field>
          </div>

          {/* Live preview: the number is placed on the real first page at the
              same margin the export uses, with the safe-area guides shown. */}
          {pdf.summary?.thumbnail && pdf.summary.heightPts > 0 && (
            <div className="relative flex justify-center rounded-xl bg-slate-100 py-4 ring-1 ring-slate-200">
              <div
                className="relative shadow-sm"
                style={{
                  height: PREVIEW_HEIGHT_PX,
                  aspectRatio: `${pdf.summary.widthPts} / ${pdf.summary.heightPts}`,
                }}
              >
                <img
                  src={pdf.summary.thumbnail}
                  alt={t.pageGrid.firstPage}
                  className="h-full w-full"
                />
                {/* Margin guides */}
                <span
                  className="pointer-events-none absolute inset-0 border border-dashed border-indigo-300"
                  style={{
                    margin: `${(MARGIN_PTS / pdf.summary.heightPts) * PREVIEW_HEIGHT_PX}px ${
                      (MARGIN_PTS / pdf.summary.widthPts) *
                      PREVIEW_HEIGHT_PX *
                      (pdf.summary.widthPts / pdf.summary.heightPts)
                    }px`,
                  }}
                />
                <span
                  className="absolute whitespace-nowrap font-sans leading-none text-slate-700"
                  style={{
                    fontSize: Math.max(
                      MIN_LABEL_PX,
                      (fontSize / pdf.summary.heightPts) * PREVIEW_HEIGHT_PX,
                    ),
                    // Horizontal: left/right sit at the margin, center is centered.
                    ...(position.endsWith("left")
                      ? { left: `${(MARGIN_PTS / pdf.summary.widthPts) * 100}%` }
                      : position.endsWith("right")
                        ? { right: `${(MARGIN_PTS / pdf.summary.widthPts) * 100}%` }
                        : { left: "50%", transform: "translateX(-50%)" }),
                    // Vertical: distance of the text baseline from the page bottom.
                    bottom: position.startsWith("top")
                      ? `${((pdf.summary.heightPts - MARGIN_PTS) / pdf.summary.heightPts) * 100}%`
                      : `${((MARGIN_PTS - fontSize * 0.3) / pdf.summary.heightPts) * 100}%`,
                  }}
                >
                  {previewLabel()}
                </span>
              </div>
              <span className="absolute bottom-2 right-3 text-[10px] uppercase tracking-wider text-slate-400">
                {t.common.preview}
              </span>
            </div>
          )}

          <ErrorBox>{pdf.error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy}>
              <ListOrdered className="h-4 w-4" /> {t.pageNumbers.action}
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
