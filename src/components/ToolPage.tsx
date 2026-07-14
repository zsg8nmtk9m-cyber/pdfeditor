import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useT } from "../i18n";
import { TOOLS } from "../tools";

/** Shared page chrome for every tool: back link, title, description. */
export default function ToolPage({ children }: { children: ReactNode }) {
  const t = useT();
  const { pathname } = useLocation();
  const tool = TOOLS.find((entry) => entry.path === pathname);
  if (!tool) return null;
  const Icon = tool.icon;
  const copy = t.tools[tool.id];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" /> {t.common.allTools}
      </Link>
      <div className="mb-8 flex items-start gap-4">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tool.accent}`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{copy.name}</h1>
          <p className="mt-1 max-w-2xl text-slate-500">{copy.description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
