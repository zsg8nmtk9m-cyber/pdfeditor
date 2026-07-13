import type { LucideIcon } from "lucide-react";
import {
  Combine,
  Scissors,
  LayoutGrid,
  RotateCw,
  FileArchive,
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

export interface ToolMeta {
  id: string;
  path: string;
  name: string;
  /** Short one-liner for the home-page card. */
  tagline: string;
  /** Longer description shown on the tool page itself. */
  description: string;
  icon: LucideIcon;
  category: ToolCategory;
  /** Tailwind classes for the card icon chip. */
  accent: string;
}

export const TOOLS: ToolMeta[] = [
  {
    id: "merge",
    path: "/merge",
    name: "Merge PDF",
    tagline: "Combine multiple PDFs into one",
    description:
      "Combine two or more PDF files into a single document. Drag to set the order before merging.",
    icon: Combine,
    category: "Organize",
    accent: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "split",
    path: "/split",
    name: "Split PDF",
    tagline: "Extract pages or split into parts",
    description:
      "Split a PDF by page ranges, extract a selection into one file, or export every page as its own PDF.",
    icon: Scissors,
    category: "Organize",
    accent: "bg-violet-100 text-violet-600",
  },
  {
    id: "organize",
    path: "/organize",
    name: "Organize PDF",
    tagline: "Reorder, rotate or delete pages",
    description:
      "See every page as a thumbnail, then drag to reorder, rotate individual pages, or remove the ones you don't need.",
    icon: LayoutGrid,
    category: "Organize",
    accent: "bg-sky-100 text-sky-600",
  },
  {
    id: "rotate",
    path: "/rotate",
    name: "Rotate PDF",
    tagline: "Rotate all pages at once",
    description: "Rotate every page (or a range of pages) by 90°, 180° or 270°.",
    icon: RotateCw,
    category: "Organize",
    accent: "bg-cyan-100 text-cyan-600",
  },
  {
    id: "compress",
    path: "/compress",
    name: "Compress PDF",
    tagline: "Shrink files while keeping quality",
    description:
      "Reduce file size by re-rendering pages at a lower resolution. Ideal for scans and image-heavy documents.",
    icon: FileArchive,
    category: "Optimize",
    accent: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "pdf-to-images",
    path: "/pdf-to-images",
    name: "PDF to Images",
    tagline: "Export pages as PNG or JPG",
    description:
      "Turn every page of a PDF into a high-quality PNG or JPG image. Multiple pages download as a ZIP.",
    icon: Images,
    category: "Convert",
    accent: "bg-amber-100 text-amber-600",
  },
  {
    id: "images-to-pdf",
    path: "/images-to-pdf",
    name: "Images to PDF",
    tagline: "Turn photos and scans into a PDF",
    description:
      "Combine JPG, PNG or WebP images into a single PDF. Choose the page size and reorder images before converting.",
    icon: FileImage,
    category: "Convert",
    accent: "bg-orange-100 text-orange-600",
  },
  {
    id: "annotate",
    path: "/annotate",
    name: "Sign & Annotate",
    tagline: "Sign and add text to any page",
    description:
      "Draw or type your signature, place it anywhere, and add text notes to any page. Everything is flattened into the PDF — no special reader needed.",
    icon: PenLine,
    category: "Edit",
    accent: "bg-lime-100 text-lime-600",
  },
  {
    id: "watermark",
    path: "/watermark",
    name: "Watermark",
    tagline: "Stamp text over every page",
    description:
      "Add a text watermark — like CONFIDENTIAL or DRAFT — across every page, with custom color, size and opacity.",
    icon: Stamp,
    category: "Edit",
    accent: "bg-rose-100 text-rose-600",
  },
  {
    id: "page-numbers",
    path: "/page-numbers",
    name: "Page Numbers",
    tagline: "Number pages automatically",
    description:
      "Insert page numbers in the position and format you choose — corners or centered, top or bottom.",
    icon: ListOrdered,
    category: "Edit",
    accent: "bg-fuchsia-100 text-fuchsia-600",
  },
  {
    id: "metadata",
    path: "/metadata",
    name: "Edit Metadata",
    tagline: "Change title, author & more",
    description:
      "View and edit the document's title, author, subject, keywords and other metadata fields.",
    icon: FileCog,
    category: "Edit",
    accent: "bg-slate-200 text-slate-600",
  },
  {
    id: "protect",
    path: "/protect",
    name: "Protect PDF",
    tagline: "Encrypt with a password",
    description:
      "Add AES password protection so the PDF can only be opened by people who know the password.",
    icon: Lock,
    category: "Security",
    accent: "bg-red-100 text-red-600",
  },
  {
    id: "unlock",
    path: "/unlock",
    name: "Unlock PDF",
    tagline: "Remove a known password",
    description:
      "Remove password protection from a PDF you own. You need the current password to unlock it.",
    icon: Unlock,
    category: "Security",
    accent: "bg-teal-100 text-teal-600",
  },
];

export const CATEGORIES: ToolCategory[] = [
  "Organize",
  "Optimize",
  "Convert",
  "Edit",
  "Security",
];
