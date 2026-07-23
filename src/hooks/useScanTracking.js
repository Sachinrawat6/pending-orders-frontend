import { useEffect, useState } from 'react';
import { fetchScanTrackingRecords } from '../lib/api';

// Looks up the NocoDB scan-tracking table for each visible order and returns
// the most recently scanned employee's name (or null if never scanned) —
// used by the Processed page to show who last scanned an order.
//
// Unlike useProductImages, results are NOT cached forever once fetched: a
// style's product image never changes, but an order's scan status is live —
// an order with no scan yet can get one at any moment, and permanently
// caching that first "not scanned" result would leave it stuck showing "—"
// even after a real scan happens. Refetching keys off the `orders` array
// reference itself (which the caller's data layer replaces with a fresh
// array on every reload), so a manual refresh actually reflects new scans.
export const useScanTracking = (orders) => {
  const [scanStatusById, setScanStatusById] = useState(new Map());

  useEffect(() => {
    const orderIds = [
      ...new Set((orders || []).map((order) => String(order.order_id || '')).filter(Boolean)),
    ];

    if (orderIds.length === 0) {
      setScanStatusById(new Map());
      return undefined;
    }

    let cancelled = false;

    Promise.all(
      orderIds.map(async (id) => {
        try {
          const records = await fetchScanTrackingRecords(id);
          if (!records || records.length === 0) return [id, null];
          const latest = records.reduce((a, b) =>
            new Date(b.scanned_timestamp) > new Date(a.scanned_timestamp) ? b : a
          );
          return [id, latest.employees?.user_name || null];
        } catch {
          return [id, null];
        }
      })
    ).then((entries) => {
      if (!cancelled) setScanStatusById(new Map(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [orders]);

  const scanStatusFor = (orderId) => scanStatusById.get(String(orderId || '')) ?? null;

  return { scanStatusFor };
};
