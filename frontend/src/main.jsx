import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
// Latin always; Khmer loaded on demand when locale is kh
import '@fontsource/google-sans/latin-400.css';
import '@fontsource/google-sans/latin-700.css';
import './index.css';
import { useAuthStore } from './lib/store';
import { useUIStore } from './lib/stores/uiStore';
import api from './lib/api';
import { loadKhmerFonts } from './lib/fonts';

useUIStore.getState().initTheme();
useUIStore.getState().initLocale();

if (useUIStore.getState().locale === 'kh') {
  void loadKhmerFonts();
}

useUIStore.subscribe((state, prev) => {
  if (state.locale === 'kh' && prev.locale !== 'kh') {
    void loadKhmerFonts();
  }
});

// Initialize user data from persisted storage
const initializeAuth = async () => {
  const { token, user, permissions, setPermissions, setRoles } = useAuthStore.getState();
  
  // If we have a token but no permissions/roles, fetch them
  if (token && user && (!permissions || permissions.length === 0)) {
    try {
      const response = await api.get('/auth/me');
      if (response.data.permissions) {
        setPermissions(response.data.permissions);
      }
      if (response.data.roles) {
        setRoles(response.data.roles);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      // If token is invalid, clear auth
      if (error.response?.status === 401) {
        useAuthStore.getState().logout();
      }
    }
  }
};

// Initialize auth before rendering
initializeAuth();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

