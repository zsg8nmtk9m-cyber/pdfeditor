import { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { FileText, Globe, ScanSearch, ShieldCheck } from "lucide-react";
import { LANGUAGES, useI18n } from "./i18n";
import type { Lang } from "./i18n";
import Home from "./pages/Home";
import SafeToShare from "./pages/SafeToShare";
import Merge from "./pages/tools/Merge";
import Split from "./pages/tools/Split";
import Organize from "./pages/tools/Organize";
import Rotate from "./pages/tools/Rotate";
import Compress from "./pages/tools/Compress";
import Batch from "./pages/tools/Batch";
import Compare from "./pages/tools/Compare";
import PdfToImages from "./pages/tools/PdfToImages";
import ImagesToPdf from "./pages/tools/ImagesToPdf";
import ImagesToDocx from "./pages/tools/ImagesToDocx";
import ImageWorkbench from "./pages/tools/ImageWorkbench";
import Annotate from "./pages/tools/Annotate";
import Watermark from "./pages/tools/Watermark";
import PageNumbers from "./pages/tools/PageNumbers";
import Metadata from "./pages/tools/Metadata";
import Redact from "./pages/tools/Redact";
import Protect from "./pages/tools/Protect";
import Unlock from "./pages/tools/Unlock";
import { TOOLS } from "./tools";
import { trackProductEvent } from "./lib/analytics";

export default function App() {
  const { lang, t, setLang } = useI18n();
  const { pathname: rawPathname } = useLocation();
  const pathname = rawPathname.replace(/\/+$/, "") || "/";
  const tool = TOOLS.find((entry) => entry.path === pathname);

  useEffect(() => {
    const title = tool ? `${t.tools[tool.id].name} — Private Document Toolbox` : "Safe to Share — Private Document Toolbox";
    const description = tool ? t.tools[tool.id].description : t.home.subtitle;
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  }, [lang, pathname, t]);

  useEffect(() => {
    if (tool) trackProductEvent({ name: "tool_opened", tool: tool.id });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" aria-label="Private Document Toolbox" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <FileText className="h-5 w-5" />
            </span>
            <span className="hidden text-lg font-bold tracking-tight text-slate-900 min-[520px]:inline">
              Private Document Toolbox
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/safe-to-share"
              aria-label={t.safeToShare.nav}
              className={`flex h-9 items-center gap-2 rounded-xl px-2.5 text-sm font-semibold transition-colors sm:px-3 ${
                pathname === "/safe-to-share"
                  ? "bg-violet-100 text-violet-800"
                  : "text-slate-600 hover:bg-slate-100 hover:text-violet-700"
              }`}
            >
              <ScanSearch className="h-4 w-4" />
              <span className="hidden sm:inline">{t.safeToShare.nav}</span>
            </Link>
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 lg:flex">
              <ShieldCheck className="h-4 w-4" />
              {t.header.privacyBadge}
            </span>
            <label className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-slate-400" />
              <select
                aria-label="Language"
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="rounded-lg border-0 bg-transparent py-1.5 pl-1 pr-6 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:ring-indigo-300 focus:ring-2 focus:ring-indigo-500"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Routes location={pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/safe-to-share" element={<SafeToShare />} />
          <Route path="/merge" element={<Merge />} />
          <Route path="/split" element={<Split />} />
          <Route path="/organize" element={<Organize />} />
          <Route path="/rotate" element={<Rotate />} />
          <Route path="/compress" element={<Compress />} />
          <Route path="/batch" element={<Batch />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/pdf-to-images" element={<PdfToImages />} />
          <Route path="/images-to-pdf" element={<ImagesToPdf />} />
          <Route path="/images-to-docx" element={<ImagesToDocx />} />
          <Route path="/image-workbench" element={<ImageWorkbench />} />
          <Route path="/annotate" element={<Annotate />} />
          <Route path="/watermark" element={<Watermark />} />
          <Route path="/page-numbers" element={<PageNumbers />} />
          <Route path="/metadata" element={<Metadata />} />
          <Route path="/redact" element={<Redact />} />
          <Route path="/protect" element={<Protect />} />
          <Route path="/unlock" element={<Unlock />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <p className="px-4 text-center text-sm text-slate-400">{t.footer.line}</p>
      </footer>
    </div>
  );
}
