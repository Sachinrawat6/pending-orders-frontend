// Filters orders to those whose order_date falls within [from, to]
// (both inclusive, given as yyyy-mm-dd strings from a <input type="date">).
export const filterOrdersByDateRange = (orders, { from, to } = {}) => {
  if (!from && !to) return orders;

  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null;

  return (orders || []).filter((order) => {
    const time = order.order_date ? new Date(order.order_date).getTime() : NaN;
    if (Number.isNaN(time)) return false;
    if (fromTime !== null && time < fromTime) return false;
    if (toTime !== null && time > toTime) return false;
    return true;
  });
};
