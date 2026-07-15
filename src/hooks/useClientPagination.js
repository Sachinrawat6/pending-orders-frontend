import { useMemo, useState } from 'react';

// Paginates an already-in-memory array, for views built from a client-side
// categorized snapshot rather than a server-paginated endpoint.
export const useClientPagination = (items, pageSize = 25) => {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return {
    pageItems,
    pagination: { page: safePage, limit: pageSize, totalRecords: total, totalPages },
    setPage,
  };
};
