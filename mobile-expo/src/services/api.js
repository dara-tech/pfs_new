import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get API base URL from environment configuration
// Priority:
// 1. EXPO_PUBLIC_API_URL environment variable (from .env file)
// 2. Constants.expoConfig.extra.apiUrl (from app.config.js)
// 3. Default based on __DEV__ flag
const PRODUCTION_URL = 'http://107.175.91.211:3000';

const getApiBaseUrl = () => {
  // Release build: always use production URL (expoConfig can be undefined in standalone)
  if (!__DEV__) {
    const fromConfig = Constants.expoConfig?.extra?.apiUrl;
    if (fromConfig && !fromConfig.includes('localhost') && !fromConfig.includes('127.0.0.1')) {
      return fromConfig;
    }
    return PRODUCTION_URL;
  }

  // Development: prefer config then env then production
  if (Constants.expoConfig?.extra?.apiUrl) {
    const configUrl = Constants.expoConfig.extra.apiUrl;
    if (configUrl.includes('localhost') || configUrl.includes('127.0.0.1')) {
      return PRODUCTION_URL;
    }
    return configUrl;
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return PRODUCTION_URL;
    }
    return envUrl;
  }
  return PRODUCTION_URL;
};

const API_BASE_URL = getApiBaseUrl();
const ENVIRONMENT = Constants.expoConfig?.extra?.environment || (__DEV__ ? 'development' : 'production');

console.log('[API] Configuration:', {
  baseUrl: API_BASE_URL,
  platform: Platform.OS,
  dev: __DEV__,
  environment: ENVIRONMENT,
  source: process.env.EXPO_PUBLIC_API_URL ? 'env' : (Constants.expoConfig?.extra?.apiUrl ? 'config' : 'default')
});

// Test API connectivity on startup
if (__DEV__) {
  (async () => {
    try {
      const testResponse = await fetch(`${API_BASE_URL}/api/health`);
      if (testResponse.ok) {
        console.log('[API] ✅ Backend is reachable');
      } else {
        console.warn('[API] ⚠️ Backend responded with status:', testResponse.status);
      }
    } catch (error) {
      console.error('[API] ❌ Cannot reach backend:', error.message);
      console.error('[API] 💡 If using physical device, make sure:');
      console.error('[API]    1. Device and computer are on same WiFi network');
      console.error('[API]    2. Backend is running on port 3000');
      console.error('[API]    3. Firewall allows connections on port 3000');
      console.error('[API]    4. Try using IP address instead of localhost');
        }
  })();
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds - increased for slower connections
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Add any auth tokens here if needed
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      await AsyncStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

// Development flag to force offline mode for testing
// Set to true to simulate offline mode even when connected
const FORCE_OFFLINE_MODE = false; // Change to true to test offline functionality

// Check network connectivity (respects FORCE_OFFLINE_MODE)
export const isConnected = async () => {
  // Development mode: force offline for testing
  if (__DEV__ && FORCE_OFFLINE_MODE) {
    console.log('[API] 🔧 Development mode: Forcing offline mode');
    return false;
  }
  
  const state = await NetInfo.fetch();
  return state.isConnected;
};

// Get actual network state (ignores FORCE_OFFLINE_MODE) - for status display
export const getNetworkState = async () => {
  const state = await NetInfo.fetch();
  // If forcing offline mode, return offline state for UI
  if (__DEV__ && FORCE_OFFLINE_MODE) {
    return { ...state, isConnected: false };
  }
  return state;
};

// Helper function to detect if an error is a network error
export const isNetworkError = (error) => {
  if (!error) return false;
  
  // Check error codes
  const networkErrorCodes = [
    'ECONNABORTED',    // Timeout
    'ERR_NETWORK',     // Network error
    'ENOTFOUND',       // DNS lookup failed
    'ECONNREFUSED',    // Connection refused
    'ETIMEDOUT',       // Connection timeout
    'EHOSTUNREACH',    // Host unreachable
  ];
  
  if (networkErrorCodes.includes(error.code)) {
    return true;
  }
  
  // Check error message
  const networkErrorMessages = [
    'Network Error',
    'timeout',
    'Network request failed',
    'Failed to fetch',
    'Unable to resolve host',
  ];
  
  if (error.message) {
    const lowerMessage = error.message.toLowerCase();
    if (networkErrorMessages.some(msg => lowerMessage.includes(msg.toLowerCase()))) {
      return true;
    }
  }
  
  // Check if there's no response (usually means network issue)
  if (!error.response && error.request) {
    return true;
  }
  
  return false;
};

// Client Questionnaire API
export const questionnaireAPI = {
  // Get all sites
  getSites: async () => {
    const url = '/api/questionnaire/sites';
    console.log('[API] getSites:', { url, fullUrl: API_BASE_URL + url });
    try {
      const response = await api.get(url);
      console.log('[API] getSites success:', { status: response.status, count: response.data?.sites?.length });
      return response;
    } catch (error) {
      console.error('[API] getSites error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
      throw error;
    }
  },

  // Get all tokens
  getTokens: async () => {
    const url = '/api/questionnaire/tokens';
    console.log('[API] getTokens:', { url, fullUrl: API_BASE_URL + url });
    try {
      const response = await api.get(url);
      console.log('[API] getTokens success:', { status: response.status, count: response.data?.tokens?.length });
      return response;
    } catch (error) {
      console.error('[API] getTokens error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        url: error.config?.url,
      });
      throw error;
    }
  },

  // Get client page
  getClientPage: async (token, locale, uuid, index) => {
    // When uuid and index are provided, locale is REQUIRED in the route
    // When uuid and index are NOT provided, locale is optional
    let url;
    if (uuid && index) {
      // Route: /client/:token/:locale/:uuid/:index (locale is required)
      const currentLocale = locale || 'kh';
      url = `/api/questionnaire/client/${token}/${currentLocale}/${uuid}/${index}`;
    } else {
      // Route: /client/:token/:locale? (locale is optional)
      const currentLocale = locale || 'kh';
      url = `/api/questionnaire/client/${token}/${currentLocale}`;
    }
    console.log('[API] getClientPage:', { token, locale, uuid, index, url });
    return api.get(url);
  },

  // Save client page
  saveClientPage: async (token, index, data) => {
    console.log('[API] saveClientPage called:', { token, index, data, hasUri: !!data?._uri, uriValue: data?._uri });
    const response = await api.post(`/api/questionnaire/client/${token}/${index}`, data);
    console.log('[API] saveClientPage response:', { status: response.status, data: response.data });
    return response;
  },

  // Get provider page
  getProviderPage: async (token, locale, uuid, index) => {
    // When uuid and index are provided, locale is REQUIRED in the route
    // When uuid and index are NOT provided, locale is optional
    let url;
    if (uuid && index) {
      // Route: /provider/:token/:locale/:uuid/:index (locale is required)
      const currentLocale = locale || 'kh';
      url = `/api/questionnaire/provider/${token}/${currentLocale}/${uuid}/${index}`;
    } else {
      // Route: /provider/:token/:locale? (locale is optional)
      const currentLocale = locale || 'kh';
      url = `/api/questionnaire/provider/${token}/${currentLocale}`;
    }
    console.log('[API] getProviderPage:', { token, locale, uuid, index, url });
    return api.get(url);
  },

  // Save provider page
  saveProviderPage: async (token, index, data) => {
    return api.post(`/api/questionnaire/provider/${token}/${index}`, data);
  },
};

// Check if the API server is reachable (e.g. before syncing offline queue)
export const checkServerReachable = async () => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
};

// Settings API - Public endpoints (no auth required)
export const settingsAPI = {};

export default api;
