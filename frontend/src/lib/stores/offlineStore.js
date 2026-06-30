import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_CACHE_TTL_MS,
  MAX_CACHE_ENTRIES,
  isCacheablePayload,
  shouldCacheGet,
} from '../cachePolicy';

export const useOfflineStore = create(
  persist(
    (set, get) => ({
      // Pending submissions that failed to send
      pendingSubmissions: [],
      
      // Cached API responses
      cachedResponses: {},
      
      // Offline mode flag
      isOffline: !navigator.onLine,
      
      // Add submission to pending queue
      addPendingSubmission: (endpoint, data, method = 'POST') => {
        const pending = get().pendingSubmissions;
        const submission = {
          id: `pending_${Date.now()}_${Math.random()}`,
          endpoint,
          method,
          data,
          timestamp: new Date().toISOString(),
          retries: 0
        };
        set({ pendingSubmissions: [...pending, submission] });
        return submission.id;
      },
      
      // Remove submission after successful sync
      removePendingSubmission: (id) => {
        const pending = get().pendingSubmissions;
        set({ pendingSubmissions: pending.filter(s => s.id !== id) });
      },
      
      // Sync all pending submissions
      syncPendingSubmissions: async (api) => {
        const pending = get().pendingSubmissions;
        const results = [];
        
        for (const submission of pending) {
          try {
            let response;
            if (submission.method === 'POST') {
              response = await api.post(submission.endpoint, submission.data);
            } else if (submission.method === 'PUT') {
              response = await api.put(submission.endpoint, submission.data);
            }
            
            if (response?.data?.success) {
              get().removePendingSubmission(submission.id);
              results.push({ id: submission.id, success: true });
            }
          } catch (error) {
            // Increment retry count
            const updated = pending.map(s => 
              s.id === submission.id 
                ? { ...s, retries: s.retries + 1, lastError: error.message }
                : s
            );
            set({ pendingSubmissions: updated });
            results.push({ id: submission.id, success: false, error: error.message });
          }
        }
        
        return results;
      },
      
      // Cache API response (small payloads only; LRU cap)
      cacheResponse: (key, data, ttl = DEFAULT_CACHE_TTL_MS) => {
        if (!shouldCacheGet(key) || !isCacheablePayload(data)) return;

        const cached = { ...get().cachedResponses };
        delete cached[key];
        cached[key] = {
          data,
          timestamp: Date.now(),
          ttl,
        };

        const keys = Object.keys(cached);
        if (keys.length > MAX_CACHE_ENTRIES) {
          const sorted = keys.sort(
            (a, b) => (cached[a].timestamp || 0) - (cached[b].timestamp || 0)
          );
          sorted.slice(0, keys.length - MAX_CACHE_ENTRIES).forEach((k) => {
            delete cached[k];
          });
        }

        set({ cachedResponses: cached });
      },
      
      clearCachedResponse: (key) => {
        const cached = get().cachedResponses;
        if (!cached[key]) return;
        const updated = { ...cached };
        delete updated[key];
        set({ cachedResponses: updated });
      },

      // Get cached response if still valid
      getCachedResponse: (key) => {
        const cached = get().cachedResponses[key];
        if (!cached) return null;
        
        const age = Date.now() - cached.timestamp;
        if (age > cached.ttl) {
          // Expired, remove it
          const updated = { ...get().cachedResponses };
          delete updated[key];
          set({ cachedResponses: updated });
          return null;
        }
        
        return cached.data;
      },
      
      // Set offline status
      setOfflineStatus: (isOffline) => set({ isOffline })
    }),
    {
      name: 'offline-storage',
      partialize: (state) => ({
        pendingSubmissions: state.pendingSubmissions,
        cachedResponses: state.cachedResponses
      })
    }
  )
);
