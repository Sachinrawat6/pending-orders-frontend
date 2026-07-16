import { useRef, useState } from 'react';
import { FiCamera, FiSearch, FiTruck } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import EmptyState from '../components/common/EmptyState';
import CameraScannerDialog from '../components/scan/CameraScannerDialog';
import { useAuth } from '../context/AuthContext';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { updatePendingOrder } from '../lib/api';
import { formatDate, formatValue } from '../lib/formatters';

const ShipOrderPage = () => {
  const { employee } = useAuth();
  const { readyForCutting, readyForProcess, loading, error, reload } = useOrdersOverview();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [foundOrder, setFoundOrder] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [shippedItems, setShippedItems] = useState([]);
  const inputRef = useRef(null);

  // Only orders that have actually reached the cutting stage — normally via
  // stock/manual routing, or flagged Alter/Return Found — are eligible to ship.
  const shippableOrders = [...readyForCutting, ...readyForProcess];

  const handleLookup = (rawOrderId) => {
    const orderId = String(rawOrderId).trim();
    if (!orderId) return;

    setLookupError(null);
    setSubmitError(null);
    setSuccess(null);
    setFoundOrder(null);

    const match = shippableOrders.find((order) => String(order.order_id) === orderId);
    if (!match) {
      setLookupError(
        `No shippable order found for order ID "${orderId}". It may already be shipped or cancelled.`
      );
      return;
    }
    setFoundOrder(match);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleLookup(orderIdInput);
  };

  const handleDetected = (text) => {
    setShowCamera(false);
    setOrderIdInput(text);
    handleLookup(text);
  };

  const handleShip = async () => {
    if (!foundOrder) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await updatePendingOrder(foundOrder._id, {
        isShipped: true,
        employee_id: employee.id,
        employee_name: employee.name,
      });

      setShippedItems((prev) => [
        { order: foundOrder, shippedAt: new Date().toISOString() },
        ...prev,
      ]);
      setSuccess(`Order ${foundOrder.order_id} marked as shipped.`);
      setFoundOrder(null);
      setOrderIdInput('');
      inputRef.current?.focus();
      reload();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
          Ship Order
        </h2>
        <p className="text-sm text-slate-500">
          Scan an order to mark it as shipped.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <FiSearch className="h-4 w-4" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={orderIdInput}
            onChange={(event) => setOrderIdInput(event.target.value)}
            placeholder="Type or scan the order ID…"
            autoFocus
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <FiCamera className="h-4 w-4" />
          Scan with Camera
        </button>
        <button
          type="submit"
          disabled={loading || !orderIdInput.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Find Order'}
        </button>
      </form>

      {error && (
        <Banner variant="error" onDismiss={reload}>
          {error}
        </Banner>
      )}
      {lookupError && (
        <Banner variant="error" onDismiss={() => setLookupError(null)}>
          {lookupError}
        </Banner>
      )}
      {success && (
        <Banner variant="success" onDismiss={() => setSuccess(null)}>
          {success}
        </Banner>
      )}

      {foundOrder && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Order ID</p>
              <p className="font-medium text-slate-900">{formatValue(foundOrder.order_id)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Style</p>
              <p className="font-medium text-slate-900">{formatValue(foundOrder.style_number)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Size</p>
              <p className="font-medium text-slate-900">{formatValue(foundOrder.size)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Channel</p>
              <p className="font-medium text-slate-900">{formatValue(foundOrder.channel)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Order Date</p>
              <p className="font-medium text-slate-900">{formatDate(foundOrder.order_date)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Employee</p>
              <p className="font-medium text-slate-900">
                {formatValue(foundOrder.employee_name)} #{formatValue(foundOrder.employee_id)}
              </p>
            </div>
          </div>

          {submitError && (
            <Banner variant="error" onDismiss={() => setSubmitError(null)}>
              {submitError}
            </Banner>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleShip}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiTruck className="h-4 w-4" />
              {submitting ? 'Shipping…' : 'Mark Shipped'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-700">
          Shipped this session {shippedItems.length > 0 && `(${shippedItems.length})`}
        </h3>
        {shippedItems.length === 0 ? (
          <EmptyState
            icon={FiTruck}
            title="Nothing shipped yet"
            description="Orders you ship will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Order ID', 'Style', 'Shipped At'].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shippedItems.map((item) => (
                    <tr key={item.order._id} className="even:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {formatValue(item.order.order_id)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">
                        {formatValue(item.order.style_number)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {formatDate(item.shippedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showCamera && (
        <CameraScannerDialog onDetected={handleDetected} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
};

export default ShipOrderPage;
