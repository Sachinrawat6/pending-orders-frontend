import { useMemo, useState } from 'react';
import { FiXCircle, FiRefreshCw } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import OrderSearch from '../components/common/OrderSearch';
import OrdersTable from '../components/orders/OrdersTable';
import { useAuth } from '../context/AuthContext';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { useClientPagination } from '../hooks/useClientPagination';
import { useSortableOrders } from '../hooks/useSortableOrders';
import { filterOrdersBySearch } from '../lib/searchOrders';
import { updatePendingOrder } from '../lib/api';

const CancelRequestsPage = () => {
  const { employee } = useAuth();
  const { cancelRequested, stockInfoByStyle, loading, error, reload } = useOrdersOverview();
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => filterOrdersBySearch(cancelRequested, search),
    [cancelRequested, search]
  );
  const { sorted, sortRules, toggleSort } = useSortableOrders(filtered);
  const { pageItems, pagination, setPage } = useClientPagination(sorted, 25);
  const [actionError, setActionError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  // { type: 'cancel' | 'bulk-cancel', order? } — drives the ConfirmDialog
  // below. Not OTP-gated: getting here already required OTP verification
  // (or the 5+ day auto-cancel), this just finalizes it.
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const markCancelled = (order) =>
    updatePendingOrder(order._id, {
      isCancelled: true,
      employee_id: employee.id,
      employee_name: employee.name,
    });

  const selectedOrders = () => cancelRequested.filter((order) => selectedIds.has(order._id));

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    setActionError(null);
    try {
      if (confirmAction.type === 'cancel') {
        await markCancelled(confirmAction.order);
      } else if (confirmAction.type === 'bulk-cancel') {
        await Promise.all(selectedOrders().map(markCancelled));
        setSelectedIds(new Set());
      }
      reload();
    } catch (err) {
      setActionError(err.message);
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

  const handleBulkMarkCancelled = () => {
    if (selectedIds.size === 0) return;
    setConfirmAction({ type: 'bulk-cancel' });
  };

  const getConfirmDialogProps = () => {
    if (!confirmAction) return {};
    if (confirmAction.type === 'bulk-cancel') {
      return {
        title: 'Mark selected orders as cancelled?',
        description: `${selectedIds.size} order(s) will be permanently marked cancelled, attributed to ${employee.name}.`,
        confirmLabel: `Mark ${selectedIds.size} Cancelled`,
        tone: 'slate',
      };
    }
    const order = confirmAction.order;
    return {
      title: 'Mark this order as cancelled?',
      description: `Order #${order.order_id} (style ${order.style_number}) will be permanently marked cancelled, attributed to ${employee.name}.`,
      confirmLabel: 'Mark Cancelled',
      tone: 'slate',
    };
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">Cancel Requests</h2>
          <p className="text-sm text-slate-500">Orders flagged for cancellation approval.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200">
            <span className="font-display font-semibold">{cancelRequested.length}</span> requested
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5">
          <p className="text-sm font-medium text-slate-700">{selectedIds.size} selected</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-sm font-medium text-slate-600 hover:underline"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkMarkCancelled}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
            >
              <FiXCircle className="h-3.5 w-3.5" />
              {`Mark Cancelled (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {error && (
        <Banner variant="error" onDismiss={reload}>
          {error}
        </Banner>
      )}
      {actionError && (
        <Banner variant="error" onDismiss={() => setActionError(null)}>
          {actionError}
        </Banner>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Spinner className="h-5 w-5" />
          <span className="text-sm">Loading cancel requests…</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={FiXCircle}
          title={search ? 'No matches' : 'No cancel requests'}
          description={
            search
              ? 'No cancel request matches that search.'
              : 'Nothing is currently flagged for cancellation.'
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <OrdersTable
          orders={pageItems}
          onMarkCancelled={(order) => setConfirmAction({ type: 'cancel', order })}
          pagination={pagination}
          onPageChange={setPage}
          stockInfoByStyle={stockInfoByStyle}
          selectable
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          sortRules={sortRules}
          onSortToggle={toggleSort}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          {...getConfirmDialogProps()}
          loading={confirmLoading}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
};

export default CancelRequestsPage;
