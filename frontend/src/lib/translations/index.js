// Main translations file - exports both English and Khmer
import { en } from './en.js';
import { kh } from './kh.js';

export const translations = {
  en,
  kh,
};

// Helper function to get translation
export const getTranslation = (locale, category, key) => {
  return translations[locale]?.[category]?.[key] || key;
};

// Helper function to get nested translation (e.g., 'admin.dashboard.title')
export const t = (locale, path, params = {}) => {
  const keys = path.split('.');
  let value = translations[locale];
  
  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return path; // Return path if not found
    }
  }
  
  let result = value || path;
  
  // Replace parameters in the string (e.g., {count} -> actual count value)
  if (typeof result === 'string' && params) {
    Object.keys(params).forEach(key => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), params[key]);
    });
  }
  
  return result;
};

export default translations;

