import { useState } from 'react';
import { FiXCircle, FiRefreshCw } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import OrdersTable from '../components/orders/OrdersTable';
import OrderFormDialog from '../components/orders/OrderFormDialog';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { useClientPagination } from '../hooks/useClientPagination';
import { updatePendingOrder } from '../lib/api';

const CancelRequestsPage = () => {
  const { cancelRequested, stockInfoByStyle, loading, error, reload } = useOrdersOverview();
  const { pageItems, pagination, setPage } = useClientPagination(cancelRequested, 25);
  const [editingOrder, setEditingOrder] = useState(null);

  const handleUpdate = async (payload) => {
    await updatePendingOrder(editingOrder._id, payload);
    reload();
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

      {error && (
        <Banner variant="error" onDismiss={reload}>
          {error}
        </Banner>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Spinner className="h-5 w-5" />
          <span className="text-sm">Loading cancel requests…</span>
        </div>
      )}

      {!loading && cancelRequested.length === 0 && (
        <EmptyState icon={FiXCircle} title="No cancel requests" description="Nothing is currently flagged for cancellation." />
      )}

      {!loading && cancelRequested.length > 0 && (
        <OrdersTable
          orders={pageItems}
          onEdit={setEditingOrder}
          pagination={pagination}
          onPageChange={setPage}
          stockInfoByStyle={stockInfoByStyle}
        />
      )}

      {editingOrder && (
        <OrderFormDialog order={editingOrder} onSubmit={handleUpdate} onClose={() => setEditingOrder(null)} />
      )}
    </div>
  );
};

export default CancelRequestsPage;
