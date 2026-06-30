import { useEffect, useMemo, useState } from 'react';

export const DEFAULT_PAGE_SIZE = 10;

export function useTablePagination(items, pageSize = DEFAULT_PAGE_SIZE, resetDeps = []) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const paginatedItems = useMemo(() => {
    const start = safePage * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  useEffect(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const rangeFrom = items.length === 0 ? 0 : safePage * pageSize + 1;
  const rangeTo = Math.min((safePage + 1) * pageSize, items.length);

  return {
    page,
    setPage,
    safePage,
    totalPages,
    paginatedItems,
    rangeFrom,
    rangeTo,
    pageSize,
  };
}
