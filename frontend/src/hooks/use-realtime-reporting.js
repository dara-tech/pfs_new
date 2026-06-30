import { useEffect, useRef } from 'react';
import { shouldUsePhpApiGateway } from '../lib/apiBase';

/**
 * Realtime transport hook:
 * - Tries WebSocket first (if endpoint available)
 * - Falls back to polling when socket is unavailable/disconnected
 */
export default function useRealtimeReporting({
  enabled = false,
  intervalMs = 30000,
  fetcher,
  onData,
  onError,
  wsPath = '/api/reporting/realtime',
  subscribePayload = null,
}) {
  const runningRef = useRef(false);
  const socketRef = useRef(null);
  const fetcherRef = useRef(fetcher);
  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    fetcherRef.current = fetcher;
    onDataRef.current = onData;
    onErrorRef.current = onError;
  }, [fetcher, onData, onError]);

  useEffect(() => {
    if (!enabled || typeof fetcherRef.current !== 'function' || typeof onDataRef.current !== 'function') {
      return undefined;
    }

    let cancelled = false;
    let timer = null;

    const isVisible = () => {
      if (typeof document === 'undefined') return true;
      return document.visibilityState === 'visible';
    };

    const tick = async () => {
      if (!isVisible()) return;
      if (runningRef.current || cancelled) return;
      runningRef.current = true;
      try {
        const data = await fetcherRef.current();
        if (!cancelled) onDataRef.current(data);
      } catch (error) {
        if (!cancelled && typeof onErrorRef.current === 'function') {
          onErrorRef.current(error);
        }
      } finally {
        runningRef.current = false;
      }
    };

    const startPolling = () => {
      if (timer || cancelled) return;
      void tick(); // immediate refresh when transport starts/falls back
      timer = setInterval(tick, intervalMs);
    };

    const stopPolling = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const startWebSocket = () => {
      // HostPapa PHP gateway cannot proxy WebSockets to the VPS API.
      if (shouldUsePhpApiGateway()) {
        startPolling();
        return;
      }

      if (typeof window === 'undefined' || !('WebSocket' in window)) {
        startPolling();
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}${wsPath}`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          stopPolling();
          void tick(); // immediate sync on connect
          if (subscribePayload) {
            try {
              ws.send(JSON.stringify({ type: 'subscribe', ...subscribePayload }));
            } catch (error) {
              if (typeof onErrorRef.current === 'function') onErrorRef.current(error);
            }
          }
        };

        ws.onmessage = () => {
          // Server push trigger; fetch authoritative filtered dataset.
          void tick();
        };

        ws.onerror = () => {
          // Keep app functional when WS endpoint doesn't exist.
          startPolling();
        };

        ws.onclose = () => {
          socketRef.current = null;
          startPolling();
        };
      } catch (error) {
        if (typeof onErrorRef.current === 'function') onErrorRef.current(error);
        startPolling();
      }
    };

    startWebSocket();

    const handleVisibilityChange = () => {
      if (cancelled) return;
      if (isVisible()) {
        void tick();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      cancelled = true;
      stopPolling();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [enabled, intervalMs, wsPath, subscribePayload]);
}

