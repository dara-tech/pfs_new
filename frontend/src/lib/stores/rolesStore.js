import { create } from 'zustand';
import api from '../api';

export const useRolesStore = create((set, get) => ({
  roles: [],
  loading: false,
  error: null,
  selectedRoles: [],

  fetchRoles: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/admin/roles');
      set({ roles: response.data.roles || [], loading: false });
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to fetch roles', loading: false });
    }
  },

  createRole: async (data) => {
    try {
      const response = await api.post('/admin/roles', data);
      set((state) => ({ roles: [...state.roles, response.data.role] }));
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to create role';
    }
  },

  updateRole: async (id, data) => {
    try {
      const response = await api.put(`/admin/roles/${id}`, data);
      set((state) => ({
        roles: state.roles.map((r) => (r.id === id ? response.data.role : r)),
      }));
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to update role';
    }
  },

  deleteRole: async (id) => {
    try {
      await api.delete(`/admin/roles/${id}`);
      set((state) => ({
        roles: state.roles.filter((r) => r.id !== id),
      }));
    } catch (error) {
      throw error.response?.data?.error || 'Failed to delete role';
    }
  },

  massDelete: async (ids) => {
    try {
      await Promise.all(ids.map((id) => api.delete(`/admin/roles/${id}`)));
      set((state) => ({
        roles: state.roles.filter((r) => !ids.includes(r.id)),
      }));
    } catch (error) {
      throw error.response?.data?.error || 'Failed to delete roles';
    }
  },

  setSelectedRoles: (ids) => set({ selectedRoles: ids }),
  toggleSelection: (id) => {
    set((state) => ({
      selectedRoles: state.selectedRoles.includes(id)
        ? state.selectedRoles.filter((i) => i !== id)
        : [...state.selectedRoles, id],
    }));
  },
}));

