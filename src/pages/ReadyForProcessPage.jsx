import { useMemo, useState } from 'react';
import { FiRepeat, FiRefreshCw, FiTruck, FiCheckCircle } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import CancelOtpDialog from '../components/common/CancelOtpDialog';
import OrderSearch from '../components/common/OrderSearch';
import OrdersTable from '../components/orders/OrdersTable';
import { useAuth } from '../context/AuthContext';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { useClientPagination } from '../hooks/useClientPagination';
import { useSortableOrders } from '../hooks/useSortableOrders';
import { filterOrdersBySearch } from '../lib/searchOrders';
import { updatePendingOrder } from '../lib/api';

// Maps a confirmAction to the props the ConfirmDialog needs — keeps the
// ship / bulk-ship / cancel variants in one place instead of scattered
// ternaries inline in the JSX.
const getConfirmDialogProps = (confirmAction, selectedCount) => {
  const order = confirmAction.order;
  switch (confirmAction.type) {
    case 'ship':
      return {
        title: 'Mark order as shipped?',
        description: `Order #${order.order_id} (style ${order.style_number}) will be marked as shipped.`,
        confirmLabel: 'Mark Shipped',
        tone: 'sky',
      };
    case 'bulk-ship':
      return {
        title: 'Mark selected orders as shipped?',
        description: `${selectedCount} order(s) will be marked as shipped.`,
        confirmLabel: `Mark ${selectedCount} Shipped`,
        tone: 'sky',
      };
    case 'process':
      return {
        title: 'Mark order as processed?',
        description: `Order #${order.order_id} (style ${order.style_number}) will be moved to Processed.`,
        confirmLabel: 'Mark Processed',
        tone: 'emerald',
      };
    case 'bulk-process':
      return {
        title: 'Mark selected orders as processed?',
        description: `${selectedCount} order(s) will be moved to Processed.`,
        confirmLabel: `Mark ${selectedCount} Processed`,
        tone: 'emerald',
      };
    default:
      return {};
  }
};

const ReadyForProcessPage = () => {
  const { employee } = useAuth();
  const { readyForProcess, stockInfoByStyle, loading, error, reload } = useOrdersOverview();
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => filterOrdersBySearch(readyForProcess, search),
    [readyForProcess, search]
  );
  const { sorted, sortRules, toggleSort } = useSortableOrders(filtered);
  const { pageItems, pagination, setPage } = useClientPagination(sorted, 25);
  const [actionError, setActionError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  // { type: 'ship' | 'bulk-ship' | 'cancel', order? } — drives the custom
  // ConfirmDialog below instead of a native window.confirm() alert.
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const shipOrder = (order) =>
    updatePendingOrder(order._id, {
      isShipped: true,
      employee_id: employee.id,
      employee_name: employee.name,
    });

  const cancelOrder = (order) =>
    updatePendingOrder(order._id, {
      reason: 'Cancel Request',
      isCancelApproval: true,
    });

  const markProcessed = (order) =>
    updatePendingOrder(order._id, {
      isProcessComplete: true,
      employee_id: employee.id,
      employee_name: employee.name,
    });

  const selectedOrders = () => readyForProcess.filter((order) => selectedIds.has(order._id));

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    setActionError(null);
    try {
      if (confirmAction.type === 'ship') {
        await shipOrder(confirmAction.order);
      } else if (confirmAction.type === 'bulk-ship') {
        await Promise.all(selectedOrders().map(shipOrder));
        setSelectedIds(new Set());
      } else if (confirmAction.type === 'process') {
        await markProcessed(confirmAction.order);
      } else if (confirmAction.type === 'bulk-process') {
        await Promise.all(selectedOrders().map(markProcessed));
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

  // Cancel is OTP-gated (see CancelOtpDialog) — the mutation only runs after
  // a whitelisted phone number verifies the OTP, so errors surface inside
  // that dialog rather than the page-level actionError banner.
  const handleCancelVerified = async () => {
    if (!confirmAction) return;
    await cancelOrder(confirmAction.order);
    reload();
    setConfirmAction(null);
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

  const handleBulkShip = () => {
    if (selectedIds.size === 0) return;
    setConfirmAction({ type: 'bulk-ship' });
  };

  const handleBulkMarkProcessed = () => {
    if (selectedIds.size === 0) return;
    setConfirmAction({ type: 'bulk-process' });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
            Ready for Process
          </h2>
          <p className="text-sm text-slate-500">
            Orders flagged Alter or Return Found, regardless of stock.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
            <span className="font-display font-semibold">{readyForProcess.length}</span> flagged
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5">
          <p className="text-sm font-medium text-violet-700">{selectedIds.size} selected</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-sm font-medium text-violet-600 hover:underline"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkMarkProcessed}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
            >
              <FiCheckCircle className="h-3.5 w-3.5" />
              {`Mark Processed (${selectedIds.size})`}
            </button>
            <button
              type="button"
              onClick={handleBulkShip}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
            >
              <FiTruck className="h-3.5 w-3.5" />
              {`Mark Shipped (${selectedIds.size})`}
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
          <span className="text-sm">Loading flagged orders…</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={FiRepeat}
          title={search ? 'No matches' : 'Nothing flagged'}
          description={
            search
              ? 'No flagged order matches that search.'
              : 'No order is currently marked Alter or Return Found.'
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <OrdersTable
          orders={pageItems}
          onCancelOrder={(order) => setConfirmAction({ type: 'cancel', order })}
          onShip={(order) => setConfirmAction({ type: 'ship', order })}
          onMarkProcessed={(order) => setConfirmAction({ type: 'process', order })}
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

      {confirmAction &&
        (confirmAction.type === 'cancel' ? (
          <CancelOtpDialog
            title="Cancel this order?"
            description={`Order #${confirmAction.order.order_id} (style ${confirmAction.order.style_number}) will be flagged "Cancel Request" and moved to Cancel Requests for review. Verify your mobile number to continue.`}
            onVerified={handleCancelVerified}
            onClose={() => setConfirmAction(null)}
          />
        ) : (
          <ConfirmDialog
            {...getConfirmDialogProps(confirmAction, selectedIds.size)}
            loading={confirmLoading}
            onConfirm={handleConfirmAction}
            onCancel={() => setConfirmAction(null)}
          />
        ))}
    </div>
  );
};

export default ReadyForProcessPage;
