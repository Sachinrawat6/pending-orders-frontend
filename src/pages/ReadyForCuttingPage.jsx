import { useMemo, useState } from 'react';
import { FiScissors, FiRefreshCw, FiDownload } from 'react-icons/fi';
import Banner from '../components/common/Banner';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import CancelOtpDialog from '../components/common/CancelOtpDialog';
import OrderSearch from '../components/common/OrderSearch';
import OrdersTable from '../components/orders/OrdersTable';
import { useGlobalContext, useOrdersOverview } from '../context/OrdersOverviewContext';
import { useClientPagination } from '../hooks/useClientPagination';
import { useSortableOrders } from '../hooks/useSortableOrders';
import { filterOrdersBySearch } from '../lib/searchOrders';
import { updatePendingOrder } from '../lib/api';
import { downloadQRCodeSheet } from '../components/services/downloadQrCode';

const ReadyForCuttingPage = () => {
  const { readyForCutting, stockInfoByStyle, loading, error, reload } = useOrdersOverview();
  const { styles } = useGlobalContext();
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => filterOrdersBySearch(readyForCutting, search),
    [readyForCutting, search]
  );
  const { sorted, sortRules, toggleSort } = useSortableOrders(filtered);
  const { pageItems, pagination, setPage } = useClientPagination(sorted, 25);
  const [cancelOrder, setCancelOrder] = useState(null);

  // Cancel is OTP-gated (see CancelOtpDialog) — the mutation only runs after
  // a whitelisted phone number verifies the OTP.
  const handleCancelVerified = async () => {
    if (!cancelOrder) return;
    await updatePendingOrder(cancelOrder._id, {
      reason: 'Cancel Request',
      isCancelApproval: true,
    });
    reload();
    setCancelOrder(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
            Ready for Cutting
          </h2>
          <p className="text-sm text-slate-500">
            Orders with enough fabric in stock, plus any manually moved to cutting.
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

      <OrderSearch value={search} onChange={setSearch} />

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

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={FiScissors}
          title={search ? 'No matches' : 'Nothing ready yet'}
          description={
            search
              ? 'No ready-for-cutting order matches that search.'
              : 'No pending order currently has enough fabric in stock.'
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <OrdersTable
          orders={pageItems}
          onCancelOrder={setCancelOrder}
          pagination={pagination}
          onPageChange={setPage}
          stockInfoByStyle={stockInfoByStyle}
          sortRules={sortRules}
          onSortToggle={toggleSort}
        />
      )}

      {cancelOrder && (
        <CancelOtpDialog
          title="Cancel this order?"
          description={`Order #${cancelOrder.order_id} (style ${cancelOrder.style_number}) will be flagged "Cancel Request" and moved to Cancel Requests for review. Verify your mobile number to continue.`}
          onVerified={handleCancelVerified}
          onClose={() => setCancelOrder(null)}
        />
      )}
    </div>
  );
};

export default ReadyForCuttingPage;
