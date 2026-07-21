import { FiX } from 'react-icons/fi';

// Filters an order list by order_date range. Purely controlled — the page
// owns { from, to } and decides how to apply it (see filterOrdersByDateRange).
const DateRangeFilter = ({ from, to, onChange }) => {
  const hasValue = Boolean(from || to);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-sm text-slate-500">
        From
        <input
          type="date"
          value={from || ''}
          onChange={(event) => onChange({ from: event.target.value, to })}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-slate-500">
        To
        <input
          type="date"
          value={to || ''}
          onChange={(event) => onChange({ from, to: event.target.value })}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </label>
      {hasValue && (
        <button
          type="button"
          onClick={() => onChange({ from: '', to: '' })}
          aria-label="Clear date filter"
          className="inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-600"
        >
          <FiX className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );
};

export default DateRangeFilter;
