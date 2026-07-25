import type { LucideIcon } from "lucide-react";
import {
  Combine,
  Scissors,
  LayoutGrid,
  RotateCw,
  FileArchive,
  Layers,
  Images,
  FileImage,
  PenLine,
  EyeOff,
  Stamp,
  ListOrdered,
  Lock,
  Unlock,
  FileCog,
} from "lucide-react";

export type ToolCategory = "Organize" | "Optimize" | "Convert" | "Edit" | "Security";

export type ToolId =
  | "merge"
  | "split"
  | "organize"
  | "rotate"
  | "compress"
  | "batch"
  | "pdf-to-images"
  | "images-to-pdf"
  | "annotate"
  | "watermark"
  | "page-numbers"
  | "metadata"
  | "protect"
  | "unlock"
  | "redact";

/**
 * Static tool registry. All user-facing copy (name, tagline, description)
 * lives in the i18n dictionaries under `tools[<id>]`.
 */
export interface ToolMeta {
  id: ToolId;
  path: string;
  icon: LucideIcon;
  category: ToolCategory;
  /** Tailwind classes for the card icon chip. */
  accent: string;
  /** Input the tool consumes; drives drag-and-drop onto the home cards. */
  accepts: "pdf" | "image";
  /** Whether the tool takes more than one file at once. */
  multi?: boolean;
}

export const TOOLS: ToolMeta[] = [
  { id: "merge", path: "/merge", icon: Combine, category: "Organize", accent: "bg-indigo-100 text-indigo-600", accepts: "pdf", multi: true },
  { id: "split", path: "/split", icon: Scissors, category: "Organize", accent: "bg-violet-100 text-violet-600", accepts: "pdf" },
  { id: "organize", path: "/organize", icon: LayoutGrid, category: "Organize", accent: "bg-sky-100 text-sky-600", accepts: "pdf" },
  { id: "rotate", path: "/rotate", icon: RotateCw, category: "Organize", accent: "bg-cyan-100 text-cyan-600", accepts: "pdf" },
  { id: "compress", path: "/compress", icon: FileArchive, category: "Optimize", accent: "bg-emerald-100 text-emerald-600", accepts: "pdf" },
  { id: "batch", path: "/batch", icon: Layers, category: "Optimize", accent: "bg-blue-100 text-blue-600", accepts: "pdf", multi: true },
  { id: "pdf-to-images", path: "/pdf-to-images", icon: Images, category: "Convert", accent: "bg-amber-100 text-amber-600", accepts: "pdf" },
  { id: "images-to-pdf", path: "/images-to-pdf", icon: FileImage, category: "Convert", accent: "bg-orange-100 text-orange-600", accepts: "image", multi: true },
  { id: "annotate", path: "/annotate", icon: PenLine, category: "Edit", accent: "bg-lime-100 text-lime-600", accepts: "pdf" },
  { id: "watermark", path: "/watermark", icon: Stamp, category: "Edit", accent: "bg-rose-100 text-rose-600", accepts: "pdf" },
  { id: "page-numbers", path: "/page-numbers", icon: ListOrdered, category: "Edit", accent: "bg-fuchsia-100 text-fuchsia-600", accepts: "pdf" },
  { id: "metadata", path: "/metadata", icon: FileCog, category: "Edit", accent: "bg-slate-200 text-slate-600", accepts: "pdf" },
  { id: "redact", path: "/redact", icon: EyeOff, category: "Security", accent: "bg-slate-800 text-white", accepts: "pdf" },
  { id: "protect", path: "/protect", icon: Lock, category: "Security", accent: "bg-red-100 text-red-600", accepts: "pdf" },
  { id: "unlock", path: "/unlock", icon: Unlock, category: "Security", accent: "bg-teal-100 text-teal-600", accepts: "pdf" },
];

export const CATEGORIES: ToolCategory[] = [
  "Organize",
  "Optimize",
  "Convert",
  "Edit",
  "Security",
];
