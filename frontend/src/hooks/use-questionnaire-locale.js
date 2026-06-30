import { useEffect } from 'react';
import { loadKhmerFonts } from '../lib/fonts';

const FONT_STACK = "'Google Sans', sans-serif";

export function normalizeQuestionnaireLocale(locale) {
  return locale === 'en' ? 'en' : 'kh';
}

/**
 * Public client/provider flows use :locale in the URL (not uiStore).
 * Loads Khmer @fontsource subsets and sets document lang + font stack.
 */
export function useQuestionnaireLocale(localeParam) {
  const locale = normalizeQuestionnaireLocale(localeParam);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.style.setProperty('--font-family', FONT_STACK);
    document.body.style.fontFamily = FONT_STACK;

    if (locale === 'kh') {
      void loadKhmerFonts();
    }
  }, [locale]);

  return locale;
}
