import { useState } from 'react';
import { FiEdit2, FiTruck, FiScissors, FiX } from 'react-icons/fi';
import StatusBadge from '../common/StatusBadge';
import Pagination from '../common/Pagination';
import { useProductImages } from '../../hooks/useProductImages';
import { formatDate, formatValue } from '../../lib/formatters';
import {
  isForceReadyReason,
  isManualPendingReason,
  isManualCuttingReason,
  getDisplayReason,
} from '../../lib/orderCategories';

const ProductThumbnail = ({ src, alt, onClick }) =>
  src ? (
    <button
      type="button"
      onClick={onClick}
      className="h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-2 hover:ring-indigo-300"
    >
      <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
    </button>
  ) : (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-300 ring-1 ring-slate-200">
      —
    </div>
  );

const ImageLightbox = ({ src, alt, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-4"
    onClick={onClose}
  >
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
    >
      <FiX className="h-5 w-5" />
    </button>
    <img
      src={src}
      alt={alt}
      onClick={(event) => event.stopPropagation()}
      className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
    />
  </div>
);

const getStatus = (order, stockInfoByStyle) => {
  if (order.isCancelApproval) return { label: 'Cancel Requested', tone: 'red' };
  if (order.isShipped) return { label: 'Shipped', tone: 'sky' };
  if (isManualCuttingReason(order.reason)) return { label: 'Ready for Cutting', tone: 'indigo' };
  if (isManualPendingReason(order.reason)) return { label: 'Pending', tone: 'amber' };
  if (isForceReadyReason(order.reason)) return { label: 'Ready for Process', tone: 'violet' };
  if (order.isProcessed) return { label: 'Processed', tone: 'emerald' };
  if (stockInfoByStyle && (stockInfoByStyle.get(order.style_number)?.availableStock ?? 0) > 2) {
    return { label: 'Ready for Cutting', tone: 'indigo' };
  }
  return { label: 'Pending', tone: 'amber' };
};

// A merged reason (e.g. "Manual Move To Pending, Manual Move To Cutting")
// reads as a history trail — each part gets its own colored chip instead of
// one run-on line of text.
const REASON_CHIP_TONES = {
  'Manual Move To Pending': 'bg-amber-50 text-amber-700',
  'Manual Move To Cutting': 'bg-indigo-50 text-indigo-700',
  Alter: 'bg-violet-50 text-violet-700',
  'Return Found': 'bg-violet-50 text-violet-700',
  'Cancel Request': 'bg-red-50 text-red-700',
  'In stock available': 'bg-emerald-50 text-emerald-700',
};
const DEFAULT_REASON_CHIP_TONE = 'bg-slate-100 text-slate-600';

const ReasonChips = ({ reason }) => {
  const parts = String(reason || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return <span>{formatValue(reason)}</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((part, index) => (
        <span
          key={`${part}-${index}`}
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
            REASON_CHIP_TONES[part] || DEFAULT_REASON_CHIP_TONE
          }`}
        >
          {part}
        </span>
      ))}
    </div>
  );
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

const OrdersTable = ({
  orders,
  onEdit,
  onShip,
  shippingOrderId,
  onMoveToCutting,
  movingToCuttingId,
  pagination,
  onPageChange,
  stockInfoByStyle,
  selectable,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}) => {
  const { imageFor } = useProductImages(orders);
  const allSelected = selectable && orders.length > 0 && orders.every((order) => selectedIds?.has(order._id));
  const [previewImage, setPreviewImage] = useState(null);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {selectable && (
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    aria-label="Select all"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              )}
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
                  {selectable && (
                    <td className="whitespace-nowrap px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(order._id) ?? false}
                        onChange={() => onToggleSelect(order._id)}
                        aria-label={`Select order ${order.order_id}`}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumbnail
                        src={imageFor(order.style_number)}
                        alt={String(order.style_number)}
                        onClick={() => {
                          const src = imageFor(order.style_number);
                          if (src) setPreviewImage({ src, alt: String(order.style_number) });
                        }}
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
                    <div>
                      {formatValue(order.size)} · {formatValue(order.channel)}
                    </div>
                    <div className="text-xs text-slate-400">{formatDate(order.order_date)}</div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 lg:table-cell">
                    <div>{formatValue(order.employee_name)}</div>
                    <div className="text-xs text-slate-400">#{formatValue(order.employee_id)}</div>
                  </td>
                  <td className="hidden max-w-[200px] px-4 py-3 text-slate-600 lg:table-cell">
                    <ReasonChips reason={displayReason} />
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 md:table-cell">
                    <div className="tabular-nums">{stockInfo ? stockInfo.availableStock : '—'}</div>
                    <div className="text-xs text-slate-400">{stockInfo?.location || '—'}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {onMoveToCutting && !order.isShipped && !order.isCancelApproval && (
                        <button
                          type="button"
                          onClick={() => onMoveToCutting(order)}
                          disabled={movingToCuttingId === order._id}
                          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FiScissors className="h-3.5 w-3.5" />
                          {movingToCuttingId === order._id ? 'Moving…' : 'Move to Cutting'}
                        </button>
                      )}
                      {onShip && !order.isShipped && !order.isCancelApproval && (
                        <button
                          type="button"
                          onClick={() => onShip(order)}
                          disabled={shippingOrderId === order._id}
                          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-sky-600 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FiTruck className="h-3.5 w-3.5" />
                          {shippingOrderId === order._id ? 'Shipping…' : 'Ship'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEdit(order)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100"
                      >
                        <FiEdit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </div>
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

      {previewImage && (
        <ImageLightbox
          src={previewImage.src}
          alt={previewImage.alt}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
};

export default OrdersTable;
