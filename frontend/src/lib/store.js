import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      permissions: [],
      roles: [],
      
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setPermissions: (permissions) => set({ permissions }),
      setRoles: (roles) => set({ roles }),
      
      logout: () => {
        set({ user: null, token: null, permissions: [], roles: [] });
        // Clear from localStorage
        localStorage.removeItem('auth-storage');
      },
      
      hasPermission: (permission) => {
        const state = useAuthStore.getState();
        return state.permissions?.includes(permission) || false;
      },
      
      hasRole: (role) => {
        const state = useAuthStore.getState();
        return state.roles?.includes(role) || false;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        permissions: state.permissions,
        roles: state.roles
      }),
    }
  )
);

