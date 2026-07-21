// Restricts an order list to a single channel. Case-insensitive since
// imported/manual data doesn't always match the canonical channel casing.
export const filterOrdersByChannel = (orders, channel) => {
  if (!channel) return orders;
  const target = channel.toLowerCase();
  return (orders || []).filter((order) => String(order.channel || '').toLowerCase() === target);
};
