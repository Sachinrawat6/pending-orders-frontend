import { useEffect, useState } from 'react';
import { fetchProductStylesByCodes } from '../lib/api';

// Module-level cache so paging back and forth doesn't re-fetch known styles.
// `pendingCodes` (separate from the cache) dedupes concurrent requests without
// ever writing a placeholder into the cache before the real result is known —
// otherwise React StrictMode's dev-only double-invoked effect can cancel the
// first fetch before it resolves, and the replay would see the code as
// "already cached" and skip fetching it for good.
const styleImageCache = new Map();
const pendingCodes = new Set();

export const useProductImages = (orders) => {
  const [, forceRender] = useState(0);

  const codes = [
    ...new Set((orders || []).map((order) => String(order.style_number || '')).filter(Boolean)),
  ];
  const missing = codes.filter((code) => !styleImageCache.has(code) && !pendingCodes.has(code));

  useEffect(() => {
    if (missing.length === 0) return undefined;

    missing.forEach((code) => pendingCodes.add(code));
    let cancelled = false;

    fetchProductStylesByCodes(missing)
      .then((styles) => {
        const imageByCode = new Map(styles.map((style) => [style.style_number, style.images?.[0] || null]));
        missing.forEach((code) => {
          pendingCodes.delete(code);
          styleImageCache.set(code, imageByCode.get(code) ?? null);
        });
        if (!cancelled) forceRender((n) => n + 1);
      })
      .catch(() => {
        missing.forEach((code) => pendingCodes.delete(code));
        if (!cancelled) forceRender((n) => n + 1);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing.join(',')]);

  const imageFor = (styleNumber) => styleImageCache.get(String(styleNumber || '')) ?? null;

  return { imageFor };
};
