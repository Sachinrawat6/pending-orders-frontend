const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class ApiRequestError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new ApiRequestError('Could not reach the server. Is the backend running?', 0);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiRequestError(
      body?.message || `Request failed (${response.status})`,
      response.status
    );
  }

  return body;
}

export const fetchPendingOrders = async (page = 1, limit = 25) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const body = await request(`/pending-orders?${params.toString()}`);
  return body.data;
};

export const createPendingOrder = async (payload) => {
  const body = await request('/pending-orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return body.data;
};

export const bulkCreatePendingOrders = async (records) => {
  const body = await request('/pending-orders', {
    method: 'POST',
    body: JSON.stringify(records),
  });
  return body.data;
};

export const updatePendingOrder = async (id, payload) => {
  const body = await request(`/pending-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return body.data;
};

export const fetchNocoOrderById = async (orderId) => {
  const body = await request(`/pending-orders/nocodb/${encodeURIComponent(orderId)}`);
  return body.data;
};

export const fetchProductStylesByCodes = async (codes) => {
  if (!codes || codes.length === 0) return [];
  const params = new URLSearchParams({ codes: codes.join(',') });
  const body = await request(`/product-styles?${params.toString()}`);
  return body.data;
};

export const fetchUserByEmployeeId = async (employee_id) => {
  if (!employee_id) {
    return [];
  }
  const body = await request(`/pending-orders/nocodb/user/${employee_id}`);
  return body.data[0];
};

// Large single-page fetch used by the Pending / Ready-for-Cutting / Cancel
// Request views, which categorize the whole working set client-side rather
// than needing dedicated server-side filters. The 30-day TTL on pending
// orders keeps this set small enough for that to stay cheap.
export const fetchAllPendingOrders = async (limit = 2000) => {
  const result = await fetchPendingOrders(1, limit);
  return result.orders;
};

const STOCK_API_URL = 'https://raw-material-backend.onrender.com/api/v1/stock';

export const fetchStockList = async () => {
  let response;
  try {
    response = await fetch(STOCK_API_URL);
  } catch {
    throw new ApiRequestError('Could not reach the stock service.', 0);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiRequestError(
      body?.message || `Stock request failed (${response.status})`,
      response.status
    );
  }

  return body?.data || [];
};

const STOCK_UPDATE_API_URL = `${STOCK_API_URL}/update`;

// Resets a single fabric's stock quantity (used after a scanned order with
// that fabric is manually moved back to Pending, since it consumed the
// fabric that made it look available).
export const updateFabricStock = async (fabricNumber, stockQuantity) => {
  let response;
  try {
    response = await fetch(STOCK_UPDATE_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fabricNumber, stockQuantity }),
    });
  } catch {
    throw new ApiRequestError('Could not reach the stock service.', 0);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiRequestError(
      body?.message || `Stock update failed (${response.status})`,
      response.status
    );
  }

  return body?.data;
};

// OTP request/verify for the "Cancel" flow (see components/common/CancelOtpDialog).
// Whitelist management and the OTP inbox itself live in the separate
// otp-console app — this app only ever requests + verifies a code.
export const requestCancelOtp = async (phone) => {
  const body = await request('/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
  return body.data; // { name }
};

export const verifyCancelOtp = async (phone, otp) => {
  const body = await request('/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });
  return body.data; // { verified: true }
};

export { ApiRequestError };
