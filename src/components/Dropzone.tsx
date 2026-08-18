import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { FileText, History, Trash2, UploadCloud } from "lucide-react";
import { useT } from "../i18n";
import { clearRecents, listRecents, loadRecent } from "../lib/fileStore";
import type { RecentFileMeta } from "../lib/fileStore";
import { formatBytes } from "../lib/utils";
import { trackProductEvent } from "../lib/analytics";
import { TOOLS } from "../tools";

interface DropzoneProps {
  /** e.g. "application/pdf" or "image/*" */
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  hint?: ReactNode;
  compact?: boolean;
}

export default function Dropzone({ accept, multiple, onFiles, hint, compact }: DropzoneProps) {
  const t = useT();
  const { pathname: rawPathname } = useLocation();
  const pathname = rawPathname.replace(/\/+$/, "") || "/";
  const tool = TOOLS.find((entry) => entry.path === pathname);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const acceptsPdf = accept.includes("pdf");
  const [recents, setRecents] = useState<RecentFileMeta[]>([]);

  useEffect(() => {
    if (acceptsPdf) void listRecents().then(setRecents);
  }, [acceptsPdf]);

  async function pickRecent(id: string) {
    const file = await loadRecent(id);
    if (file) {
      if (tool) trackProductEvent({ name: "file_selected", tool: tool.id, source: "recent" });
      onFiles([file]);
    }
  }

  function accepts(file: File): boolean {
    return accept
      .split(",")
      .map((a) => a.trim())
      .some((a) => {
        if (a === "*") return true;
        if (a.endsWith("/*")) return file.type.startsWith(a.slice(0, -1));
        if (a.startsWith(".")) return file.name.toLowerCase().endsWith(a.toLowerCase());
        return file.type === a;
      });
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list).filter(accepts);
    if (files.length === 0) return;
    if (tool) trackProductEvent({ name: "file_selected", tool: tool.id, source: "device" });
    onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <div className="space-y-3">
    <div
      role="button"
      tabIndex={0}
      aria-label={t.dropzone.ariaUpload}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed text-center transition-colors ${
        compact ? "px-6 py-6" : "px-6 py-16"
      } ${
        dragging
          ? "border-indigo-500 bg-indigo-50"
          : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <span
        className={`flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 ${
          compact ? "h-10 w-10" : "h-14 w-14"
        }`}
      >
        <UploadCloud className={compact ? "h-5 w-5" : "h-7 w-7"} />
      </span>
      <div>
        <p className="font-semibold text-slate-800">
          {compact ? t.dropzone.titleCompact : t.dropzone.title}
        </p>
        {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      </div>
      <p className="text-xs text-slate-400">{t.dropzone.privacy}</p>
    </div>

    {acceptsPdf && recents.length > 0 && (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <History className="h-3.5 w-3.5" /> {t.dropzone.recents}
          </p>
          <button
            onClick={() => {
              void clearRecents();
              setRecents([]);
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-rose-600"
          >
            <Trash2 className="h-3 w-3" /> {t.common.clear}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {recents.map((r) => (
            <button
              key={r.id}
              onClick={() => void pickRecent(r.id)}
              className="flex shrink-0 items-center gap-2.5 rounded-xl bg-white py-2 pl-2 pr-4 text-left shadow-sm ring-1 ring-slate-200 transition-all hover:ring-indigo-400"
            >
              <span className="flex h-11 w-9 items-center justify-center overflow-hidden rounded-md bg-slate-100">
                {r.thumbnail ? (
                  <img src={r.thumbnail} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <FileText className="h-4 w-4 text-slate-300" />
                )}
              </span>
              <span>
                <span className="block max-w-36 truncate text-xs font-semibold text-slate-700">
                  {r.name}
                </span>
                <span className="text-[11px] text-slate-400">{formatBytes(r.size)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    )}
    </div>
  );
}
