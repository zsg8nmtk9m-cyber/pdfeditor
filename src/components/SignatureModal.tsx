import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine, Type, X } from "lucide-react";
import { useT } from "../i18n";
import { Button, inputClass } from "./ui";

export interface SignatureResult {
  dataUrl: string;
  /** Pixel size of the produced PNG (used for the initial aspect ratio). */
  width: number;
  height: number;
}

interface SignatureModalProps {
  onDone: (result: SignatureResult) => void;
  onClose: () => void;
}

const INK = "#1e293b";

/** Crop a canvas to the bounding box of its non-transparent pixels. */
function cropToInk(canvas: HTMLCanvasElement, padding = 8): HTMLCanvasElement | null {
  const ctx = canvas.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null; // nothing drawn
  const w = maxX - minX + 1 + padding * 2;
  const h = maxY - minY + 1 + padding * 2;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out
    .getContext("2d")!
    .drawImage(canvas, minX - padding, minY - padding, w, h, 0, 0, w, h);
  return out;
}

export default function SignatureModal({ onDone, onClose }: SignatureModalProps) {
  const t = useT();
  const [tab, setTab] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = INK;
  }, [tab]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
      y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
    };
  }

  function useDrawn() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cropped = cropToInk(canvas);
    if (!cropped) return;
    onDone({
      dataUrl: cropped.toDataURL("image/png"),
      width: cropped.width,
      height: cropped.height,
    });
  }

  function useTyped() {
    const text = typed.trim();
    if (!text) return;
    const fontPx = 64;
    const fontSpec = `${fontPx}px "Brush Script MT", "Segoe Script", "Comic Sans MS", cursive`;
    const measure = document.createElement("canvas").getContext("2d")!;
    measure.font = fontSpec;
    const w = Math.ceil(measure.measureText(text).width) + 32;
    const h = fontPx * 1.6;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.font = fontSpec;
    ctx.fillStyle = INK;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 16, h / 2);
    const cropped = cropToInk(canvas) ?? canvas;
    onDone({
      dataUrl: cropped.toDataURL("image/png"),
      width: cropped.width,
      height: cropped.height,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{t.signature.title}</h2>
          <button
            aria-label={t.common.close}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setTab("draw")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === "draw"
                ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500"
                : "text-slate-600 ring-1 ring-slate-200 hover:ring-indigo-300"
            }`}
          >
            <PenLine className="h-4 w-4" /> {t.signature.draw}
          </button>
          <button
            onClick={() => setTab("type")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === "type"
                ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500"
                : "text-slate-600 ring-1 ring-slate-200 hover:ring-indigo-300"
            }`}
          >
            <Type className="h-4 w-4" /> {t.signature.type}
          </button>
        </div>

        {tab === "draw" ? (
          <>
            <canvas
              ref={canvasRef}
              width={480}
              height={180}
              data-testid="signature-canvas"
              className="w-full cursor-crosshair touch-none rounded-xl bg-slate-50 ring-1 ring-slate-200"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                drawing.current = true;
                const { x, y } = pos(e);
                const ctx = e.currentTarget.getContext("2d")!;
                ctx.beginPath();
                ctx.moveTo(x, y);
              }}
              onPointerMove={(e) => {
                if (!drawing.current) return;
                const { x, y } = pos(e);
                const ctx = e.currentTarget.getContext("2d")!;
                ctx.lineTo(x, y);
                ctx.stroke();
                setHasInk(true);
              }}
              onPointerUp={() => (drawing.current = false)}
            />
            <div className="mt-4 flex justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  const c = canvasRef.current!;
                  c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
                  setHasInk(false);
                }}
              >
                <Eraser className="h-4 w-4" /> {t.common.clear}
              </Button>
              <Button onClick={useDrawn} disabled={!hasInk}>
                {t.signature.use}
              </Button>
            </div>
          </>
        ) : (
          <>
            <input
              className={inputClass}
              placeholder={t.signature.typePlaceholder}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
            />
            <div className="mt-3 flex h-24 items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200">
              <span
                className="whitespace-nowrap text-4xl text-slate-800"
                style={{ fontFamily: '"Brush Script MT", "Segoe Script", "Comic Sans MS", cursive' }}
              >
                {typed || t.signature.previewFallback}
              </span>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={useTyped} disabled={!typed.trim()}>
                {t.signature.use}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
