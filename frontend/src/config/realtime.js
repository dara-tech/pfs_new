/** Dashboard auto-refresh interval (ms). Override with VITE_REALTIME_INTERVAL_MS in .env */
export const REALTIME_INTERVAL_MS = Number(
  import.meta.env.VITE_REALTIME_INTERVAL_MS || 60000
);
