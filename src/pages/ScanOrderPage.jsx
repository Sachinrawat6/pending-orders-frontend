import { useRef, useState } from 'react';
import { FiCamera, FiSearch, FiX, FiDownload, FiScissors, FiPackage } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import EmptyState from '../components/common/EmptyState';
import CameraScannerDialog from '../components/scan/CameraScannerDialog';
import { useAuth } from '../context/AuthContext';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import {
  fetchNocoOrderById,
  createPendingOrder,
  bulkCreatePendingOrders,
  updateFabricStock,
} from '../lib/api';
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

// Shown when "Move to Pending" is clicked — a style can be linked to more
// than one fabric (up to 3), and any number of them may have actually been
// used, so the user checks off every fabric whose stock should reset to 0
// (checking none is fine too — the order still moves to Pending either way).
const FabricPickDialog = ({ item, submitting, onConfirm, onClose }) => {
  const fabrics = item.stockInfo?.fabrics || [];
  const [selected, setSelected] = useState(() => new Set());

  const toggle = (fabricNumber) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fabricNumber)) {
        next.delete(fabricNumber);
      } else {
        next.add(fabricNumber);
      }
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-900">Which fabric(s) were used?</h3>
        <p className="mt-1 text-sm text-slate-500">
          Order #{formatValue(item.order.order_id)} (style {formatValue(item.order.style_number)}) will
          move to Pending. Check every fabric whose stock should reset to 0.
        </p>

        {fabrics.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No fabric is linked to this style.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {fabrics.map((fabric) => (
              <label
                key={fabric.fabricNumber}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-indigo-300 hover:bg-indigo-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(fabric.fabricNumber)}
                    onChange={() => toggle(fabric.fabricNumber)}
                    disabled={submitting}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="font-medium text-slate-900">{fabric.fabricName || '—'}</span>
                    <span className="text-slate-400"> ({fabric.fabricNumber || '—'})</span>
                  </span>
                </span>
                <span className="tabular-nums text-slate-600">
                  Stock: {formatStock(fabric.availableStock)}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm([...selected])}
            disabled={submitting || (fabrics.length > 0 && selected.size === 0)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? 'Moving…'
              : selected.size > 0
                ? `Move to Pending & Reset ${selected.size}`
                : 'Move to Pending'}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  // Item currently being moved to Pending — while set, a dialog asks which
  // of that style's (up to 3) linked fabrics to reset stock on.
  const [fabricPickItem, setFabricPickItem] = useState(null);
  const [submittingFabricPick, setSubmittingFabricPick] = useState(false);
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
      const item = {
        order: payload,
        color: record.color,
        stockInfo,
        scannedAt: new Date().toISOString(),
      };

      if (stockInfo?.isFullyStocked) {
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

  // "Move to Pending" doesn't reset stock on its own — it opens a picker
  // (see FabricPickDialog below) so the user tells us which of this style's
  // linked fabrics were actually used, since a style can be cut from more
  // than one fabric and any number of them (including all) may need zeroing.
  const handleMoveToPending = (item) => {
    setFabricPickItem(item);
  };

  const confirmMoveToPending = async (item, fabricNumbers) => {
    setSubmittingFabricPick(true);
    setProcessingId(item.order.order_id);
    setError(null);
    try {
      await createPendingOrder({ ...item.order, reason: MANUAL_PENDING_REASON });
      await Promise.all(
        fabricNumbers
          .filter((fabricNumber) => fabricNumber !== null && fabricNumber !== '')
          .map((fabricNumber) => updateFabricStock(fabricNumber, 0))
      );
      removeRightItem(item.order.order_id);
      reload();
      setFabricPickItem(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
      setSubmittingFabricPick(false);
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
                    {item.stockInfo?.fabrics?.length ? (
                      item.stockInfo.fabrics.map((fabric, index) => (
                        <p key={`${fabric.fabricNumber}-${index}`} className="text-xs text-slate-400">
                          {fabric.fabricName || '—'} ({fabric.fabricNumber || '—'}) · Stock:{' '}
                          {formatStock(fabric.availableStock)}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">No fabric linked to this style.</p>
                    )}
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
                      {item.stockInfo?.fabrics?.length ? (
                        item.stockInfo.fabrics.map((fabric, index) => (
                          <p key={`${fabric.fabricNumber}-${index}`} className="text-xs text-slate-400">
                            {fabric.fabricName || '—'} ({fabric.fabricNumber || '—'}) · {fabric.location || '—'} ·
                            {' '}
                            Stock: {formatStock(fabric.availableStock)}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No fabric linked to this style.</p>
                      )}
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

      {/* Print-only fabric pull list for the "Stock Available" column — a
          style can be linked to more than one fabric, so every fabric's
          number/name/location/stock is stacked (one line each) inside the
          same row's cells instead of splitting into one row per fabric. */}
      <div className="print-area hidden print:block">
        <h2 className="mb-4 text-lg font-semibold">Stock Available — Fabric Pull List</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {['Style Number', 'Fabric Number', 'Fabric Name', 'Location', 'Available Stock'].map(
                (heading) => (
                  <th key={heading} className="border border-slate-300 px-2 py-1 text-left">
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rightItems.map((item) => {
              const fabrics = item.stockInfo?.fabrics?.length
                ? item.stockInfo.fabrics
                : [{ fabricNumber: '—', fabricName: '—', location: '—', availableStock: null }];
              return (
                <tr key={item.order.order_id}>
                  <td className="border border-slate-300 px-2 py-1">{item.order.style_number}</td>
                  <td className="border border-slate-300 px-2 py-1">
                    {fabrics.map((fabric, index) => (
                      <div key={index}>{fabric.fabricNumber || '—'}</div>
                    ))}
                  </td>
                  <td className="border border-slate-300 px-2 py-1">
                    {fabrics.map((fabric, index) => (
                      <div key={index}>{fabric.fabricName || '—'}</div>
                    ))}
                  </td>
                  <td className="border border-slate-300 px-2 py-1">
                    {fabrics.map((fabric, index) => (
                      <div key={index}>{fabric.location || '—'}</div>
                    ))}
                  </td>
                  <td className="border border-slate-300 px-2 py-1">
                    {fabrics.map((fabric, index) => (
                      <div key={index}>{formatStock(fabric.availableStock)}</div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCamera && (
        <CameraScannerDialog onDetected={handleDetected} onClose={() => setShowCamera(false)} />
      )}

      {fabricPickItem && (
        <FabricPickDialog
          item={fabricPickItem}
          submitting={submittingFabricPick}
          onConfirm={(fabricNumbers) => confirmMoveToPending(fabricPickItem, fabricNumbers)}
          onClose={() => setFabricPickItem(null)}
        />
      )}
    </div>
  );
};

export default ScanOrderPage;
