import { create } from 'zustand';
import api from '../api';

export const useReportingStore = create((set) => ({
  tableData: [],
  dashboardData: null,
  sites: [],
  loading: false,
  error: null,

  /** Sites only — GET /reporting/table without dates (no full table payload) */
  fetchSites: async (locale = 'en') => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/reporting/table?locale=${encodeURIComponent(locale)}`);
      if (response.data.success) {
        set({
          sites: response.data.sites || [],
          tableData: [],
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Fetch reporting sites error:', error);
      set({ error: error.message, loading: false });
    }
  },

  /** @deprecated Use fetchSites — kept so old imports do not pull full tables */
  fetchTable: async (locale = 'en') => {
    return useReportingStore.getState().fetchSites(locale);
  },

  fetchDashboard: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/reporting/dashboard', filters);
      if (response.data.success) {
        set({
          dashboardData: response.data.data,
          sites: response.data.sites || [],
          loading: false,
        });
      }
    } catch (error) {
      console.error('Fetch dashboard error:', error);
      set({ error: error.message, loading: false });
    }
  },

  clearMemory: () =>
    set({
      tableData: [],
      dashboardData: null,
      sites: [],
      loading: false,
      error: null,
    }),
}));
