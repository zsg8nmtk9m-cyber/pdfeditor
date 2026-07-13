import { FileText } from "lucide-react";
import { formatBytes } from "../lib/utils";

interface FileSummaryProps {
  name: string;
  size: number;
  pageCount: number;
  thumbnail: string | null;
}

/** Compact header card for single-file tools: first page preview + facts. */
export default function FileSummary({ name, size, pageCount, thumbnail }: FileSummaryProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
        {thumbnail ? (
          <img src={thumbnail} alt="First page" className="max-h-full max-w-full object-contain" />
        ) : (
          <FileText className="h-6 w-6 text-slate-300" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-800">{name}</p>
        <p className="text-sm text-slate-500">
          {pageCount} page{pageCount === 1 ? "" : "s"} · {formatBytes(size)}
        </p>
      </div>
    </div>
  );
}
