"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { translations, type Locale, type Dict, getDirection } from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
  dir: "rtl" | "ltr";
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "abs_locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  // Always start with "fr" to match the server render (avoids hydration mismatch),
  // then load the saved locale after mount.
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === "fr" || saved === "ar") {
      document.documentElement.lang = saved;
      document.documentElement.dir = getDirection(saved);
      if (saved !== locale) {
        const id = setTimeout(() => setLocaleState(saved), 0);
        return () => clearTimeout(id);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getDirection(locale);
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  };

  const value: I18nContextValue = {
    locale,
    setLocale,
    t: translations[locale] as Dict,
    dir: getDirection(locale),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
