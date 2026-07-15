import { useState } from 'react';
import { FiPackage, FiPlus, FiUpload, FiRefreshCw } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import OrdersTable from '../components/orders/OrdersTable';
import OrderFormDialog from '../components/orders/OrderFormDialog';
import BulkImportDialog from '../components/orders/BulkImportDialog';
import { createPendingOrder, updatePendingOrder, bulkCreatePendingOrders } from '../lib/api';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { useClientPagination } from '../hooks/useClientPagination';

const AllOrdersPage = () => {
  const { orders, stockInfoByStyle, loading, error, reload } = useOrdersOverview();
  const { pageItems, pagination, setPage } = useClientPagination(orders, 25);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  const handleCreate = async (payload) => {
    await createPendingOrder(payload);
    reload();
  };

  const handleUpdate = async (payload) => {
    await updatePendingOrder(editingOrder._id, payload);
    reload();
  };

  const handleBulkImport = async (records) => {
    await bulkCreatePendingOrders(records);
    reload();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">All Orders</h2>
          <p className="text-sm text-slate-500">Orders awaiting packing, oldest first.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pagination && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-100">
              <span className="font-display font-semibold">{pagination.totalRecords}</span> total orders
            </span>
          )}
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
            onClick={() => setShowBulkDialog(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <FiUpload className="h-4 w-4" />
            Bulk Import
          </button>
          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            <FiPlus className="h-4 w-4" />
            Add Order
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
          <span className="text-sm">Loading pending orders…</span>
        </div>
      )}

      {!loading && orders.length === 0 && (
        <EmptyState
          icon={FiPackage}
          title="No pending orders"
          description="Add one manually or bulk-import a file to get started."
        />
      )}

      {!loading && orders.length > 0 && (
        <OrdersTable
          orders={pageItems}
          onEdit={setEditingOrder}
          pagination={pagination}
          onPageChange={setPage}
          stockInfoByStyle={stockInfoByStyle}
        />
      )}

      {showAddDialog && <OrderFormDialog onSubmit={handleCreate} onClose={() => setShowAddDialog(false)} />}
      {editingOrder && (
        <OrderFormDialog order={editingOrder} onSubmit={handleUpdate} onClose={() => setEditingOrder(null)} />
      )}
      {showBulkDialog && <BulkImportDialog onImport={handleBulkImport} onClose={() => setShowBulkDialog(false)} />}
    </div>
  );
};

export default AllOrdersPage;
