import { useState } from 'react';
import { FiScissors, FiRefreshCw, FiDownload } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import OrdersTable from '../components/orders/OrdersTable';
import OrderFormDialog from '../components/orders/OrderFormDialog';
import { useGlobalContext, useOrdersOverview } from '../context/OrdersOverviewContext';
import { useClientPagination } from '../hooks/useClientPagination';
import { updatePendingOrder } from '../lib/api';
import { downloadQRCodeSheet } from '../components/services/downloadQrCode';

const ReadyForCuttingPage = () => {
  const { readyForCutting, stockInfoByStyle, loading, error, reload } = useOrdersOverview();
  const { styles } = useGlobalContext();
  const { pageItems, pagination, setPage } = useClientPagination(readyForCutting, 25);
  const [editingOrder, setEditingOrder] = useState(null);

  const handleUpdate = async (payload) => {
    await updatePendingOrder(editingOrder._id, payload);
    reload();
  };
  console.log(styles);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
            Ready for Cutting
          </h2>
          <p className="text-sm text-slate-500">
            Orders with enough fabric in stock, plus any flagged Alter / Return Found.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
            <span className="font-display font-semibold">{readyForCutting.length}</span> ready
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
            onClick={() => downloadQRCodeSheet(readyForCutting, styles)}
            className="inline-flex cursor-pointer bg-green-200 text-green-800 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium  transition hover:bg-green-300"
          >
            <FiDownload className="h-3.5 w-3.5" />
            Download QrCodes
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
          <span className="text-sm">Checking stock availability…</span>
        </div>
      )}

      {!loading && readyForCutting.length === 0 && (
        <EmptyState
          icon={FiScissors}
          title="Nothing ready yet"
          description="No pending order currently has enough fabric in stock."
        />
      )}

      {!loading && readyForCutting.length > 0 && (
        <OrdersTable
          orders={pageItems}
          onEdit={setEditingOrder}
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

export default ReadyForCuttingPage;
