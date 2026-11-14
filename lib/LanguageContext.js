'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { translations } from './i18n';

const SUPPORTED = ['ar', 'tr', 'en'];
// SSR + first client render MUST share this exact value, byte-for-byte.
// Arabic is the primary audience, so we bake Arabic HTML at build time and
// keep the initial client render identical → React's hydration check passes.
// Detection from localStorage / navigator runs AFTER mount, inside useEffect,
// never during render — that's what prevents "Text content does not match
// server-rendered HTML".
const DEFAULT = 'ar';

const LanguageContext = createContext({
  lang: DEFAULT,
  setLang: () => {},
  t: translations[DEFAULT],
  mounted: false,
});

function detectBrowserLang() {
  if (typeof navigator === 'undefined') return DEFAULT;
  const raw = (navigator.language || DEFAULT).toLowerCase();
  if (raw.startsWith('ar')) return 'ar';
  if (raw.startsWith('tr')) return 'tr';
  if (raw.startsWith('en')) return 'en';
  return DEFAULT;
}

export function LanguageProvider({ children }) {
  // IMPORTANT: Both SSR and the first client render MUST start with the same
  // value (DEFAULT) — otherwise React will report a hydration mismatch.
  const [lang, setLangState] = useState(DEFAULT);
  const [mounted, setMounted] = useState(false);

  // After hydration: detect language and set it. Priority order:
  //   1. URL `?lang=` query param  — used by Puppeteer for PDF generation
  //      (headless Chrome has no localStorage and reports `en-US` from
  //      navigator, so we need an explicit override).
  //   2. localStorage (`nc_lang`)
  //   3. navigator.language
  //   4. DEFAULT ('ar')
  useEffect(() => {
    let initial = DEFAULT;
    try {
      const fromUrl =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('lang')
          : null;
      if (fromUrl && SUPPORTED.includes(fromUrl)) {
        initial = fromUrl;
      } else {
        const stored =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('nc_lang')
            : null;
        if (stored && SUPPORTED.includes(stored)) {
          initial = stored;
        } else {
          initial = detectBrowserLang();
        }
      }
    } catch {
      initial = detectBrowserLang();
    }
    setLangState(initial);
    setMounted(true);
  }, []);

  // Keep <html dir> + <html lang> in sync — but only after mount,
  // so the SSR-rendered <html lang="ar" dir="rtl"> stays untouched
  // until the client is in control.
  useEffect(() => {
    if (!mounted) return;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [lang, mounted]);

  const setLang = (l) => {
    if (!SUPPORTED.includes(l)) return;
    setLangState(l);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('nc_lang', l);
      }
    } catch {}
  };

  const value = {
    lang,
    setLang,
    t: translations[lang] || translations[DEFAULT],
    mounted,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
