import { useRef, useState } from 'react';
import { FiCamera, FiSearch, FiX, FiDownload, FiScissors, FiPackage } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import EmptyState from '../components/common/EmptyState';
import CameraScannerDialog from '../components/scan/CameraScannerDialog';
import { useAuth } from '../context/AuthContext';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { fetchNocoOrderById, createPendingOrder, bulkCreatePendingOrders } from '../lib/api';
import { buildPendingOrderPayload, isDuplicateOrderError } from '../lib/nocodb';
import {
  loadLowStockQueue,
  saveLowStockQueue,
  clearLowStockQueue,
  loadStockAvailableQueue,
  saveStockAvailableQueue,
} from '../lib/scanQueue';
import { MANUAL_PENDING_REASON, MANUAL_CUTTING_REASON } from '../lib/orderCategories';
import { formatStock, formatValue } from '../lib/formatters';

const LOW_STOCK_THRESHOLD = 2;

const ScanOrderPage = () => {
  const { employee } = useAuth();
  const { orders, stockInfoByStyle, reload } = useOrdersOverview();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [leftItems, setLeftItems] = useState(() => loadLowStockQueue());
  const [rightItems, setRightItems] = useState(() => loadStockAvailableQueue());
  const [savingAll, setSavingAll] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const inputRef = useRef(null);

  const isAlreadyScanned = (orderId) =>
    orders.some((order) => String(order.order_id) === orderId) ||
    leftItems.some((item) => String(item.order.order_id) === orderId) ||
    rightItems.some((item) => String(item.order.order_id) === orderId);

  const handleSaveOrder = async (rawOrderId) => {
    const orderId = String(rawOrderId).trim();
    if (!orderId) return;

    setError(null);
    setSuccess(null);

    if (isAlreadyScanned(orderId)) {
      setError(`Order ${orderId} has already been scanned or saved.`);
      return;
    }

    setSubmitting(true);
    try {
      const records = await fetchNocoOrderById(orderId);
      if (!records || records.length === 0) {
        setError(`No order found for order ID "${orderId}".`);
        return;
      }

      const record = records[0];
      const payload = buildPendingOrderPayload(record, employee);
      const stockInfo = stockInfoByStyle.get(payload.style_number) || null;
      const item = { order: payload, color: record.color, stockInfo, scannedAt: new Date().toISOString() };

      if ((stockInfo?.availableStock ?? 0) > LOW_STOCK_THRESHOLD) {
        setRightItems((prev) => {
          const next = [item, ...prev];
          saveStockAvailableQueue(next);
          return next;
        });
      } else {
        setLeftItems((prev) => {
          const next = [item, ...prev];
          saveLowStockQueue(next);
          return next;
        });
      }

      setSuccess(`Order ${payload.order_id} scanned.`);
      setOrderIdInput('');
    } catch (err) {
      setError(
        isDuplicateOrderError(err.message)
          ? `Order ${orderId} has already been saved to Pending Orders.`
          : err.message
      );
    } finally {
      setSubmitting(false);
      // The input is disabled (and un-focusable) while submitting=true; wait
      // for that to actually clear from the DOM before refocusing it.
      setTimeout(() => inputRef.current?.focus(), 0);
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

  const removeLeftItem = (orderId) => {
    setLeftItems((prev) => {
      const next = prev.filter((item) => item.order.order_id !== orderId);
      saveLowStockQueue(next);
      return next;
    });
  };

  const removeRightItem = (orderId) => {
    setRightItems((prev) => {
      const next = prev.filter((item) => item.order.order_id !== orderId);
      saveStockAvailableQueue(next);
      return next;
    });
  };

  const handleSaveAllToPending = async () => {
    if (leftItems.length === 0) return;
    setSavingAll(true);
    setError(null);
    try {
      await bulkCreatePendingOrders(leftItems.map((item) => item.order));
      setSuccess(`${leftItems.length} order(s) saved to Pending Orders.`);
      setLeftItems([]);
      clearLowStockQueue();
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAll(false);
    }
  };

  const handleMoveToPending = async (item) => {
    setProcessingId(item.order.order_id);
    setError(null);
    try {
      await createPendingOrder({ ...item.order, reason: MANUAL_PENDING_REASON });
      removeRightItem(item.order.order_id);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMoveToCutting = async (item) => {
    setProcessingId(item.order.order_id);
    setError(null);
    try {
      await createPendingOrder({ ...item.order, reason: MANUAL_CUTTING_REASON, isProcessed: true });
      removeRightItem(item.order.order_id);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
          Scan Order
        </h2>
        <p className="text-sm text-slate-500">
          Scan an order barcode with your phone camera, or type the order ID and press Enter. Low
          stock orders queue on the left to bulk-save; orders with stock already available land on
          the right for you to route manually.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden sm:flex-row sm:items-center"
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
            disabled={submitting}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <FiCamera className="h-4 w-4" />
          Scan with Camera
        </button>
        <button
          type="submit"
          disabled={submitting || !orderIdInput.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Looking up…' : 'Scan'}
        </button>
      </form>

      <div className="print:hidden">
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
      </div>

      <div className="grid grid-cols-1 gap-4 print:hidden md:grid-cols-2">
        {/* Left: low stock, buffered for bulk save */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-slate-700">
              Low Stock — Queued ({leftItems.length})
            </h3>
            <button
              type="button"
              onClick={handleSaveAllToPending}
              disabled={leftItems.length === 0 || savingAll}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiPackage className="h-3.5 w-3.5" />
              {savingAll ? 'Saving…' : 'Save All to Pending'}
            </button>
          </div>

          {leftItems.length === 0 ? (
            <EmptyState
              icon={FiPackage}
              title="Nothing queued"
              description="Scanned orders with less fabric than needed will queue here."
            />
          ) : (
            <ul className="space-y-2">
              {leftItems.map((item) => (
                <li
                  key={item.order.order_id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {formatValue(item.order.style_number)}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        #{formatValue(item.order.order_id)}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatValue(item.order.size)} · {formatValue(item.order.channel)}
                    </p>
                    <p className="text-xs text-slate-400">
                      Stock: {formatStock(item.stockInfo?.availableStock ?? 0)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLeftItem(item.order.order_id)}
                    aria-label="Remove"
                    className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: stock available, routed manually */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-slate-700">
              Stock Available ({rightItems.length})
            </h3>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={rightItems.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiDownload className="h-3.5 w-3.5" />
              Export PDF
            </button>
          </div>

          {rightItems.length === 0 ? (
            <EmptyState
              icon={FiScissors}
              title="Nothing here yet"
              description="Scanned orders that already have enough fabric in stock will show up here."
            />
          ) : (
            <ul className="space-y-2">
              {rightItems.map((item) => (
                <li
                  key={item.order.order_id}
                  className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {formatValue(item.order.style_number)}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          #{formatValue(item.order.order_id)}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.stockInfo?.fabricName || '—'} ({item.stockInfo?.fabricNumber ?? '—'}) ·{' '}
                        {item.stockInfo?.location || '—'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Stock: {formatStock(item.stockInfo?.availableStock)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRightItem(item.order.order_id)}
                      aria-label="Remove"
                      className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleMoveToPending(item)}
                      disabled={processingId === item.order.order_id}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiPackage className="h-3.5 w-3.5" />
                      Move to Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveToCutting(item)}
                      disabled={processingId === item.order.order_id}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiScissors className="h-3.5 w-3.5" />
                      Move to Cutting
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Print-only fabric pull list for the "Stock Available" column */}
      <div className="print-area hidden print:block">
        <h2 className="mb-4 text-lg font-semibold">Stock Available — Fabric Pull List</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {['Fabric Number', 'Style Number', 'Fabric Name', 'Location', 'Available Stock'].map(
                (heading) => (
                  <th key={heading} className="border border-slate-300 px-2 py-1 text-left">
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rightItems.map((item) => (
              <tr key={item.order.order_id}>
                <td className="border border-slate-300 px-2 py-1">
                  {item.stockInfo?.fabricNumber ?? '—'}
                </td>
                <td className="border border-slate-300 px-2 py-1">{item.order.style_number}</td>
                <td className="border border-slate-300 px-2 py-1">
                  {item.stockInfo?.fabricName || '—'}
                </td>
                <td className="border border-slate-300 px-2 py-1">
                  {item.stockInfo?.location || '—'}
                </td>
                <td className="border border-slate-300 px-2 py-1">
                  {formatStock(item.stockInfo?.availableStock)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCamera && (
        <CameraScannerDialog onDetected={handleDetected} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
};

export default ScanOrderPage;
