// NocoDB's created_at looks like "2025-02-23 05:44:33+00:00" — a space
// instead of "T" isn't reliably parsed by Date() across browsers, so
// normalize it to a proper ISO-8601 string first.
export const parseNocoDate = (value) => {
  if (!value) return null;
  const isoLike = String(value).trim().replace(' ', 'T');
  const date = new Date(isoLike);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildPendingOrderPayload = (nocoRecord, employee) => ({
  style_number: Number(nocoRecord.style_number),
  order_id: Number(nocoRecord.order_id),
  size: String(nocoRecord.size || '').trim(),
  channel: String(nocoRecord.channel || '').trim(),
  order_date: (parseNocoDate(nocoRecord.created_at) || new Date()).toISOString(),
  employee_id: Number(employee.id),
  employee_name: String(employee.name || '').trim(),
  reason: String('No Fabric'),
});

export const isDuplicateOrderError = (message) =>
  typeof message === 'string' && message.includes('E11000') && message.includes('order_id');
