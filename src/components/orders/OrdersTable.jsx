import { FiEdit2 } from 'react-icons/fi';
import StatusBadge from '../common/StatusBadge';
import Pagination from '../common/Pagination';
import { useProductImages } from '../../hooks/useProductImages';
import { formatDate, formatValue } from '../../lib/formatters';
import { isForceReadyReason, getDisplayReason } from '../../lib/orderCategories';

const ProductThumbnail = ({ src, alt }) =>
  src ? (
    <img
      src={src}
      alt={alt}
      className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
      loading="lazy"
    />
  ) : (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-300 ring-1 ring-slate-200">
      —
    </div>
  );

const getStatus = (order, stockInfoByStyle) => {
  if (order.isCancelApproval) return { label: 'Cancel Requested', tone: 'red' };
  if (order.isShipped) return { label: 'Shipped', tone: 'sky' };
  if (isForceReadyReason(order.reason)) return { label: 'Ready for Cutting', tone: 'indigo' };
  if (order.isProcessed) return { label: 'Processed', tone: 'emerald' };
  if (stockInfoByStyle && (stockInfoByStyle.get(order.style_number)?.availableStock ?? 0) > 2) {
    return { label: 'Ready for Cutting', tone: 'indigo' };
  }
  return { label: 'Pending', tone: 'amber' };
};

// Columns beyond "Order" / "Status" / actions are secondary — hidden on
// narrower screens so the table doesn't force horizontal scrolling just to
// see the status of an order.
const HEADINGS = [
  { label: 'Order', hide: '' },
  { label: 'Details', hide: 'hidden sm:table-cell' },
  { label: 'Employee', hide: 'hidden lg:table-cell' },
  { label: 'Reason', hide: 'hidden lg:table-cell' },
  { label: 'Stock', hide: 'hidden md:table-cell' },
  { label: 'Status', hide: '' },
  { label: '', hide: '' },
];

const OrdersTable = ({ orders, onEdit, pagination, onPageChange, stockInfoByStyle }) => {
  const { imageFor } = useProductImages(orders);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {HEADINGS.map((heading) => (
                <th
                  key={heading.label || 'actions'}
                  className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${heading.hide}`}
                >
                  {heading.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => {
              const status = getStatus(order, stockInfoByStyle);
              const stockInfo = stockInfoByStyle?.get(order.style_number);
              const displayReason = getDisplayReason(order, stockInfoByStyle || new Map());
              return (
                <tr
                  key={order._id}
                  className="transition even:bg-slate-50/60 hover:bg-indigo-50/40"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumbnail
                        src={imageFor(order.style_number)}
                        alt={String(order.style_number)}
                      />
                      <div>
                        <div className="font-medium text-slate-900">
                          {formatValue(order.style_number)}
                        </div>
                        <div className="text-xs tabular-nums text-slate-400">
                          #{formatValue(order.order_id)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 sm:table-cell">
                    <div>{formatValue(order.size)} · {formatValue(order.channel)}</div>
                    <div className="text-xs text-slate-400">{formatDate(order.order_date)}</div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 lg:table-cell">
                    <div>{formatValue(order.employee_name)}</div>
                    <div className="text-xs text-slate-400">#{formatValue(order.employee_id)}</div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 lg:table-cell">
                    {formatValue(displayReason)}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 md:table-cell">
                    <div className="tabular-nums">{stockInfo ? stockInfo.availableStock : '—'}</div>
                    <div className="text-xs text-slate-400">{stockInfo?.location || '—'}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(order)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100"
                    >
                      <FiEdit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.totalRecords}
          limit={pagination.limit}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
};

export default OrdersTable;
