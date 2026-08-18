import { ExternalLink, Sparkles } from "lucide-react";
import { useT } from "../i18n";
import { trackProductEvent } from "../lib/analytics";
import type { ToolId } from "../tools";

const FOUNDING_PRO_URL =
  "https://github.com/zsg8nmtk9m-cyber/pdfeditor/issues/new?template=founding-pro.yml";

interface FoundingProCardProps {
  placement: "home" | "result";
  tool?: ToolId;
  className?: string;
}

export default function FoundingProCard({
  placement,
  tool,
  className = "",
}: FoundingProCardProps) {
  const t = useT();
  const headingId = `founding-pro-${placement}-title`;

  return (
    <section
      data-founding-pro={placement}
      aria-labelledby={headingId}
      className={`rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-6 ring-1 ring-indigo-200 sm:flex sm:items-center sm:justify-between sm:gap-6 ${className}`}
    >
      <div className="max-w-2xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t.pro.eyebrow}
        </p>
        <h2 id={headingId} className="mt-2 text-xl font-bold text-slate-900">
          {t.pro.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t.pro.body}</p>
        <p className="mt-2 text-xs text-slate-500">{t.pro.privacy}</p>
      </div>
      <a
        href={FOUNDING_PRO_URL}
        target="_blank"
        rel="noreferrer"
        onClick={() =>
          trackProductEvent({ name: "pro_interest_opened", placement, tool })
        }
        className="mt-5 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0"
      >
        {t.pro.cta}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    </section>
  );
}
