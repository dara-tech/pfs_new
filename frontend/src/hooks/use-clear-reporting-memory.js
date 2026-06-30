import { useEffect } from 'react';
import { useReportingStore } from '../lib/stores/reportingStore';

/** Drop reporting store + optional local row state when leaving heavy export pages */
export function useClearReportingMemory(onClear) {
  useEffect(() => {
    return () => {
      useReportingStore.getState().clearMemory();
      onClear?.();
    };
  }, [onClear]);
}
