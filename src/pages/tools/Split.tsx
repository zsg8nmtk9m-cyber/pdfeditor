import { useState } from "react";
import { Scissors } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Field, inputClass } from "../../components/ui";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { extractPages } from "../../lib/ops";
import { baseName, parsePageRanges, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

type Mode = "ranges" | "extract" | "all";

export default function Split() {
  const pdf = useSinglePdf();
  const [mode, setMode] = useState<Mode>("ranges");
  const [rangeText, setRangeText] = useState("");
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
      hint: "Selected pages are combined into one PDF",
    },
    { id: "all", title: "Every page", hint: "Each page becomes its own PDF" },
  ];

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
      } else {
        const ranges = parsePageRanges(rangeText, pdf.pageCount);
        if (mode === "extract") {
          const bytes = await extractPages(pdf.bytes, ranges.flat());
          out.push({ name: `${base}-extracted.pdf`, blob: pdfBlob(bytes) });
        } else {
          for (let r = 0; r < ranges.length; r++) {
            const bytes = await extractPages(pdf.bytes, ranges[r]);
            const first = ranges[r][0] + 1;
            const last = ranges[r][ranges[r].length - 1] + 1;
            const span = first === last ? `page-${first}` : `pages-${first}-${last}`;
            out.push({ name: `${base}-${span}.pdf`, blob: pdfBlob(bytes) });
          }
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
        <Card className="space-y-5">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{pdf.file.name}</span> —{" "}
            {pdf.pageCount} page{pdf.pageCount === 1 ? "" : "s"}
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
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

          {mode !== "all" && (
            <Field label={mode === "ranges" ? "Page ranges" : "Pages to extract"}>
              <input
                className={inputClass}
                placeholder={`e.g. 1-3, 5, 8-${pdf.pageCount}`}
                value={rangeText}
                onChange={(e) => setRangeText(e.target.value)}
              />
            </Field>
          )}

          <ErrorBox>{pdf.error}</ErrorBox>
          <div className="flex gap-3">
            <Button onClick={run} busy={busy}>
              <Scissors className="h-4 w-4" /> Split PDF
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
