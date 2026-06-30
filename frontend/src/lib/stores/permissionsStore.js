import { create } from 'zustand';
import api from '../api';

export const usePermissionsStore = create((set, get) => ({
  permissions: [],
  loading: false,
  error: null,
  selectedPermissions: [],

  fetchPermissions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/admin/permissions');
      set({ permissions: response.data.permissions || [], loading: false });
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to fetch permissions', loading: false });
    }
  },

  createPermission: async (data) => {
    try {
      const response = await api.post('/admin/permissions', data);
      set((state) => ({ permissions: [...state.permissions, response.data.permission] }));
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to create permission';
    }
  },

  updatePermission: async (id, data) => {
    try {
      const response = await api.put(`/admin/permissions/${id}`, data);
      set((state) => ({
        permissions: state.permissions.map((p) => (p.id === id ? response.data.permission : p)),
      }));
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to update permission';
    }
  },

  deletePermission: async (id) => {
    try {
      await api.delete(`/admin/permissions/${id}`);
      set((state) => ({
        permissions: state.permissions.filter((p) => p.id !== id),
      }));
    } catch (error) {
      throw error.response?.data?.error || 'Failed to delete permission';
    }
  },

  massDelete: async (ids) => {
    try {
      await Promise.all(ids.map((id) => api.delete(`/admin/permissions/${id}`)));
      set((state) => ({
        permissions: state.permissions.filter((p) => !ids.includes(p.id)),
      }));
    } catch (error) {
      throw error.response?.data?.error || 'Failed to delete permissions';
    }
  },

  setSelectedPermissions: (ids) => set({ selectedPermissions: ids }),
  toggleSelection: (id) => {
    set((state) => ({
      selectedPermissions: state.selectedPermissions.includes(id)
        ? state.selectedPermissions.filter((i) => i !== id)
        : [...state.selectedPermissions, id],
    }));
  },
}));

