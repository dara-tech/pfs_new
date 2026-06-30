import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAppStore = create((set, get) => ({
  locale: 'kh',
  theme: 'light',
  formData: {},
  currentToken: null,
  currentUuid: null,
  currentIndex: null,
  
  setLocale: async (locale) => {
    set({ locale });
    await AsyncStorage.setItem('@psf_locale', locale);
  },
  
  setTheme: async (theme) => {
    set({ theme });
    await AsyncStorage.setItem('@psf_theme', theme);
  },
  
  setFormData: (data) => {
    set((state) => ({
      formData: { ...state.formData, ...data }
    }));
  },
  
  clearFormData: () => {
    set({ formData: {} });
  },
  
  setCurrentSession: (token, uuid, index) => {
    set({ currentToken: token, currentUuid: uuid, currentIndex: index });
  },
  
  init: async () => {
    const locale = await AsyncStorage.getItem('@psf_locale') || 'kh';
    const theme = await AsyncStorage.getItem('@psf_theme') || 'light';
    set({ locale, theme });
  },
}));
