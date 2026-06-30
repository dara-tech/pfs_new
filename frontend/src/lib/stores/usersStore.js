import { create } from 'zustand';
import api from '../api';

export const useUsersStore = create((set, get) => ({
  users: [],
  loading: false,
  error: null,
  selectedUsers: [],

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/admin/users');
      set({ users: response.data.users || [], loading: false });
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to fetch users', loading: false });
    }
  },

  createUser: async (data) => {
    try {
      const response = await api.post('/admin/users', data);
      set((state) => ({ users: [...state.users, response.data.user] }));
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to create user';
    }
  },

  updateUser: async (id, data) => {
    try {
      const response = await api.put(`/admin/users/${id}`, data);
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? response.data.user : u)),
      }));
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to update user';
    }
  },

  deleteUser: async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
      }));
    } catch (error) {
      throw error.response?.data?.error || 'Failed to delete user';
    }
  },

  resetPassword: async (id) => {
    try {
      const response = await api.post(`/admin/users/${id}/reset-password`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to reset password';
    }
  },

  massDelete: async (ids) => {
    try {
      await Promise.all(ids.map((id) => api.delete(`/admin/users/${id}`)));
      set((state) => ({
        users: state.users.filter((u) => !ids.includes(u.id)),
      }));
    } catch (error) {
      throw error.response?.data?.error || 'Failed to delete users';
    }
  },

  setSelectedUsers: (ids) => set({ selectedUsers: ids }),
  toggleSelection: (id) => {
    set((state) => ({
      selectedUsers: state.selectedUsers.includes(id)
        ? state.selectedUsers.filter((i) => i !== id)
        : [...state.selectedUsers, id],
    }));
  },
}));

