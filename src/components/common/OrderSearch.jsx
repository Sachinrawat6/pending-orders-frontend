import { FiSearch, FiX } from 'react-icons/fi';

// Drop-in search box for any order-listing page — filters by Order ID or
// Style Number. Purely controlled: the page owns the query string and
// decides how to filter/paginate with it.
const OrderSearch = ({ value, onChange, placeholder = 'Search by Order ID or Style Number…' }) => (
  <div className="relative">
    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
      <FiSearch className="h-4 w-4" />
    </span>
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="absolute inset-y-0 right-2 flex items-center text-slate-400 transition hover:text-slate-600"
      >
        <FiX className="h-4 w-4" />
      </button>
    )}
  </div>
);

export default OrderSearch;
