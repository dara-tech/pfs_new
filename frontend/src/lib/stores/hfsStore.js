import { create } from 'zustand';
import api from '../api';

export const useHFSStore = create((set, get) => ({
  dashboardData: null,
  tableData: [],
  loading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
  },

  fetchDashboard: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/reporting/hfs/dashboard', filters);
      set({ dashboardData: response.data.data, loading: false });
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to fetch HFS dashboard', loading: false });
    }
  },

  fetchTable: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/reporting/hfs/table', {
        ...filters,
        page: get().pagination.page,
        limit: get().pagination.limit,
      });
      set({
        tableData: response.data.data || [],
        pagination: {
          ...get().pagination,
          total: response.data.total || 0,
        },
        loading: false,
      });
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to fetch HFS table data', loading: false });
    }
  },

  setFilters: (filters) => set({ filters }),
  setPagination: (pagination) => set((state) => ({ pagination: { ...state.pagination, ...pagination } })),
  resetFilters: () => set({ filters: {}, pagination: { page: 1, limit: 50, total: 0 } }),
}));

