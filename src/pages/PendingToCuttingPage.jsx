import { useRef, useState } from 'react';
import { FiCamera, FiSearch, FiCheckCircle } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import EmptyState from '../components/common/EmptyState';
import CameraScannerDialog from '../components/scan/CameraScannerDialog';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { updatePendingOrder } from '../lib/api';
import { REASONS, isCancelReason } from '../lib/orderCategories';
import { formatDate, formatStock, formatValue } from '../lib/formatters';

const PendingToCuttingPage = () => {
  const { pending, readyForCutting, stockInfoByStyle, loading, error, reload } =
    useOrdersOverview();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [foundOrder, setFoundOrder] = useState(null);
  const [reason, setReason] = useState('');
  const [lookupError, setLookupError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [resolvedItems, setResolvedItems] = useState([]);
  const inputRef = useRef(null);

  const activeOrders = [...pending, ...readyForCutting];

  const handleLookup = (rawOrderId) => {
    const orderId = String(rawOrderId).trim();
    if (!orderId) return;

    setLookupError(null);
    setSubmitError(null);
    setSuccess(null);
    setFoundOrder(null);
    setReason('');

    const match = activeOrders.find((order) => String(order.order_id) === orderId);
    if (!match) {
      setLookupError(
        `No unresolved order found for order ID "${orderId}". It may already be processed or cancelled.`
      );
      return;
    }
    setFoundOrder(match);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    handleLookup(orderIdInput);
  };

  const handleDetected = (text) => {
    setShowCamera(false);
    setOrderIdInput(text);
    handleLookup(text);
  };

  const handleResolve = async () => {
    if (!foundOrder || !reason) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = isCancelReason(reason)
        ? { reason, isCancelApproval: true }
        : { reason, isProcessed: true };
      await updatePendingOrder(foundOrder._id, payload);

      setResolvedItems((prev) => [
        { order: foundOrder, reason, resolvedAt: new Date().toISOString() },
        ...prev,
      ]);
      setSuccess(`Order ${foundOrder.order_id} resolved with reason "${reason}".`);
      setFoundOrder(null);
      setReason('');
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
        <h2 className="font-display text-xl font-semibold  tracking-tight text-slate-900">
          Pending to Cutting
        </h2>
        <p className="text-sm text-slate-500">
          Scan an order to move it forward — pick a reason after scanning to resolve it.
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
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Stock Qty</p>
              <p className="font-medium text-slate-900">
                {formatStock(stockInfoByStyle.get(foundOrder.style_number)?.availableStock)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Location</p>
              <p className="font-medium text-slate-900">
                {stockInfoByStyle.get(foundOrder.style_number)?.location || '—'}
              </p>
            </div>
          </div>

          {submitError && (
            <Banner variant="error" onDismiss={() => setSubmitError(null)}>
              {submitError}
            </Banner>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm">
              <span className="mb-1 block font-medium text-slate-600">Reason</span>
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="" disabled>
                  Select reason…
                </option>
                {REASONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleResolve}
              disabled={!reason || submitting}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiCheckCircle className="h-4 w-4" />
              {submitting ? 'Resolving…' : 'Resolve Order'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-700">
          Resolved this session {resolvedItems.length > 0 && `(${resolvedItems.length})`}
        </h3>
        {resolvedItems.length === 0 ? (
          <EmptyState
            icon={FiCheckCircle}
            title="Nothing resolved yet"
            description="Orders you resolve will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Order ID', 'Style', 'Reason', 'Resolved At'].map((heading) => (
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
                  {resolvedItems.map((item) => (
                    <tr key={item.order._id} className="even:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {formatValue(item.order.order_id)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">
                        {formatValue(item.order.style_number)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.reason}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {formatDate(item.resolvedAt)}
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

export default PendingToCuttingPage;
