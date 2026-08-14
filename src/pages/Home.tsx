import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CloudOff, Gauge, Search, ShieldCheck, UploadCloud, X } from "lucide-react";
import { useT } from "../i18n";
import { setHandoffFiles } from "../lib/handoff";
import { CATEGORIES, TOOLS } from "../tools";
import type { ToolMeta } from "../tools";

/** Does this file match what the tool consumes? */
function fileMatches(file: File, accepts: ToolMeta["accepts"]): boolean {
  return accepts === "pdf"
    ? file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    : file.type.startsWith("image/");
}

export default function Home() {
  const t = useT();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  // Which card is currently under the pointer during a drag, and whether the
  // dragged files are usable by it.
  const [dragTarget, setDragTarget] = useState<{ id: string; ok: boolean } | null>(null);

  const matchingTools = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return TOOLS;
    return TOOLS.filter((tool) => {
      const copy = t.tools[tool.id];
      return [copy.name, copy.tagline, copy.description, t.categories[tool.category]]
        .join(" ")
        .toLocaleLowerCase()
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
      fileMatches(f, tool.accepts),
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
        tool.accepts === "pdf" ? i.type === "application/pdf" : i.type.startsWith("image/"),
      );
    setDragTarget({ id: tool.id, ok });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24">
      <section className="py-14 text-center sm:py-20">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          {t.home.heroA} <span className="text-indigo-600">{t.home.heroB}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">{t.home.subtitle}</p>
        <div className="relative mx-auto mt-8 max-w-xl text-left">
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
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-600">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" /> {t.home.chipPrivate}
          </span>
          <span className="flex items-center gap-2">
            <CloudOff className="h-5 w-5 text-indigo-500" /> {t.home.chipNoUploads}
          </span>
          <span className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-amber-500" /> {t.home.chipNoLimits}
          </span>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
          <UploadCloud className="h-4 w-4" /> {t.home.dropHint}
        </p>
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
                          ? tool.accepts === "pdf"
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
