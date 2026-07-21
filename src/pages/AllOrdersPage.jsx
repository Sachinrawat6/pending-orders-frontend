import { useMemo, useState } from 'react';
import { FiPackage, FiRefreshCw } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import OrderSearch from '../components/common/OrderSearch';
import OrdersTable from '../components/orders/OrdersTable';
import OrderFormDialog from '../components/orders/OrderFormDialog';
import { updatePendingOrder } from '../lib/api';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { useClientPagination } from '../hooks/useClientPagination';
import { useSortableOrders } from '../hooks/useSortableOrders';
import { filterOrdersBySearch } from '../lib/searchOrders';

const AllOrdersPage = () => {
  const { orders, stockInfoByStyle, loading, error, reload } = useOrdersOverview();
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => filterOrdersBySearch(orders, search), [orders, search]);
  const { sorted, sortRules, toggleSort } = useSortableOrders(filtered);
  const { pageItems, pagination, setPage } = useClientPagination(sorted, 25);

  const [editingOrder, setEditingOrder] = useState(null);

  const handleUpdate = async (payload) => {
    await updatePendingOrder(editingOrder._id, payload);
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-100">
            <span className="font-display font-semibold">{orders.length}</span> total orders
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

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={FiPackage}
          title={search ? 'No matches' : 'No orders yet'}
          description={
            search ? 'No order matches that search.' : 'Orders will appear here once they are scanned.'
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <OrdersTable
          orders={pageItems}
          onEdit={setEditingOrder}
          pagination={pagination}
          onPageChange={setPage}
          stockInfoByStyle={stockInfoByStyle}
          sortRules={sortRules}
          onSortToggle={toggleSort}
        />
      )}

      {editingOrder && (
        <OrderFormDialog order={editingOrder} onSubmit={handleUpdate} onClose={() => setEditingOrder(null)} />
      )}
    </div>
  );
};

export default AllOrdersPage;
