const LOW_STOCK_KEY = 'pending_orders_low_stock_scan_queue';
const STOCK_AVAILABLE_KEY = 'pending_orders_stock_available_scan_queue';

// Buffers scans client-side so a whole scanning session can be reviewed and
// bulk-saved / routed later, and survives an accidental page refresh
// mid-session.
const load = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const save = (key, items) => {
  localStorage.setItem(key, JSON.stringify(items));
};

const clear = (key) => {
  localStorage.removeItem(key);
};

export const loadLowStockQueue = () => load(LOW_STOCK_KEY);
export const saveLowStockQueue = (items) => save(LOW_STOCK_KEY, items);
export const clearLowStockQueue = () => clear(LOW_STOCK_KEY);

export const loadStockAvailableQueue = () => load(STOCK_AVAILABLE_KEY);
export const saveStockAvailableQueue = (items) => save(STOCK_AVAILABLE_KEY, items);
export const clearStockAvailableQueue = () => clear(STOCK_AVAILABLE_KEY);
