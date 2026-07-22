import { useMemo, useState } from 'react';
import { FiClock, FiRefreshCw, FiScissors, FiRepeat, FiXCircle, FiDownload } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import OrderSearch from '../components/common/OrderSearch';
import DateRangeFilter from '../components/common/DateRangeFilter';
import ChannelFilter from '../components/common/ChannelFilter';
import OrdersTable from '../components/orders/OrdersTable';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { useClientPagination } from '../hooks/useClientPagination';
import { useSortableOrders } from '../hooks/useSortableOrders';
import { filterOrdersBySearch } from '../lib/searchOrders';
import { filterOrdersByDateRange } from '../lib/filterOrdersByDateRange';
import { filterOrdersByChannel } from '../lib/filterOrdersByChannel';
import { mergeManualCuttingReason, mergeManualProcessReason } from '../lib/orderCategories';
import { updatePendingOrder } from '../lib/api';
import { formatStock } from '../lib/formatters';

// Newest order first by default, so today's pending orders land on top —
// clicking a column header (see useSortableOrders) overrides this.
const DEFAULT_SORT = { key: 'order_date', direction: 'desc' };

// Maps a confirmAction (see PendingOrdersPage state) to the props the
// ConfirmDialog needs — keeps the single-order and bulk variants of each
// action (cutting/process/cancel) in one place instead of scattered ternaries.
const getConfirmDialogProps = (confirmAction, selectedCount) => {
  const order = confirmAction.order;
  switch (confirmAction.type) {
    case 'cutting':
      return {
        title: 'Move to Ready for Cutting?',
        description: `Order #${order.order_id} (style ${order.style_number}) will be manually moved to Ready for Cutting.`,
        confirmLabel: 'Move to Cutting',
        tone: 'indigo',
      };
    case 'process':
      return {
        title: 'Move to Ready for Process?',
        description: `Order #${order.order_id} (style ${order.style_number}) will be manually moved to Ready for Process.`,
        confirmLabel: 'Move to Process',
        tone: 'violet',
      };
    case 'bulk-cutting':
      return {
        title: 'Move selected orders to Ready for Cutting?',
        description: `${selectedCount} order(s) will be manually moved to Ready for Cutting.`,
        confirmLabel: `Move ${selectedCount} to Cutting`,
        tone: 'indigo',
      };
    case 'bulk-process':
      return {
        title: 'Move selected orders to Ready for Process?',
        description: `${selectedCount} order(s) will be manually moved to Ready for Process.`,
        confirmLabel: `Move ${selectedCount} to Process`,
        tone: 'violet',
      };
    case 'bulk-cancel':
      return {
        title: 'Cancel-approve selected orders?',
        description: `${selectedCount} order(s) will be flagged "Cancel Request" and moved to Cancel Requests for review.`,
        confirmLabel: `Cancel Approve ${selectedCount}`,
        tone: 'danger',
      };
    case 'cancel':
      return {
        title: 'Cancel this order?',
        description: `Order #${order.order_id} (style ${order.style_number}) will be flagged "Cancel Request" and moved to Cancel Requests for review.`,
        confirmLabel: 'Cancel Order',
        tone: 'danger',
      };
    default:
      return {};
  }
};

const PendingOrdersPage = () => {
  const { pending, stockInfoByStyle, loading, error, reload } = useOrdersOverview();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [channel, setChannel] = useState('');
  const searched = useMemo(() => filterOrdersBySearch(pending, search), [pending, search]);
  const byChannel = useMemo(() => filterOrdersByChannel(searched, channel), [searched, channel]);
  const filtered = useMemo(
    () => filterOrdersByDateRange(byChannel, dateRange),
    [byChannel, dateRange]
  );
  const { sorted, sortRules, toggleSort } = useSortableOrders(filtered, DEFAULT_SORT);
  const { pageItems, pagination, setPage } = useClientPagination(sorted, 25);
  const [moveError, setMoveError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  // { type: 'cutting' | 'process' | 'cancel' | 'bulk-cutting' | 'bulk-process' | 'bulk-cancel', order? } —
  // drives the custom ConfirmDialog below instead of a native window.confirm() alert.
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleExportPdf = () => {
    window.print();
  };

  const moveOrderToCutting = (order) =>
    updatePendingOrder(order._id, {
      reason: mergeManualCuttingReason(order.reason),
      isProcessed: true,
    });

  const moveOrderToProcess = (order) =>
    updatePendingOrder(order._id, {
      reason: mergeManualProcessReason(order.reason),
      isProcessed: true,
    });

  const moveOrderToCancel = (order) =>
    updatePendingOrder(order._id, {
      reason: 'Cancel Request',
      isCancelApproval: true,
    });

  const selectedOrders = () => pending.filter((order) => selectedIds.has(order._id));

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    setMoveError(null);
    try {
      if (confirmAction.type === 'cutting') {
        await moveOrderToCutting(confirmAction.order);
      } else if (confirmAction.type === 'process') {
        await moveOrderToProcess(confirmAction.order);
      } else if (confirmAction.type === 'cancel') {
        await moveOrderToCancel(confirmAction.order);
      } else if (confirmAction.type === 'bulk-cutting') {
        await Promise.all(selectedOrders().map(moveOrderToCutting));
        setSelectedIds(new Set());
      } else if (confirmAction.type === 'bulk-process') {
        await Promise.all(selectedOrders().map(moveOrderToProcess));
        setSelectedIds(new Set());
      } else if (confirmAction.type === 'bulk-cancel') {
        await Promise.all(selectedOrders().map(moveOrderToCancel));
        setSelectedIds(new Set());
      }
      reload();
    } catch (err) {
      setMoveError(err.message);
    } finally {
      setConfirmLoading(false);
      setConfirmAction(null);
    }
  };

  const toggleSelect = (orderId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const allSelected = pageItems.length > 0 && pageItems.every((order) => prev.has(order._id));
      const next = new Set(prev);
      pageItems.forEach((order) => (allSelected ? next.delete(order._id) : next.add(order._id)));
      return next;
    });
  };

  const handleBulkMoveToCutting = () => {
    if (selectedIds.size === 0) return;
    setConfirmAction({ type: 'bulk-cutting' });
  };

  const handleBulkMoveToProcess = () => {
    if (selectedIds.size === 0) return;
    setConfirmAction({ type: 'bulk-process' });
  };

  const handleBulkCancel = () => {
    if (selectedIds.size === 0) return;
    setConfirmAction({ type: 'bulk-cancel' });
  };

  return (
    <div className="space-y-5">
      <div className="print:hidden space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
            Pending Orders
          </h2>
          <p className="text-sm text-slate-500">Awaiting fabric — not yet ready for cutting.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
            <span className="font-display font-semibold">{filtered.length}</span> pending
            {filtered.length !== pending.length && (
              <span className="text-amber-500">/ {pending.length}</span>
            )}
          </span>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
          >
            <FiRefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiDownload className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <OrderSearch value={search} onChange={setSearch} />
        </div>
        <ChannelFilter value={channel} onChange={setChannel} />
        <DateRangeFilter
          from={dateRange.from}
          to={dateRange.to}
          onChange={setDateRange}
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5">
          <p className="text-sm font-medium text-indigo-700">{selectedIds.size} selected</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkMoveToCutting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiScissors className="h-3.5 w-3.5" />
              {`Move to Cutting (${selectedIds.size})`}
            </button>
            <button
              type="button"
              onClick={handleBulkMoveToProcess}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiRepeat className="h-3.5 w-3.5" />
              {`Move to Process (${selectedIds.size})`}
            </button>
            <button
              type="button"
              onClick={handleBulkCancel}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiXCircle className="h-3.5 w-3.5" />
              {`Cancel Approve (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {error && (
        <Banner variant="error" onDismiss={reload}>
          {error}
        </Banner>
      )}
      {moveError && (
        <Banner variant="error" onDismiss={() => setMoveError(null)}>
          {moveError}
        </Banner>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Spinner className="h-5 w-5" />
          <span className="text-sm">Loading pending orders…</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={FiClock}
          title={search ? 'No matches' : 'Nothing pending'}
          description={
            search
              ? 'No pending order matches that search.'
              : 'Every order is either ready for cutting, processed, or awaiting cancel approval.'
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <OrdersTable
          orders={pageItems}
          onCancelOrder={(order) => setConfirmAction({ type: 'cancel', order })}
          onMoveToCutting={(order) => setConfirmAction({ type: 'cutting', order })}
          onMoveToProcess={(order) => setConfirmAction({ type: 'process', order })}
          pagination={pagination}
          onPageChange={setPage}
          stockInfoByStyle={stockInfoByStyle}
          selectable
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          sortRules={sortRules}
          onSortToggle={toggleSort}
          showPendingDays
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          {...getConfirmDialogProps(confirmAction, selectedIds.size)}
          loading={confirmLoading}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      </div>

      {/* Print-only pending orders list for PDF export */}
      <div className="print-area hidden print:block">
        <h2 className="mb-4 text-lg font-semibold">Pending Orders</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {['Style Number', 'Size', 'Channel', 'Fabric Stock', 'Fabric Name', 'Location'].map(
                (heading) => (
                  <th key={heading} className="border border-slate-300 px-2 py-1 text-left">
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((order) => {
              const stockInfo = stockInfoByStyle?.get(order.style_number);
              return (
                <tr key={order._id}>
                  <td className="border border-slate-300 px-2 py-1">{order.style_number}</td>
                  <td className="border border-slate-300 px-2 py-1">{order.size}</td>
                  <td className="border border-slate-300 px-2 py-1">{order.channel}</td>
                  <td className="border border-slate-300 px-2 py-1">
                    {formatStock(stockInfo?.availableStock)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1">
                    {stockInfo?.fabricName || '—'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1">
                    {stockInfo?.location || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PendingOrdersPage;
