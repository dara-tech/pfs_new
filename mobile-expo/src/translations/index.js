import { en } from './en';
import { kh } from './kh';

const translations = { en, kh };

export const t = (locale, key, params = {}) => {
  const keys = key.split('.');
  let value = translations[locale] || translations['en'];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      console.warn(`Translation missing: ${key} for locale ${locale}`);
      return key;
    }
  }
  
  // Replace params if any
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    return Object.entries(params).reduce(
      (str, [param, val]) => str.replace(`{${param}}`, val),
      value
    );
  }
  
  return value || key;
};

export { en, kh };
