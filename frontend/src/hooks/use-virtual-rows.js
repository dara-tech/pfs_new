import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Window visible row indices for long lists (reduces DOM + React memory).
 */
export function useVirtualRows(rowCount, rowHeight = 40, overscan = 6) {
  const containerRef = useRef(null);
  const [range, setRange] = useState({ start: 0, end: Math.min(rowCount, 30) });

  const updateRange = useCallback(() => {
    const el = containerRef.current;
    if (!el || rowCount <= 0) {
      setRange({ start: 0, end: 0 });
      return;
    }
    const scrollTop = el.scrollTop;
    const viewHeight = el.clientHeight || 400;
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(viewHeight / rowHeight) + overscan * 2;
    const end = Math.min(rowCount, start + visibleCount);
    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, [rowCount, rowHeight, overscan]);

  useEffect(() => {
    updateRange();
  }, [rowCount, updateRange]);

  const paddingTop = range.start * rowHeight;
  const paddingBottom = Math.max(0, (rowCount - range.end) * rowHeight);

  return {
    containerRef,
    onScroll: updateRange,
    start: range.start,
    end: range.end,
    paddingTop,
    paddingBottom,
    rowHeight,
    totalHeight: rowCount * rowHeight,
  };
}
