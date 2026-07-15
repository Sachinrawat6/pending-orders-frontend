import { useRef, useState } from 'react';
import { FiCamera, FiSearch } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import EmptyState from '../components/common/EmptyState';
import CameraScannerDialog from '../components/scan/CameraScannerDialog';
import ScanSavedList from '../components/scan/ScanSavedList';
import { useAuth } from '../context/AuthContext';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { fetchNocoOrderById, createPendingOrder } from '../lib/api';
import { buildPendingOrderPayload, isDuplicateOrderError } from '../lib/nocodb';

const ScanOrderPage = () => {
  const { employee } = useAuth();
  const { reload } = useOrdersOverview();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const inputRef = useRef(null);

  const handleSaveOrder = async (rawOrderId) => {
    const orderId = String(rawOrderId).trim();
    if (!orderId) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const records = await fetchNocoOrderById(orderId);
      if (!records || records.length === 0) {
        setError(`No order found for order ID "${orderId}".`);
        return;
      }

      const record = records[0];
      const payload = buildPendingOrderPayload(record, employee);
      await createPendingOrder(payload);

      setSavedItems((prev) => [
        { order: payload, color: record.color, savedAt: new Date().toISOString() },
        ...prev,
      ]);
      setSuccess(`Order ${payload.order_id} saved to Pending Orders.`);
      setOrderIdInput('');
      inputRef.current?.focus();
      reload();
    } catch (err) {
      setError(
        isDuplicateOrderError(err.message)
          ? `Order ${orderId} has already been saved to Pending Orders.`
          : err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSaveOrder(orderIdInput);
  };

  const handleDetected = (text) => {
    setShowCamera(false);
    setOrderIdInput(text);
    handleSaveOrder(text);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
          Scan Order
        </h2>
        <p className="text-sm text-slate-500">
          Scan an order barcode with your phone camera, or type the order ID and press Enter.
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
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <FiCamera className="h-4 w-4" />
          Scan with Camera
        </button>
        <button
          type="submit"
          disabled={submitting || !orderIdInput.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Fetch & Save'}
        </button>
      </form>

      {error && (
        <Banner variant="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}
      {success && (
        <Banner variant="success" onDismiss={() => setSuccess(null)}>
          {success}
        </Banner>
      )}

      <div className="space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-700">
          Saved this session {savedItems.length > 0 && `(${savedItems.length})`}
        </h3>
        {savedItems.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title="Nothing scanned yet"
            description="Saved orders will appear here."
          />
        ) : (
          <ScanSavedList items={savedItems} />
        )}
      </div>

      {showCamera && (
        <CameraScannerDialog onDetected={handleDetected} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
};

export default ScanOrderPage;
