import { useRef, useState } from 'react';
import { FiCamera, FiSearch, FiSend } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import EmptyState from '../components/common/EmptyState';
import CameraScannerDialog from '../components/scan/CameraScannerDialog';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { updatePendingOrder } from '../lib/api';
import { SCANNED_BY_STORE_REASON } from '../lib/orderCategories';
import { formatDateTime, formatValue } from '../lib/formatters';

// Store-scan flow for Ready for Cutting orders: scan the order ID, and it
// moves straight to Ready for Process with a fixed reason ("Scanned by
// Store") — no reason picker, unlike the Pending-to-Cutting scan page.
const StoreScanPage = () => {
  const { readyForCutting, loading, error, reload } = useOrdersOverview();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [movedItems, setMovedItems] = useState([]);
  const inputRef = useRef(null);

  const handleScan = async (rawOrderId) => {
    const orderId = String(rawOrderId).trim();
    if (!orderId) return;

    setLookupError(null);
    setSuccess(null);

    const match = readyForCutting.find((order) => String(order.order_id) === orderId);
    if (!match) {
      setLookupError(
        `No Ready for Cutting order found for order ID "${orderId}". It may not be ready yet, or was already moved on.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await updatePendingOrder(match._id, {
        reason: SCANNED_BY_STORE_REASON,
        isProcessed: true,
      });
      setMovedItems((prev) => [{ order: match, movedAt: new Date().toISOString() }, ...prev]);
      setSuccess(`Order ${match.order_id} moved to Ready for Process.`);
      setOrderIdInput('');
      reload();
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setSubmitting(false);
      // The input is disabled (and un-focusable) while submitting=true; wait
      // for that to actually clear from the DOM before refocusing it.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleScan(orderIdInput);
  };

  const handleDetected = (text) => {
    setShowCamera(false);
    setOrderIdInput(text);
    handleScan(text);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
          Store Scan
        </h2>
        <p className="text-sm text-slate-500">
          Scan a Ready for Cutting order to send it to Ready for Process (reason: "Scanned by Store").
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
            disabled={submitting || loading}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          disabled={submitting || loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <FiCamera className="h-4 w-4" />
          Scan with Camera
        </button>
        <button
          type="submit"
          disabled={submitting || loading || !orderIdInput.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiSend className="h-4 w-4" />
          {submitting ? 'Moving…' : 'Move to Process'}
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

      <div className="space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-700">
          Moved this session {movedItems.length > 0 && `(${movedItems.length})`}
        </h3>
        {movedItems.length === 0 ? (
          <EmptyState
            icon={FiSend}
            title="Nothing moved yet"
            description="Orders you scan here will appear in this list."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Order ID', 'Style', 'Channel', 'Moved At'].map((heading) => (
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
                  {movedItems.map((item) => (
                    <tr key={item.order._id} className="even:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {formatValue(item.order.order_id)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">
                        {formatValue(item.order.style_number)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatValue(item.order.channel)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {formatDateTime(item.movedAt)}
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

export default StoreScanPage;
