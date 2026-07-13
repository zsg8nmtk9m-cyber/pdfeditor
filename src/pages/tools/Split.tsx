import { useMemo, useState } from "react";
import { Scissors } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import PageGrid, { ThumbnailsLoading } from "../../components/PageGrid";
import type { PageBadge } from "../../components/PageGrid";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, inputClass } from "../../components/ui";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { usePageSelection, usePageThumbnails } from "../../hooks/usePageThumbnails";
import { extractPages } from "../../lib/api";
import {
  baseName,
  indicesToRangeText,
  parsePageRanges,
  pdfBlob,
  tryParseIndices,
} from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

type Mode = "ranges" | "extract" | "all";

const RANGE_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-violet-500",
];

export default function Split() {
  const pdf = useSinglePdf();
  const { thumbs, progress } = usePageThumbnails(pdf.bytes);
  const [mode, setMode] = useState<Mode>("ranges");
  // rangeText is canonical; clicks mirror into it via the gesture callback.
  const [rangeText, setRangeText] = useState("");
  const selection = usePageSelection((next) => setRangeText(indicesToRangeText(next)));
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<OutputFile[] | null>(null);

  const modes: { id: Mode; title: string; hint: string }[] = [
    {
      id: "ranges",
      title: "Split by ranges",
      hint: "Each range becomes its own PDF, e.g. 1-3, 4-6",
    },
    {
      id: "extract",
      title: "Extract pages",
      hint: "Click pages below to pick them — they become one PDF",
    },
    { id: "all", title: "Every page", hint: "Each page becomes its own PDF" },
  ];

  function switchMode(next: Mode) {
    setMode(next);
    setRangeText("");
    selection.clear();
  }

  function onTextChange(value: string) {
    setRangeText(value);
    if (mode === "extract") {
      const indices = tryParseIndices(value, pdf.pageCount);
      if (indices) selection.replace(indices);
    }
  }

  // Live range→page mapping for the colored badges in "ranges" mode.
  const rangeBadges = useMemo(() => {
    if (mode !== "ranges" || !pdf.pageCount) return null;
    let ranges: number[][];
    try {
      ranges = parsePageRanges(rangeText, pdf.pageCount);
    } catch {
      return null;
    }
    const map = new Map<number, PageBadge>();
    ranges.forEach((range, r) => {
      for (const page of range) {
        if (!map.has(page)) {
          map.set(page, {
            label: `PDF ${r + 1}`,
            className: RANGE_COLORS[r % RANGE_COLORS.length],
          });
        }
      }
    });
    return map;
  }, [mode, rangeText, pdf.pageCount]);

  async function run() {
    if (!pdf.bytes || !pdf.file) return;
    setBusy(true);
    pdf.setError("");
    try {
      const base = baseName(pdf.file.name);
      const out: OutputFile[] = [];
      if (mode === "all") {
        for (let i = 0; i < pdf.pageCount; i++) {
          const bytes = await extractPages(pdf.bytes, [i]);
          out.push({ name: `${base}-page-${i + 1}.pdf`, blob: pdfBlob(bytes) });
        }
      } else if (mode === "extract") {
        if (!rangeText.trim())
          throw new Error("Click at least one page below (or type page numbers).");
        const indices = [...new Set(parsePageRanges(rangeText, pdf.pageCount).flat())].sort(
          (a, b) => a - b,
        );
        const bytes = await extractPages(pdf.bytes, indices);
        out.push({ name: `${base}-extracted.pdf`, blob: pdfBlob(bytes) });
      } else {
        const ranges = parsePageRanges(rangeText, pdf.pageCount);
        for (let r = 0; r < ranges.length; r++) {
          const bytes = await extractPages(pdf.bytes, ranges[r]);
          const first = ranges[r][0] + 1;
          const last = ranges[r][ranges[r].length - 1] + 1;
          const span = first === last ? `page-${first}` : `pages-${first}-${last}`;
          out.push({ name: `${base}-${span}.pdf`, blob: pdfBlob(bytes) });
        }
      }
      setResults(out);
    } catch (err) {
      pdf.setError(err instanceof Error ? err.message : "Splitting failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    pdf.reset();
    setResults(null);
    setRangeText("");
    selection.clear();
  }

  if (results) {
    return (
      <ToolPage>
        <ResultPanel
          files={results}
          zipName={`${baseName(pdf.file?.name ?? "split")}-split.zip`}
          onReset={reset}
        />
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
            hint="Select one PDF file"
          />
          <ErrorBox>{pdf.error}</ErrorBox>
        </div>
      ) : (
        <div className="space-y-5">
          <Card className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-800">{pdf.file.name}</span> —{" "}
                {pdf.pageCount} page{pdf.pageCount === 1 ? "" : "s"}
              </p>
              <Button variant="ghost" onClick={reset}>
                Choose another file
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => switchMode(m.id)}
                  className={`rounded-xl px-4 py-3 text-left ring-1 transition-colors ${
                    mode === m.id
                      ? "bg-indigo-50 ring-2 ring-indigo-500"
                      : "bg-white ring-slate-200 hover:ring-indigo-300"
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-800">{m.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{m.hint}</span>
                </button>
              ))}
            </div>

            {mode === "ranges" && (
              <Field label="Page ranges — each resulting PDF is highlighted below">
                <input
                  className={inputClass}
                  placeholder={`e.g. 1-3, 5, 8-${pdf.pageCount}`}
                  value={rangeText}
                  onChange={(e) => onTextChange(e.target.value)}
                />
              </Field>
            )}

            {mode === "extract" && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-56 flex-1">
                  <Field label="Selected pages — click thumbnails or type">
                    <input
                      className={inputClass}
                      placeholder="e.g. 1, 3-5"
                      value={rangeText}
                      onChange={(e) => onTextChange(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => selection.selectAll(pdf.pageCount)}
                  >
                    Select all
                  </Button>
                  <Button variant="secondary" onClick={selection.clear}>
                    Clear
                  </Button>
                </div>
              </div>
            )}

            <ErrorBox>{pdf.error}</ErrorBox>
            <Button onClick={run} busy={busy}>
              <Scissors className="h-4 w-4" /> Split PDF
            </Button>
          </Card>

          {!thumbs ? (
            <ThumbnailsLoading progress={progress} />
          ) : mode === "extract" ? (
            <>
              <p className="text-sm text-slate-500">
                Click pages to select them — hold{" "}
                <kbd className="rounded bg-slate-200 px-1">Shift</kbd> to select a range.
              </p>
              <PageGrid thumbs={thumbs} selected={selection.selected} onToggle={selection.toggle} />
            </>
          ) : (
            <PageGrid
              thumbs={thumbs}
              badge={mode === "ranges" ? (i) => rangeBadges?.get(i) ?? null : undefined}
            />
          )}
        </div>
      )}
    </ToolPage>
  );
}
