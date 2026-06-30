import { create } from 'zustand';
import api from '../api';

export const useSitesStore = create((set, get) => ({
  sites: [],
  loading: false,
  error: null,
  selectedSites: [],

  fetchSites: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/admin/sites');
      set({ sites: response.data.sites || [], loading: false });
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to fetch sites', loading: false });
    }
  },

  createSite: async (data) => {
    try {
      const response = await api.post('/admin/sites', data);
      set((state) => ({ sites: [...state.sites, response.data.site] }));
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to create site';
    }
  },

  updateSite: async (id, data) => {
    try {
      const response = await api.put(`/admin/sites/${id}`, data);
      set((state) => ({
        sites: state.sites.map((s) => (s.id === id ? response.data.site : s)),
      }));
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to update site';
    }
  },

  deleteSite: async (id) => {
    try {
      await api.delete(`/admin/sites/${id}`);
      set((state) => ({
        sites: state.sites.filter((s) => s.id !== id),
      }));
    } catch (error) {
      throw error.response?.data?.error || 'Failed to delete site';
    }
  },

  massDelete: async (ids) => {
    try {
      await Promise.all(ids.map((id) => api.delete(`/admin/sites/${id}`)));
      set((state) => ({
        sites: state.sites.filter((s) => !ids.includes(s.id)),
      }));
    } catch (error) {
      throw error.response?.data?.error || 'Failed to delete sites';
    }
  },

  setSelectedSites: (ids) => set({ selectedSites: ids }),
  toggleSelection: (id) => {
    set((state) => ({
      selectedSites: state.selectedSites.includes(id)
        ? state.selectedSites.filter((i) => i !== id)
        : [...state.selectedSites, id],
    }));
  },
}));

