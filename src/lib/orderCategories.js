export const REASONS = [
  { value: 'Alter', label: 'Alter' },
  { value: 'Return Found', label: 'Return Found' },
  { value: 'Cancel Request', label: 'Cancel Request' },
];

// Reasons that resolve an order by flagging it for cancellation instead of
// marking it processed/moved to cutting.
const CANCEL_REASONS = new Set(['Cancel Request']);

export const isCancelReason = (reason) => CANCEL_REASONS.has(reason);

// These reasons mean the order is flagged Alter / Return Found / Scanned by
// Store — it only ever shows on the Ready for Process page, never Ready for
// Cutting. "Scanned by Store" is set by the Ready for Cutting store-scan
// page (see StoreScanPage) when a store scans a cutting-ready order onward.
const FORCE_READY_REASONS = new Set(['Alter', 'Return Found', 'Scanned by Store']);

export const isForceReadyReason = (reason) => FORCE_READY_REASONS.has(reason);

export const SCANNED_BY_STORE_REASON = 'Scanned by Store';

// Set by the Scan Order page (and the Pending Orders "Move to Cutting"
// action) when a stock-available order is routed by hand instead of
// automatically — these override both the stock check and the Alter/Return
// Found routing. Matched by substring rather than exact equality because a
// later manual action appends to the reason instead of replacing it (see
// mergeManualCuttingReason below), so the history stays visible while
// routing still keys off whichever action happened last.
export const MANUAL_PENDING_REASON = 'Manual Move To Pending';
export const MANUAL_CUTTING_REASON = 'Manual Move To Cutting';
export const MANUAL_PROCESS_REASON = 'Manual Move To Process';

export const isManualPendingReason = (reason) => String(reason || '').includes(MANUAL_PENDING_REASON);
export const isManualCuttingReason = (reason) => String(reason || '').includes(MANUAL_CUTTING_REASON);
export const isManualProcessReason = (reason) => String(reason || '').includes(MANUAL_PROCESS_REASON);

// Used by the Pending Orders "Move to Cutting" action: keeps the prior
// reason (e.g. "Manual Move To Pending") visible instead of clobbering it,
// so the order's history reads as "was manually pending, now manually
// moved to cutting" rather than losing the earlier note.
export const mergeManualCuttingReason = (currentReason) => {
  const existing = String(currentReason || '').trim();
  if (!existing || existing === 'NA' || isManualCuttingReason(existing)) {
    return MANUAL_CUTTING_REASON;
  }
  return `${existing}, ${MANUAL_CUTTING_REASON}`;
};

// Used by the Pending Orders "Move to Process" action — same append-not-
// replace behavior as mergeManualCuttingReason above.
export const mergeManualProcessReason = (currentReason) => {
  const existing = String(currentReason || '').trim();
  if (!existing || existing === 'NA' || isManualProcessReason(existing)) {
    return MANUAL_PROCESS_REASON;
  }
  return `${existing}, ${MANUAL_PROCESS_REASON}`;
};

// Maps style_number -> { availableStock, location, fabricName, fabricNumber }
// for whichever stock record has the highest availableStock for that style,
// since a style can appear under more than one fabric record.
export const buildStockInfoMap = (stockList) => {
  const info = new Map();
  (stockList || []).forEach((stock) => {
    (stock.styleNumbers || []).forEach((style) => {
      const current = info.get(style);
      const availableStock = stock.availableStock || 0;
      if (!current || availableStock > current.availableStock) {
        info.set(style, {
          availableStock,
          location: stock.location || '',
          fabricName: stock.fabricName || '',
          fabricNumber: stock.fabricNumber ?? '',
        });
      }
    });
  });
  return info;
};

export const isReadyForCutting = (order, stockInfoByStyle) =>
  (stockInfoByStyle.get(order.style_number)?.availableStock ?? 0) > 2;

// The reason shown to the user isn't always the raw stored value: an order
// that reaches Ready for Cutting purely because fabric stock is available
// (not because it was manually routed or flagged Alter / Return Found) never
// had a real reason set, so we label it "In stock available" instead of
// showing "NA".
export const getDisplayReason = (order, stockInfoByStyle) => {
  if (
    !order.isCancelApproval &&
    !order.isProcessed &&
    !isForceReadyReason(order.reason) &&
    !isManualPendingReason(order.reason) &&
    !isManualCuttingReason(order.reason) &&
    !isManualProcessReason(order.reason) &&
    isReadyForCutting(order, stockInfoByStyle)
  ) {
    return 'In stock available';
  }
  return order.reason;
};

// Splits a working set into the buckets the nav pages need, given an
// already-built stock info map. Priority:
// 1. Cancel-approval always wins (shows in Cancel Requests).
// 2. Shipped always wins next (shows in Shipped) — it's a terminal state.
// 3. A manual "Move To Cutting" forces Ready for Cutting regardless of
//    actual stock — checked before "Move To Pending" so that clicking
//    "Move to Cutting" on a pending order (which merges rather than
//    replaces the reason) always wins over the earlier pending note.
// 4. A manual "Move To Process" (Pending Orders page) forces Ready for
//    Process regardless of stock — same append-not-replace override as
//    Move To Cutting above, just routed to the other stage.
// 5. A manual "Move To Pending" (set from the Scan Order page) forces
//    Pending regardless of actual stock.
// 6. A force-ready reason (Alter / Return Found) goes only to Ready for
//    Process, never Ready for Cutting.
// 7. Otherwise, an already-processed order (resolved through the normal
//    flow) drops out of the active pipeline entirely.
// 8. Everything else is split Pending vs. Ready for Cutting by stock qty.
export const categorizeOrdersWithStockInfo = (orders, stockInfoByStyle) => {
  const pending = [];
  const readyForCutting = [];
  const readyForProcess = [];
  const cancelRequested = [];
  const processed = [];
  const shipped = [];

  (orders || []).forEach((order) => {
    if (order.isCancelApproval) {
      cancelRequested.push(order);
    } else if (order.isShipped) {
      shipped.push(order);
    } else if (isManualCuttingReason(order.reason)) {
      readyForCutting.push(order);
    } else if (isManualProcessReason(order.reason)) {
      readyForProcess.push(order);
    } else if (isManualPendingReason(order.reason)) {
      pending.push(order);
    } else if (isForceReadyReason(order.reason)) {
      readyForProcess.push(order);
    } else if (order.isProcessed) {
      processed.push(order);
    } else if (isReadyForCutting(order, stockInfoByStyle)) {
      readyForCutting.push(order);
    } else {
      pending.push(order);
    }
  });

  return { pending, readyForCutting, readyForProcess, cancelRequested, processed, shipped };
};

export const categorizeOrders = (orders, stockList) => {
  const stockInfoByStyle = buildStockInfoMap(stockList);
  return { ...categorizeOrdersWithStockInfo(orders, stockInfoByStyle), stockInfoByStyle };
};
