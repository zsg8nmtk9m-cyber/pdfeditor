import { ArrowDown, ArrowUp, FileText, Image as ImageIcon, X } from "lucide-react";
import { formatBytes } from "../lib/utils";

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
  /** When provided, up/down reorder buttons are shown. */
  onMove?: (index: number, dir: -1 | 1) => void;
  kind?: "pdf" | "image";
}

export default function FileList({ files, onRemove, onMove, kind = "pdf" }: FileListProps) {
  const Icon = kind === "pdf" ? FileText : ImageIcon;
  return (
    <ul className="space-y-2">
      {files.map((file, i) => (
        <li
          key={`${file.name}-${i}`}
          className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
            <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
          </div>
          {onMove && (
            <div className="flex shrink-0 gap-1">
              <button
                aria-label={`Move ${file.name} up`}
                disabled={i === 0}
                onClick={() => onMove(i, -1)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                aria-label={`Move ${file.name} down`}
                disabled={i === files.length - 1}
                onClick={() => onMove(i, 1)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            aria-label={`Remove ${file.name}`}
            onClick={() => onRemove(i)}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <X className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
