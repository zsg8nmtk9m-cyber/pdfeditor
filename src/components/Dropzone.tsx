import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { UploadCloud } from "lucide-react";

interface DropzoneProps {
  /** e.g. "application/pdf" or "image/*" */
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  hint?: ReactNode;
  compact?: boolean;
}

export default function Dropzone({ accept, multiple, onFiles, hint, compact }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

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
    onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload files"
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
          {compact ? "Add more files" : "Choose files or drag them here"}
        </p>
        {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      </div>
      <p className="text-xs text-slate-400">
        Your files are processed locally — they never leave this device.
      </p>
    </div>
  );
}
