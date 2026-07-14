import { Check } from "lucide-react";
import { useT } from "../i18n";
import { Card, ProgressBar } from "./ui";

export interface PageBadge {
  label: string;
  /** Tailwind background class, e.g. "bg-indigo-500". */
  className: string;
}

interface PageGridProps {
  thumbs: string[];
  /** When set, pages are clickable and render selection state. */
  selected?: ReadonlySet<number>;
  onToggle?: (index: number, shiftKey: boolean) => void;
  /** Optional per-page badge (used for split-range preview). */
  badge?: (index: number) => PageBadge | null;
  /** Optional per-page preview rotation in degrees. */
  rotation?: (index: number) => number;
}

/** Read-only or selectable grid of page thumbnails. */
export default function PageGrid({ thumbs, selected, onToggle, badge, rotation }: PageGridProps) {
  const t = useT();
  const selectable = selected !== undefined && onToggle !== undefined;
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {thumbs.map((thumb, i) => {
        const isSelected = selected?.has(i) ?? false;
        const pageBadge = badge?.(i) ?? null;
        const deg = rotation?.(i) ?? 0;
        const inner = (
          <>
            <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              <img
                src={thumb}
                alt={t.pageGrid.pageAria(i + 1)}
                draggable={false}
                className="max-h-full max-w-full object-contain transition-transform duration-200"
                style={deg ? { transform: `rotate(${deg}deg)` } : undefined}
              />
              {selectable && (
                <span
                  className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 bg-white/90"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
              )}
              {pageBadge && (
                <span
                  className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white ${pageBadge.className}`}
                >
                  {pageBadge.label}
                </span>
              )}
            </div>
            <p
              className={`mt-1 text-center text-xs font-medium ${
                isSelected ? "text-indigo-600" : "text-slate-500"
              }`}
            >
              {i + 1}
            </p>
          </>
        );

        return selectable ? (
          <button
            key={i}
            type="button"
            aria-pressed={isSelected}
            aria-label={t.pageGrid.pageAria(i + 1)}
            onClick={(e) => onToggle(i, e.shiftKey)}
            className={`rounded-xl bg-white p-1.5 text-left ring-1 transition-all ${
              isSelected
                ? "ring-2 ring-indigo-500"
                : "ring-slate-200 hover:ring-indigo-300"
            }`}
          >
            {inner}
          </button>
        ) : (
          <div key={i} className="rounded-xl bg-white p-1.5 ring-1 ring-slate-200">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** Shown while thumbnails are rendering. */
export function ThumbnailsLoading({ progress }: { progress: number }) {
  const t = useT();
  return (
    <Card>
      <p className="mb-2 text-sm font-medium text-slate-600">{t.pageGrid.rendering}</p>
      <ProgressBar value={progress} />
    </Card>
  );
}
