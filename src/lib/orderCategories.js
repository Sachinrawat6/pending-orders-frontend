export const REASONS = [
  { value: 'Alter', label: 'Alter' },
  { value: 'Return Found', label: 'Return Found' },
  { value: 'Cancel Request', label: 'Cancel Request' },
];

// Reasons that resolve an order by flagging it for cancellation instead of
// marking it processed/moved to cutting.
const CANCEL_REASONS = new Set(['Cancel Request']);

export const isCancelReason = (reason) => CANCEL_REASONS.has(reason);

// These reasons mean "send to cutting regardless of fabric stock" — a manual
// override of the normal stock-based Ready-for-Cutting check.
const FORCE_READY_REASONS = new Set(['Alter', 'Return Found']);

export const isForceReadyReason = (reason) => FORCE_READY_REASONS.has(reason);

// Maps style_number -> { availableStock, location, fabricName } for whichever
// stock record has the highest availableStock for that style, since a style
// can appear under more than one fabric record.
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
// (not because it was flagged Alter / Return Found) never had a real reason
// set, so we label it "In stock available" instead of showing "NA".
export const getDisplayReason = (order, stockInfoByStyle) => {
  if (
    !order.isCancelApproval &&
    !order.isProcessed &&
    !isForceReadyReason(order.reason) &&
    isReadyForCutting(order, stockInfoByStyle)
  ) {
    return 'In stock available';
  }
  return order.reason;
};

// Splits the full working set into the buckets the nav pages need. Priority:
// 1. Cancel-approval always wins (shows in Cancel Requests).
// 2. Shipped always wins next (shows in Shipped) — it's a terminal state.
// 3. A force-ready reason (Alter / Return Found) sends it to Ready for
//    Cutting even with zero stock — it's a manual override of the stock check.
// 4. Otherwise, an already-processed order (resolved through the normal flow,
//    reason "NA") drops out of the active pipeline entirely.
// 5. Everything else is split Pending vs. Ready for Cutting by stock qty.
export const categorizeOrders = (orders, stockList) => {
  const stockInfoByStyle = buildStockInfoMap(stockList);

  const pending = [];
  const readyForCutting = [];
  const cancelRequested = [];
  const processed = [];
  const shipped = [];

  (orders || []).forEach((order) => {
    if (order.isCancelApproval) {
      cancelRequested.push(order);
    } else if (order.isShipped) {
      shipped.push(order);
    } else if (isForceReadyReason(order.reason)) {
      readyForCutting.push(order);
    } else if (order.isProcessed) {
      processed.push(order);
    } else if (isReadyForCutting(order, stockInfoByStyle)) {
      readyForCutting.push(order);
    } else {
      pending.push(order);
    }
  });

  return { pending, readyForCutting, cancelRequested, processed, shipped, stockInfoByStyle };
};
