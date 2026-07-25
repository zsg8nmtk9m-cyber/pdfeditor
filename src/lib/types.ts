/**
 * Shared option/result types for PDF operations. Kept free of any runtime
 * PDF dependencies so UI code can import them without pulling pdf-lib or
 * pdf.js into the main-thread bundle — the heavy libraries live only in the
 * worker (see src/worker/pdf.worker.ts).
 */

export type ProgressCallback = (done: number, total: number) => void;

// ---------------------------------------------------------------- Organize

export interface PageEdit {
  /** Index of the page in the source document. */
  srcIndex: number;
  /** Extra clockwise rotation to apply, in degrees (0/90/180/270). */
  rotation: number;
}

// ---------------------------------------------------------------- Watermark

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  /** 0–1 */
  opacity: number;
  /** Hex color like "#ff0000". */
  color: string;
  diagonal: boolean;
}

// ---------------------------------------------------------------- Page numbers

export type NumberPosition =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "top-left"
  | "top-center"
  | "top-right";

export type NumberFormat = "n" | "n-of-total" | "page-n-of-total";

export interface PageNumberOptions {
  position: NumberPosition;
  format: NumberFormat;
  fontSize: number;
  /** 1-based number given to the first page. */
  startAt: number;
}

// ---------------------------------------------------------------- Images → PDF

export type PageSizeMode = "fit" | "a4" | "letter";

export interface ImagesToPdfOptions {
  pageSize: PageSizeMode;
  margin: number;
}

// ---------------------------------------------------------------- Compress

export interface CompressOptions {
  /** Render resolution in DPI (72 = original point size). */
  dpi: number;
  /** JPEG quality 0–1. */
  quality: number;
}

export const COMPRESS_PRESETS = {
  low: { dpi: 150, quality: 0.8, label: "Less compression", hint: "High quality, larger file" },
  recommended: { dpi: 120, quality: 0.65, label: "Recommended", hint: "Good quality, good compression" },
  extreme: { dpi: 90, quality: 0.45, label: "Extreme", hint: "Smaller file, lower quality" },
} as const;

export type CompressPreset = keyof typeof COMPRESS_PRESETS;

// ---------------------------------------------------------------- PDF → images

export interface PdfToImagesOptions {
  format: "png" | "jpeg";
  /** Render scale: 1 = 72 dpi, 2 = 144 dpi, 3 = 216 dpi. */
  scale: number;
  quality: number;
}

// ---------------------------------------------------------------- Summaries

/** Lightweight per-file info for pickers: first-page preview + page count. */
export interface DocSummary {
  pageCount: number;
  /** Data URL of the first page, or null if the file couldn't be rendered. */
  thumbnail: string | null;
  /** First-page size in PDF points (0 when the file couldn't be rendered). */
  widthPts: number;
  heightPts: number;
}

// ---------------------------------------------------------------- Annotate

/**
 * An element placed on a page by the Sign & Annotate editor.
 *
 * Coordinates are in DISPLAY space: the page as pdf.js renders it (rotation
 * applied), in points, origin at the top-left, y growing downward. The
 * annotate operation maps these into each page's unrotated PDF space.
 */
export interface AnnotationElement {
  pageIndex: number;
  kind: "text" | "image";
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fontSize?: number;
  /** Hex color like "#111827". */
  color?: string;
  /** PNG data URL (signatures). */
  imageDataUrl?: string;
}

/** Font metrics shared by the editor UI and the PDF export for WYSIWYG. */
export const TEXT_BASELINE = 0.9;
export const TEXT_LINE_HEIGHT = 1.2;

// ---------------------------------------------------------------- Compare

/** One page of a visual comparison between two documents. */
export interface ComparePage {
  pageIndex: number;
  /** Rendered diff: changes in red over a faded copy of the second file. */
  diffDataUrl: string;
  /** Fraction of pixels that differ, 0–1. */
  changedRatio: number;
  /** Set when the page exists in only one of the two files. */
  onlyIn: "a" | "b" | null;
}

// ---------------------------------------------------------------- Redact

/**
 * An area to permanently remove, in the same DISPLAY space as
 * AnnotationElement (page as pdf.js renders it, origin top-left, points).
 */
export interface RedactionRect {
  pageIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A single page rendered for the editor. */
export interface PageImage {
  dataUrl: string;
  /** Display size in points (rotation applied). */
  widthPts: number;
  heightPts: number;
}

// ---------------------------------------------------------------- Metadata

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
}
