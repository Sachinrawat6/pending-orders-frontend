import { useMemo, useState } from 'react';
import { FiClock, FiRefreshCw, FiScissors } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import OrderSearch from '../components/common/OrderSearch';
import OrdersTable from '../components/orders/OrdersTable';
import OrderFormDialog from '../components/orders/OrderFormDialog';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { useClientPagination } from '../hooks/useClientPagination';
import { filterOrdersBySearch } from '../lib/searchOrders';
import { mergeManualCuttingReason } from '../lib/orderCategories';
import { updatePendingOrder } from '../lib/api';

const PendingOrdersPage = () => {
  const { pending, stockInfoByStyle, loading, error, reload } = useOrdersOverview();
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => filterOrdersBySearch(pending, search), [pending, search]);
  const { pageItems, pagination, setPage } = useClientPagination(filtered, 25);
  const [editingOrder, setEditingOrder] = useState(null);
  const [movingToCuttingId, setMovingToCuttingId] = useState(null);
  const [moveError, setMoveError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkMoving, setBulkMoving] = useState(false);

  const handleUpdate = async (payload) => {
    await updatePendingOrder(editingOrder._id, payload);
    reload();
  };

  const moveOrderToCutting = (order) =>
    updatePendingOrder(order._id, {
      reason: mergeManualCuttingReason(order.reason),
      isProcessed: true,
    });

  const handleMoveToCutting = async (order) => {
    const confirmed = window.confirm('Are you sure want to Manual Move To Ready For Cutting?');
    if (!confirmed) return;

    setMovingToCuttingId(order._id);
    setMoveError(null);
    try {
      await moveOrderToCutting(order);
      reload();
    } catch (err) {
      setMoveError(err.message);
    } finally {
      setMovingToCuttingId(null);
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

  const handleBulkMoveToCutting = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Are you sure want to Manual Move ${selectedIds.size} order(s) To Ready For Cutting?`
    );
    if (!confirmed) return;

    const ordersToMove = pending.filter((order) => selectedIds.has(order._id));
    setBulkMoving(true);
    setMoveError(null);
    try {
      await Promise.all(ordersToMove.map(moveOrderToCutting));
      setSelectedIds(new Set());
      reload();
    } catch (err) {
      setMoveError(err.message);
    } finally {
      setBulkMoving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
            Pending Orders
          </h2>
          <p className="text-sm text-slate-500">Awaiting fabric — not yet ready for cutting.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
            <span className="font-display font-semibold">{pending.length}</span> pending
          </span>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
          >
            <FiRefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <OrderSearch value={search} onChange={setSearch} />

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
              disabled={bulkMoving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiScissors className="h-3.5 w-3.5" />
              {bulkMoving ? 'Moving…' : `Move to Cutting (${selectedIds.size})`}
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
          onEdit={setEditingOrder}
          onMoveToCutting={handleMoveToCutting}
          movingToCuttingId={movingToCuttingId}
          pagination={pagination}
          onPageChange={setPage}
          stockInfoByStyle={stockInfoByStyle}
          selectable
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      )}

      {editingOrder && (
        <OrderFormDialog
          order={editingOrder}
          onSubmit={handleUpdate}
          onClose={() => setEditingOrder(null)}
        />
      )}
    </div>
  );
};

export default PendingOrdersPage;
