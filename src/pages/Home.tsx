import { Link } from "react-router-dom";
import { CloudOff, Gauge, ShieldCheck } from "lucide-react";
import { CATEGORIES, TOOLS } from "../tools";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24">
      <section className="py-14 text-center sm:py-20">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Every PDF tool you need,{" "}
          <span className="text-indigo-600">right in your browser</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
          Merge, split, compress, convert, watermark and protect PDFs — free and
          unlimited. Your files are processed on your device and never uploaded
          anywhere.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-600">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" /> Private by design
          </span>
          <span className="flex items-center gap-2">
            <CloudOff className="h-5 w-5 text-indigo-500" /> No uploads, no servers
          </span>
          <span className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-amber-500" /> No file-size limits
          </span>
        </div>
      </section>

      {CATEGORIES.map((category) => {
        const tools = TOOLS.filter((t) => t.category === category);
        if (tools.length === 0) return null;
        return (
          <section key={category} className="mb-10">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
              {category}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.id}
                    to={tool.path}
                    className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-indigo-300"
                  >
                    <span
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${tool.accent}`}
                    >
                      <Icon className="h-5.5 w-5.5" />
                    </span>
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">
                      {tool.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{tool.tagline}</p>
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
