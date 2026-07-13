import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, PenLine, Trash2, Type } from "lucide-react";
import Dropzone from "../../components/Dropzone";
import ResultPanel from "../../components/ResultPanel";
import SignatureModal from "../../components/SignatureModal";
import type { SignatureResult } from "../../components/SignatureModal";
import ToolPage from "../../components/ToolPage";
import { Button, Card, ErrorBox, Select } from "../../components/ui";
import { useSinglePdf } from "../../hooks/useSinglePdf";
import { annotatePdf, renderPageImage } from "../../lib/api";
import type { AnnotationElement, PageImage } from "../../lib/types";
import { TEXT_LINE_HEIGHT } from "../../lib/types";
import { baseName, pdfBlob } from "../../lib/utils";
import type { OutputFile } from "../../lib/utils";

interface EditorElement extends AnnotationElement {
  id: number;
}

const FONT_SIZES = [12, 16, 20, 28, 36];
const MAX_PAGE_WIDTH = 680;

export default function Annotate() {
  const pdf = useSinglePdf();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageImage, setPageImage] = useState<PageImage | null>(null);
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [signing, setSigning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutputFile | null>(null);
  const nextId = useRef(1);
  const editRef = useRef<HTMLDivElement | null>(null);
  // Live typed content of the element being edited. contentEditable DOM is
  // owned by the browser while editing; React state only updates on commit.
  const editingText = useRef("");

  // Render the current page whenever the file or page changes.
  useEffect(() => {
    if (!pdf.bytes) {
      setPageImage(null);
      return;
    }
    let alive = true;
    setPageImage(null);
    renderPageImage(pdf.bytes, pageIndex, 2)
      .then((img) => alive && setPageImage(img))
      .catch(() => alive && pdf.setError("Could not render this page."));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf.bytes, pageIndex]);

  // Focus the text editor and select its content when entering edit mode.
  useEffect(() => {
    const node = editRef.current;
    if (editingId === null || !node) return;
    node.focus();
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(node);
      selection.addRange(range);
    }
  }, [editingId]);

  // Delete the selected element with the keyboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editingId !== null || selectedId === null) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setElements((prev) => prev.filter((el) => el.id !== selectedId));
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, editingId]);

  const scale = pageImage ? Math.min(MAX_PAGE_WIDTH / pageImage.widthPts, 1.4) : 1;
  const selected = elements.find((el) => el.id === selectedId) ?? null;

  function update(id: number, patch: Partial<EditorElement>) {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  }

  function startEditing(el: EditorElement) {
    editingText.current = el.text ?? "";
    setEditingId(el.id);
  }

  /** Commit the in-progress text edit (if any) into React state. */
  function commitEdit() {
    if (editingId === null) return;
    update(editingId, { text: editingText.current });
    setEditingId(null);
  }

  function addText() {
    if (!pageImage) return;
    const el: EditorElement = {
      id: nextId.current++,
      pageIndex,
      kind: "text",
      x: pageImage.widthPts / 2 - 40,
      y: pageImage.heightPts / 2 - 10,
      w: 0,
      h: 0,
      text: "Text",
      fontSize: 16,
      color: "#111827",
    };
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
    startEditing(el);
  }

  function addSignature(sig: SignatureResult) {
    if (!pageImage) return;
    const w = Math.min(180, pageImage.widthPts * 0.5);
    const h = (w * sig.height) / sig.width;
    const el: EditorElement = {
      id: nextId.current++,
      pageIndex,
      kind: "image",
      x: pageImage.widthPts / 2 - w / 2,
      y: pageImage.heightPts / 2 - h / 2,
      w,
      h,
      imageDataUrl: sig.dataUrl,
    };
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
    setSigning(false);
  }

  function startDrag(e: React.PointerEvent<HTMLElement>, el: EditorElement) {
    if (editingId === el.id || !pageImage) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(el.id);
    const target = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x: el.x, y: el.y };
    target.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      update(el.id, {
        x: Math.min(Math.max(orig.x + (ev.clientX - startX) / scale, 0), pageImage.widthPts - 24),
        y: Math.min(Math.max(orig.y + (ev.clientY - startY) / scale, 0), pageImage.heightPts - 24),
      });
    };
    const onUp = () => target.removeEventListener("pointermove", onMove);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp, { once: true });
  }

  function startResize(e: React.PointerEvent<HTMLElement>, el: EditorElement) {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget;
    const startX = e.clientX;
    const orig = { w: el.w, h: el.h };
    target.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      const w = Math.max(24, orig.w + (ev.clientX - startX) / scale);
      update(el.id, { w, h: (w * orig.h) / orig.w });
    };
    const onUp = () => target.removeEventListener("pointermove", onMove);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp, { once: true });
  }

  async function run() {
    if (!pdf.bytes || !pdf.file) return;
    // Flush any in-progress text edit; state updates are async, so build the
    // exported list from the ref directly.
    const finalElements =
      editingId === null
        ? elements
        : elements.map((el) =>
            el.id === editingId ? { ...el, text: editingText.current } : el,
          );
    commitEdit();
    setBusy(true);
    pdf.setError("");
    try {
      const bytes = await annotatePdf(
        pdf.bytes,
        finalElements.map(({ id: _id, ...rest }) => rest),
      );
      setResult({ name: `${baseName(pdf.file.name)}-signed.pdf`, blob: pdfBlob(bytes) });
    } catch (err) {
      pdf.setError(err instanceof Error ? err.message : "Could not apply the changes.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    pdf.reset();
    setResult(null);
    setElements([]);
    setSelectedId(null);
    setEditingId(null);
    setPageIndex(0);
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
        <div className="space-y-4">
          <Card className="!p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={addText}>
                <Type className="h-4 w-4" /> Add text
              </Button>
              <Button variant="secondary" onClick={() => setSigning(true)}>
                <PenLine className="h-4 w-4" /> Add signature
              </Button>

              {selected?.kind === "text" && (
                <>
                  <Select
                    aria-label="Font size"
                    className="!w-28"
                    value={selected.fontSize}
                    onChange={(e) => update(selected.id, { fontSize: Number(e.target.value) })}
                  >
                    {FONT_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s} pt
                      </option>
                    ))}
                  </Select>
                  <input
                    type="color"
                    aria-label="Text color"
                    value={selected.color}
                    onChange={(e) => update(selected.id, { color: e.target.value })}
                    className="h-9 w-11 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                  />
                </>
              )}
              {selected && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setElements((prev) => prev.filter((el) => el.id !== selected.id));
                    setSelectedId(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}

              <div className="ml-auto flex items-center gap-3">
                <Button variant="ghost" onClick={reset}>
                  Choose another file
                </Button>
                <Button onClick={run} busy={busy} disabled={elements.length === 0}>
                  Apply & download
                </Button>
              </div>
            </div>
          </Card>

          <ErrorBox>{pdf.error}</ErrorBox>

          <div className="overflow-x-auto">
            {!pageImage ? (
              <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
              </div>
            ) : (
              <div
                className="relative mx-auto select-none bg-white shadow-md ring-1 ring-slate-200"
                style={{
                  width: pageImage.widthPts * scale,
                  height: pageImage.heightPts * scale,
                }}
                onPointerDown={() => {
                  commitEdit();
                  setSelectedId(null);
                }}
              >
                <img
                  src={pageImage.dataUrl}
                  alt={`Page ${pageIndex + 1}`}
                  draggable={false}
                  className="absolute inset-0 h-full w-full"
                />
                {elements
                  .filter((el) => el.pageIndex === pageIndex)
                  .map((el) =>
                    el.kind === "text" ? (
                      <div
                        // Remount when toggling edit mode so React never has
                        // to reconcile DOM the browser mutated while editing.
                        key={`${el.id}:${editingId === el.id ? "edit" : "view"}`}
                        data-annot="text"
                        ref={editingId === el.id ? editRef : undefined}
                        contentEditable={editingId === el.id}
                        suppressContentEditableWarning
                        onPointerDown={(e) => startDrag(e, el)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditing(el);
                        }}
                        onInput={(e) => {
                          editingText.current = e.currentTarget.innerText;
                        }}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") commitEdit();
                        }}
                        className={`absolute whitespace-pre px-0.5 outline-none ${
                          editingId === el.id
                            ? "cursor-text ring-2 ring-indigo-500"
                            : "cursor-move"
                        } ${
                          selectedId === el.id && editingId !== el.id
                            ? "ring-2 ring-indigo-400"
                            : ""
                        }`}
                        style={{
                          left: el.x * scale,
                          top: el.y * scale,
                          fontSize: (el.fontSize ?? 16) * scale,
                          lineHeight: TEXT_LINE_HEIGHT,
                          color: el.color,
                          fontFamily: "Helvetica, Arial, sans-serif",
                        }}
                      >
                        {el.text}
                      </div>
                    ) : (
                      <div
                        key={el.id}
                        data-annot="image"
                        onPointerDown={(e) => startDrag(e, el)}
                        className={`absolute cursor-move ${
                          selectedId === el.id ? "ring-2 ring-indigo-400" : ""
                        }`}
                        style={{
                          left: el.x * scale,
                          top: el.y * scale,
                          width: el.w * scale,
                          height: el.h * scale,
                        }}
                      >
                        <img
                          src={el.imageDataUrl}
                          alt="Signature"
                          draggable={false}
                          className="h-full w-full"
                        />
                        {selectedId === el.id && (
                          <span
                            aria-label="Resize signature"
                            onPointerDown={(e) => startResize(e, el)}
                            className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full bg-indigo-600 ring-2 ring-white"
                          />
                        )}
                      </div>
                    ),
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
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-sm font-medium text-slate-600">
                Page {pageIndex + 1} of {pdf.pageCount}
              </span>
              <Button
                variant="secondary"
                className="!px-3 !py-1.5"
                disabled={pageIndex === pdf.pageCount - 1}
                onClick={() => setPageIndex((p) => p + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-slate-400">
            Drag elements to move them · double-click text to edit ·{" "}
            {elements.length} element{elements.length === 1 ? "" : "s"} placed
          </p>

          {signing && (
            <SignatureModal onDone={addSignature} onClose={() => setSigning(false)} />
          )}
        </div>
      )}
    </ToolPage>
  );
}
