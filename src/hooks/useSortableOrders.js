import { useMemo, useState } from 'react';
import { getDaysSince } from '../lib/formatters';

// Value getters for every column an OrdersTable header can sort by.
const VALUE_GETTERS = {
  style_number: (order) => order.style_number ?? 0,
  channel: (order) => String(order.channel || '').toLowerCase(),
  order_date: (order) => {
    const time = order.order_date ? new Date(order.order_date).getTime() : NaN;
    return Number.isNaN(time) ? 0 : time;
  },
  pending_days: (order) => getDaysSince(order.order_date) ?? 0,
};

const compareValues = (a, b) => {
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

// Multi-column sort: clicking a header cycles that column asc -> desc -> off,
// and moves it to the front of the priority list so the most recently
// clicked column wins ties first — this lets Style Number and Channel (say)
// both be active sorts "at the same time", with the newest click as primary
// and older clicks as tie-breakers.
export const useSortableOrders = (orders, defaultSort = null) => {
  const [rules, setRules] = useState([]);

  const toggleSort = (key) => {
    setRules((prev) => {
      const existing = prev.find((rule) => rule.key === key);
      const rest = prev.filter((rule) => rule.key !== key);
      if (!existing) return [{ key, direction: 'asc' }, ...rest];
      if (existing.direction === 'asc') return [{ key, direction: 'desc' }, ...rest];
      return rest;
    });
  };

  const activeRules = rules.length > 0 ? rules : defaultSort ? [defaultSort] : [];

  const sorted = useMemo(() => {
    if (activeRules.length === 0) return orders;
    return [...orders].sort((a, b) => {
      for (const rule of activeRules) {
        const getter = VALUE_GETTERS[rule.key];
        if (!getter) continue;
        const cmp = compareValues(getter(a), getter(b));
        if (cmp !== 0) return rule.direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, JSON.stringify(activeRules)]);

  return { sorted, sortRules: activeRules, toggleSort };
};
