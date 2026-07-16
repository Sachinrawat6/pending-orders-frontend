import { useMemo, useState } from 'react';
import { FiRepeat, FiRefreshCw } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import OrderSearch from '../components/common/OrderSearch';
import OrdersTable from '../components/orders/OrdersTable';
import OrderFormDialog from '../components/orders/OrderFormDialog';
import { useAuth } from '../context/AuthContext';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { useClientPagination } from '../hooks/useClientPagination';
import { filterOrdersBySearch } from '../lib/searchOrders';
import { updatePendingOrder } from '../lib/api';

const ReadyForProcessPage = () => {
  const { employee } = useAuth();
  const { readyForProcess, stockInfoByStyle, loading, error, reload } = useOrdersOverview();
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => filterOrdersBySearch(readyForProcess, search),
    [readyForProcess, search]
  );
  const { pageItems, pagination, setPage } = useClientPagination(filtered, 25);
  const [editingOrder, setEditingOrder] = useState(null);
  const [shippingOrderId, setShippingOrderId] = useState(null);
  const [shipError, setShipError] = useState(null);

  const handleUpdate = async (payload) => {
    await updatePendingOrder(editingOrder._id, payload);
    reload();
  };

  const handleShip = async (order) => {
    const USER_CONFIRMATION = window.confirm('Are you sure want to mark as shipped?');
    if (!USER_CONFIRMATION) {
      return;
    }
    setShippingOrderId(order._id);
    setShipError(null);
    try {
      await updatePendingOrder(order._id, {
        isShipped: true,
        employee_id: employee.id,
        employee_name: employee.name,
      });
      reload();
    } catch (err) {
      setShipError(err.message);
    } finally {
      setShippingOrderId(null);
    }
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

      {error && (
        <Banner variant="error" onDismiss={reload}>
          {error}
        </Banner>
      )}
      {shipError && (
        <Banner variant="error" onDismiss={() => setShipError(null)}>
          {shipError}
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
          onEdit={setEditingOrder}
          onShip={handleShip}
          shippingOrderId={shippingOrderId}
          pagination={pagination}
          onPageChange={setPage}
          stockInfoByStyle={stockInfoByStyle}
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

export default ReadyForProcessPage;
