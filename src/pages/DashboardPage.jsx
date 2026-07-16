import { useMemo, useState } from 'react';
import {
  FiPackage,
  FiRepeat,
  FiScissors,
  FiXCircle,
  FiBarChart2,
  FiCalendar,
} from 'react-icons/fi';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { categorizeOrdersWithStockInfo } from '../lib/orderCategories';
import StatusBarChart from '../components/dashboard/StatusBarChart';

const toLocalDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const TODAY_KEY = toLocalDateKey(new Date());

const CARDS = [
  { key: 'pending', label: 'Pending', tone: 'amber', icon: FiPackage },
  { key: 'readyForProcess', label: 'Ready for Process', tone: 'violet', icon: FiRepeat },
  { key: 'readyForCutting', label: 'Ready for Cutting', tone: 'indigo', icon: FiScissors },
  { key: 'cancelRequested', label: 'Cancel Requests', tone: 'red', icon: FiXCircle },
];

const CARD_TONES = {
  amber: { ring: 'ring-amber-100', badge: 'bg-amber-50 text-amber-600' },
  violet: { ring: 'ring-violet-100', badge: 'bg-violet-50 text-violet-600' },
  indigo: { ring: 'ring-indigo-100', badge: 'bg-indigo-50 text-indigo-600' },
  red: { ring: 'ring-red-100', badge: 'bg-red-50 text-red-600' },
};

const DashboardPage = () => {
  const { orders, stockInfoByStyle } = useOrdersOverview();
  const [mode, setMode] = useState('single');
  const [singleDate, setSingleDate] = useState(TODAY_KEY);
  const [rangeStart, setRangeStart] = useState(TODAY_KEY);
  const [rangeEnd, setRangeEnd] = useState(TODAY_KEY);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const key = toLocalDateKey(order.order_date);
      if (!key) return false;
      return mode === 'single' ? key === singleDate : key >= rangeStart && key <= rangeEnd;
    });
  }, [orders, mode, singleDate, rangeStart, rangeEnd]);

  const stats = useMemo(
    () => categorizeOrdersWithStockInfo(filteredOrders, stockInfoByStyle),
    [filteredOrders, stockInfoByStyle]
  );

  const chartData = CARDS.map((card) => ({
    key: card.key,
    label: card.label,
    tone: card.tone,
    value: stats[card.key].length,
  }));

  const isToday = mode === 'single' && singleDate === TODAY_KEY;

  const resetToToday = () => {
    setMode('single');
    setSingleDate(TODAY_KEY);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200/60">
          <FiBarChart2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Order status overview for {isToday ? 'today' : 'the selected date'}.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-1.5 text-slate-400">
          <FiCalendar className="h-4 w-4" />
        </div>
        <div className="inline-flex rounded-lg border border-slate-300 p-0.5">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              mode === 'single'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Single Date
          </button>
          <button
            type="button"
            onClick={() => setMode('range')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              mode === 'range'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Date Range
          </button>
        </div>

        {mode === 'single' ? (
          <input
            type="date"
            value={singleDate}
            onChange={(event) => setSingleDate(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={rangeStart}
              onChange={(event) => setRangeStart(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <span className="text-sm text-slate-400">to</span>
            <input
              type="date"
              value={rangeEnd}
              onChange={(event) => setRangeEnd(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        )}

        {!isToday && (
          <button
            type="button"
            onClick={resetToToday}
            className="ml-auto text-sm font-medium text-indigo-600 hover:underline"
          >
            Back to Today
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CARDS.map((card) => {
          const tones = CARD_TONES[card.tone];
          return (
            <div
              key={card.key}
              className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ${tones.ring} transition hover:shadow-md`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones.badge}`}>
                <card.icon className="h-4.5 w-4.5" />
              </div>
              <p className="mt-3 font-display text-3xl font-semibold text-slate-900">
                {stats[card.key].length}
              </p>
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-700">Status Breakdown</h3>
            <p className="text-xs text-slate-400">
              {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'} in range
            </p>
          </div>
        </div>
        <StatusBarChart data={chartData} />
      </div>
    </div>
  );
};

export default DashboardPage;
