import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CloudOff, Gauge, ScanSearch, Search, ShieldCheck, X } from "lucide-react";
import Dropzone from "../components/Dropzone";
import { useT } from "../i18n";
import { setHandoffFiles } from "../lib/handoff";
import { CATEGORIES, TOOLS } from "../tools";
import type { ToolMeta } from "../tools";
import { matchesAcceptedFile, matchesAcceptedMimeType } from "../lib/fileTypes";
import { trackProductEvent } from "../lib/analytics";

const QUICK_TOOLS = TOOLS.filter((tool) => tool.id !== "safe-to-share");

export default function Home() {
  const t = useT();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  // Which card is currently under the pointer during a drag, and whether the
  // dragged files are usable by it.
  const [dragTarget, setDragTarget] = useState<{ id: string; ok: boolean } | null>(null);

  const matchingTools = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return QUICK_TOOLS;
    return QUICK_TOOLS.filter((tool) => {
      const copy = t.tools[tool.id];
      return [copy.name, copy.tagline, copy.description, t.categories[tool.category]]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, t]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function handleDrop(e: React.DragEvent, tool: ToolMeta) {
    e.preventDefault();
    setDragTarget(null);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      matchesAcceptedFile(f, tool.accepts),
    );
    if (dropped.length === 0) return;
    setHandoffFiles(tool.multi ? dropped : dropped.slice(0, 1));
    navigate(tool.path);
  }

  function handleDragOver(e: React.DragEvent, tool: ToolMeta) {
    // Only react to actual file drags, not text/link drags.
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    // File contents aren't readable during dragover; the item *kind* is, so
    // we can still tell the user whether this card will accept the drop.
    const items = Array.from(e.dataTransfer.items).filter((i) => i.kind === "file");
    const ok =
      items.length === 0 ||
      items.some((i) =>
        matchesAcceptedMimeType(i.type, tool.accepts),
      );
    setDragTarget({ id: tool.id, ok });
  }

  function openSafeToShare(files: File[]) {
    const file = files[0];
    if (!file) return;
    setHandoffFiles([file]);
    trackProductEvent({ name: "file_selected", tool: "safe-to-share", source: "device" });
    navigate("/safe-to-share");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24">
      <section className="py-8 sm:py-12">
        <div className="overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-6 text-white shadow-xl shadow-slate-300/40 sm:px-8 sm:py-8 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-violet-300">
              <ScanSearch className="h-4 w-4" /> {t.safeToShare.homeEyebrow}
            </p>
            <h1 className="mt-4 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t.safeToShare.homeTitle}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-300">
              {t.safeToShare.homeBody}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-300">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> {t.home.chipPrivate}
              </span>
              <span className="flex items-center gap-2">
                <CloudOff className="h-4 w-4 text-violet-300" /> {t.home.chipNoUploads}
              </span>
            </div>
            <Link
              to="/safe-to-share"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-200 hover:text-white lg:hidden"
            >
              {t.safeToShare.homeCta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10 lg:mt-0">
            <Dropzone
              accept="application/pdf,.pdf"
              onFiles={openSafeToShare}
              hint={t.safeToShare.dropHint}
              compact
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{t.home.quickTools}</h2>
            <p className="mt-1 text-sm text-slate-500">{t.home.quickToolsBody}</p>
          </div>
          <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Gauge className="h-4 w-4 text-amber-500" /> {t.home.chipNoLimits}
          </span>
        </div>
        <div className="relative max-w-xl text-left">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={searchRef}
            type="text"
            role="searchbox"
            inputMode="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t.home.searchLabel}
            placeholder={t.home.searchPlaceholder}
            className="h-14 w-full rounded-2xl border-0 bg-white pl-12 pr-20 text-base text-slate-900 shadow-lg shadow-slate-200/60 ring-1 ring-slate-200 transition placeholder:text-slate-400 hover:ring-indigo-300 focus:ring-2 focus:ring-indigo-500"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              aria-label={t.home.clearSearch}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md bg-slate-100 px-2 py-1 font-sans text-xs font-semibold text-slate-400 sm:block">
              /
            </kbd>
          )}
        </div>
      </section>

      {matchingTools.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">{t.home.noSearchResults}</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              searchRef.current?.focus();
            }}
            className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {t.home.clearSearch}
          </button>
        </div>
      ) : CATEGORIES.map((category) => {
        const tools = matchingTools.filter((tool) => tool.category === category);
        if (tools.length === 0) return null;
        return (
          <section key={category} className="mb-10">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
              {t.categories[category]}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const copy = t.tools[tool.id];
                const dragging = dragTarget?.id === tool.id;
                const rejecting = dragging && !dragTarget.ok;
                return (
                  <Link
                    key={tool.id}
                    to={tool.path}
                    data-tool={tool.id}
                    onDragOver={(e) => handleDragOver(e, tool)}
                    onDragLeave={() => setDragTarget(null)}
                    onDrop={(e) => handleDrop(e, tool)}
                    className={`group relative rounded-2xl bg-white p-5 shadow-sm ring-1 transition-all ${
                      dragging
                        ? rejecting
                          ? "ring-2 ring-rose-400"
                          : "-translate-y-0.5 shadow-md ring-2 ring-indigo-500"
                        : "ring-slate-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-indigo-300"
                    }`}
                  >
                    <span
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${tool.accent}`}
                    >
                      <Icon className="h-5.5 w-5.5" />
                    </span>
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">
                      {copy.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{copy.tagline}</p>
                    {dragging && (
                      <span
                        className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl text-sm font-semibold ${
                          rejecting
                            ? "bg-rose-50/90 text-rose-600"
                            : "bg-indigo-50/90 text-indigo-700"
                        }`}
                      >
                        {rejecting
                          ? tool.accepts.includes("pdf")
                            ? t.home.dropNeedsPdf
                            : t.home.dropNeedsImage
                          : t.home.dropHere(copy.name)}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
