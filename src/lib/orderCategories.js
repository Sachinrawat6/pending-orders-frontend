import { getDaysSince } from './formatters';

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

// Minimum available stock a fabric needs to count as "in stock" — a style
// only counts as fully stocked when every one of its linked fabrics clears
// this, not just its best one (see buildStockInfoMap below).
export const STOCK_THRESHOLD = 2;

// Maps style_number -> {
//   availableStock, location, fabricName, fabricNumber, // the single
//     highest-stock fabric linked to this style, kept for backwards-
//     compatible display where only one fabric is shown,
//   fabrics: [{ fabricNumber, fabricName, location, availableStock }],
//     // every fabric linked to this style (a style can be cut from more
//     // than one fabric number),
//   isFullyStocked, // true only when EVERY linked fabric individually
//     // clears STOCK_THRESHOLD — a style with 3 fabrics where only one has
//     // stock is NOT ready, since the other two are still short.
// }
export const buildStockInfoMap = (stockList) => {
  const grouped = new Map();
  (stockList || []).forEach((stock) => {
    (stock.styleNumbers || []).forEach((style) => {
      if (!grouped.has(style)) grouped.set(style, []);
      grouped.get(style).push(stock);
    });
  });

  const info = new Map();
  grouped.forEach((records, style) => {
    const fabrics = records.map((r) => ({
      fabricNumber: r.fabricNumber ?? '',
      fabricName: r.fabricName || '',
      location: r.location || '',
      availableStock: r.availableStock || 0,
    }));
    const best = fabrics.reduce((a, b) => (b.availableStock > a.availableStock ? b : a));
    info.set(style, {
      availableStock: best.availableStock,
      location: best.location,
      fabricName: best.fabricName,
      fabricNumber: best.fabricNumber,
      fabrics,
      isFullyStocked: fabrics.every((f) => f.availableStock > STOCK_THRESHOLD),
    });
  });
  return info;
};

export const isReadyForCutting = (order, stockInfoByStyle) =>
  stockInfoByStyle?.get(order.style_number)?.isFullyStocked ?? false;

// An order still genuinely stuck in Pending (no stock, no manual override)
// auto-cancels once it's been sitting for too long — except Shopify, which
// is excluded (its own fulfilment timeline runs longer than other channels).
export const AUTO_CANCEL_AFTER_DAYS = 5;
const AUTO_CANCEL_EXCLUDED_CHANNELS = new Set(['Shopify']);
export const AUTO_CANCEL_REASON = 'Auto-Cancelled (Pending 5+ Days)';

export const isStalePendingOrder = (order) => {
  if (AUTO_CANCEL_EXCLUDED_CHANNELS.has(order.channel)) return false;
  const days = getDaysSince(order.order_date);
  return days !== null && days > AUTO_CANCEL_AFTER_DAYS;
};

// Single source of truth for "what stage is this order in" — used by both
// categorizeOrdersWithStockInfo (bucketing) and the OrdersTable status badge,
// so the two can never drift out of sync with each other. Priority:
// 1. isCancelled always wins first (shows in Cancelled) — set by the
//    Cancelled page's "Mark as Cancelled" action, it's a harder terminal
//    state than the mere cancel-approval flag below.
// 2. Cancel-approval wins next (shows in Cancel Requests).
// 3. Shipped wins next (shows in Shipped) — the most terminal state an
//    order can reach, checked before isProcessComplete so a Processed order
//    that later gets shipped still moves to Shipped rather than staying put.
// 4. isProcessComplete (Ready for Process page's "Mark as Processed" action)
//    shows in Processed — checked here, before the reason-based routing
//    below, so it overrides whatever reason originally routed the order to
//    Ready for Process.
// 5. A manual "Move To Cutting" forces Ready for Cutting regardless of
//    actual stock — checked before "Move To Pending" so that clicking
//    "Move to Cutting" on a pending order (which merges rather than
//    replaces the reason) always wins over the earlier pending note.
// 6. A manual "Move To Process" (Pending Orders page) forces Ready for
//    Process regardless of stock — same append-not-replace override as
//    Move To Cutting above, just routed to the other stage.
// 7. A manual "Move To Pending" (set from the Scan Order page, usually
//    alongside zeroing the fabric that made it look available) is NOT a
//    firm route like the two above — it only holds while the style's
//    fabric is actually still short. If stock is later replenished (a new
//    delivery, a correction, etc.) the order graduates to Ready for Cutting
//    on its own; if instead it just sits there too long (see
//    isStalePendingOrder), it auto-cancels same as any other stale pending
//    order — it isn't stuck in Pending forever just because it was manually
//    sent there once.
// 8. A force-ready reason (Alter / Return Found) goes only to Ready for
//    Process, never Ready for Cutting.
// 9. Otherwise, an already-processed order (resolved through the normal
//    flow) drops out of the active pipeline entirely.
// 10. Everything else is Ready for Cutting if stocked, else Cancel Requests
//    if stale (see isStalePendingOrder), else Pending.
export const resolveOrderStage = (order, stockInfoByStyle) => {
  if (order.isCancelled) return 'cancelled';
  if (order.isCancelApproval) return 'cancelRequested';
  if (order.isShipped) return 'shipped';
  if (order.isProcessComplete) return 'processed';
  if (isManualCuttingReason(order.reason)) return 'readyForCutting';
  if (isManualProcessReason(order.reason)) return 'readyForProcess';
  if (isManualPendingReason(order.reason)) {
    if (isReadyForCutting(order, stockInfoByStyle)) return 'readyForCutting';
    return isStalePendingOrder(order) ? 'cancelRequested' : 'pending';
  }
  if (isForceReadyReason(order.reason)) return 'readyForProcess';
  if (order.isProcessed) return 'processed';
  if (isReadyForCutting(order, stockInfoByStyle)) return 'readyForCutting';
  return isStalePendingOrder(order) ? 'cancelRequested' : 'pending';
};

// The reason shown to the user isn't always the raw stored value:
// - An order that reaches Ready for Cutting purely because fabric stock is
//   available (not because it was manually routed) never had a real reason
//   set, so we label it "In stock available" instead of showing "NA".
// - An order that auto-cancelled for sitting too long (rather than a real
//   Cancel Request) shows that explicitly instead of its unrelated original
//   reason (e.g. "No Fabric"), so it's clear why it landed there.
export const getDisplayReason = (order, stockInfoByStyle) => {
  const stage = resolveOrderStage(order, stockInfoByStyle);
  if (stage === 'cancelRequested' && !order.isCancelApproval) {
    return AUTO_CANCEL_REASON;
  }
  if (stage === 'readyForCutting' && !isManualCuttingReason(order.reason)) {
    return 'In stock available';
  }
  return order.reason;
};

// Splits a working set into the buckets the nav pages need, given an
// already-built stock info map — see resolveOrderStage above for the rules.
export const categorizeOrdersWithStockInfo = (orders, stockInfoByStyle) => {
  const buckets = {
    pending: [],
    readyForCutting: [],
    readyForProcess: [],
    cancelRequested: [],
    cancelled: [],
    processed: [],
    shipped: [],
  };

  (orders || []).forEach((order) => {
    buckets[resolveOrderStage(order, stockInfoByStyle)].push(order);
  });

  return buckets;
};

export const categorizeOrders = (orders, stockList) => {
  const stockInfoByStyle = buildStockInfoMap(stockList);
  return { ...categorizeOrdersWithStockInfo(orders, stockInfoByStyle), stockInfoByStyle };
};
