import { Link, Route, Routes } from "react-router-dom";
import { FileText, ShieldCheck } from "lucide-react";
import Home from "./pages/Home";
import Merge from "./pages/tools/Merge";
import Split from "./pages/tools/Split";
import Organize from "./pages/tools/Organize";
import Rotate from "./pages/tools/Rotate";
import Compress from "./pages/tools/Compress";
import PdfToImages from "./pages/tools/PdfToImages";
import ImagesToPdf from "./pages/tools/ImagesToPdf";
import Watermark from "./pages/tools/Watermark";
import PageNumbers from "./pages/tools/PageNumbers";
import Metadata from "./pages/tools/Metadata";
import Protect from "./pages/tools/Protect";
import Unlock from "./pages/tools/Unlock";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <FileText className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              PDF Toolbox
            </span>
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 sm:flex">
            <ShieldCheck className="h-4 w-4" />
            100% private — files never leave your device
          </span>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/merge" element={<Merge />} />
          <Route path="/split" element={<Split />} />
          <Route path="/organize" element={<Organize />} />
          <Route path="/rotate" element={<Rotate />} />
          <Route path="/compress" element={<Compress />} />
          <Route path="/pdf-to-images" element={<PdfToImages />} />
          <Route path="/images-to-pdf" element={<ImagesToPdf />} />
          <Route path="/watermark" element={<Watermark />} />
          <Route path="/page-numbers" element={<PageNumbers />} />
          <Route path="/metadata" element={<Metadata />} />
          <Route path="/protect" element={<Protect />} />
          <Route path="/unlock" element={<Unlock />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <p className="text-center text-sm text-slate-400">
          PDF Toolbox — every operation runs locally in your browser. No uploads, no
          accounts, no limits.
        </p>
      </footer>
    </div>
  );
}
