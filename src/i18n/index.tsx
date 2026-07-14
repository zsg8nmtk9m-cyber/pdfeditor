/**
 * Minimal typed i18n. The English dictionary is canonical; the Dict type
 * widens its literals so every other language must provide the same keys
 * (including function signatures) — a missing translation is a compile error.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { en } from "./en";
import { tr } from "./tr";
import { de } from "./de";
import { es } from "./es";
import { fr } from "./fr";

type DeepWiden<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends (...args: infer A) => string
      ? (...args: A) => string
      : DeepWiden<T[K]>;
};
export type Dict = DeepWiden<typeof en>;

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];

const DICTS: Record<Lang, Dict> = { en, tr, de, es, fr };
const STORAGE_KEY = "pdf-toolbox-lang";

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in DICTS) return stored as Lang;
  } catch {
    // storage may be unavailable
  }
  const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  return nav in DICTS ? (nav as Lang) : "en";
}

interface I18nValue {
  lang: Lang;
  t: Dict;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nValue>({ lang: "en", t: en, setLang: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage may be unavailable
    }
  }, []);

  return (
    <I18nContext.Provider value={{ lang, t: DICTS[lang], setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

/** Shorthand for components that only read strings. */
export function useT(): Dict {
  return useContext(I18nContext).t;
}

/**
 * Localized message for a caught error: known error codes map to translated
 * strings, other Errors keep their message, anything else gets the fallback.
 */
export function errorText(err: unknown, t: Dict, fallback: string): string {
  const code = (err as { code?: unknown } | null)?.code;
  if (code === "encrypted") return t.errors.encrypted;
  if (code === "wrong-password") return t.errors.wrongPassword;
  return err instanceof Error ? err.message : fallback;
}
