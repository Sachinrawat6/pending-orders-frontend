// Shared by every order-listing page so "search" means the same thing
// everywhere: a partial, case-insensitive match against Order ID or Style
// Number.
export const filterOrdersBySearch = (orders, query) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return orders;

  return (orders || []).filter(
    (order) =>
      String(order.order_id ?? '').toLowerCase().includes(needle) ||
      String(order.style_number ?? '').toLowerCase().includes(needle)
  );
};
