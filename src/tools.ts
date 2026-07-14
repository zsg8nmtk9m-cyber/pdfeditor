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
  | "unlock";

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
}

export const TOOLS: ToolMeta[] = [
  { id: "merge", path: "/merge", icon: Combine, category: "Organize", accent: "bg-indigo-100 text-indigo-600" },
  { id: "split", path: "/split", icon: Scissors, category: "Organize", accent: "bg-violet-100 text-violet-600" },
  { id: "organize", path: "/organize", icon: LayoutGrid, category: "Organize", accent: "bg-sky-100 text-sky-600" },
  { id: "rotate", path: "/rotate", icon: RotateCw, category: "Organize", accent: "bg-cyan-100 text-cyan-600" },
  { id: "compress", path: "/compress", icon: FileArchive, category: "Optimize", accent: "bg-emerald-100 text-emerald-600" },
  { id: "batch", path: "/batch", icon: Layers, category: "Optimize", accent: "bg-blue-100 text-blue-600" },
  { id: "pdf-to-images", path: "/pdf-to-images", icon: Images, category: "Convert", accent: "bg-amber-100 text-amber-600" },
  { id: "images-to-pdf", path: "/images-to-pdf", icon: FileImage, category: "Convert", accent: "bg-orange-100 text-orange-600" },
  { id: "annotate", path: "/annotate", icon: PenLine, category: "Edit", accent: "bg-lime-100 text-lime-600" },
  { id: "watermark", path: "/watermark", icon: Stamp, category: "Edit", accent: "bg-rose-100 text-rose-600" },
  { id: "page-numbers", path: "/page-numbers", icon: ListOrdered, category: "Edit", accent: "bg-fuchsia-100 text-fuchsia-600" },
  { id: "metadata", path: "/metadata", icon: FileCog, category: "Edit", accent: "bg-slate-200 text-slate-600" },
  { id: "protect", path: "/protect", icon: Lock, category: "Security", accent: "bg-red-100 text-red-600" },
  { id: "unlock", path: "/unlock", icon: Unlock, category: "Security", accent: "bg-teal-100 text-teal-600" },
];

export const CATEGORIES: ToolCategory[] = [
  "Organize",
  "Optimize",
  "Convert",
  "Edit",
  "Security",
];
