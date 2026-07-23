import { useState } from 'react';
import {
  FiTruck,
  FiScissors,
  FiRepeat,
  FiXCircle,
  FiCheckCircle,
  FiX,
  FiChevronUp,
  FiChevronDown,
} from 'react-icons/fi';
import StatusBadge from '../common/StatusBadge';
import Pagination from '../common/Pagination';
import { useProductImages } from '../../hooks/useProductImages';
import { formatDateTime, formatStock, formatValue, getDaysSince } from '../../lib/formatters';
import {
  resolveOrderStage,
  AUTO_CANCEL_REASON,
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

const STAGE_LABELS = {
  cancelRequested: { label: 'Cancel Requested', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'slate' },
  shipped: { label: 'Shipped', tone: 'sky' },
  readyForCutting: { label: 'Ready for Cutting', tone: 'indigo' },
  readyForProcess: { label: 'Ready for Process', tone: 'violet' },
  processed: { label: 'Processed', tone: 'emerald' },
  pending: { label: 'Pending', tone: 'amber' },
};

const getStatus = (order, stockInfoByStyle) => STAGE_LABELS[resolveOrderStage(order, stockInfoByStyle)];

// A merged reason (e.g. "Manual Move To Pending, Manual Move To Cutting")
// reads as a history trail — each part gets its own colored chip instead of
// one run-on line of text.
const REASON_CHIP_TONES = {
  'Manual Move To Pending': 'bg-amber-50 text-amber-700',
  'Manual Move To Cutting': 'bg-indigo-50 text-indigo-700',
  'Manual Move To Process': 'bg-violet-50 text-violet-700',
  Alter: 'bg-violet-50 text-violet-700',
  'Return Found': 'bg-violet-50 text-violet-700',
  'Scanned by Store': 'bg-violet-50 text-violet-700',
  'Cancel Request': 'bg-red-50 text-red-700',
  [AUTO_CANCEL_REASON]: 'bg-red-50 text-red-700',
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

// Columns beyond "Style Number" / "Status" / actions are secondary — hidden
// on narrower screens so the table doesn't force horizontal scrolling just
// to see the status of an order. `key` marks the columns that can be
// sorted by clicking their header (see useSortableOrders). `optional`
// columns only render when the page opts in (see `showPendingDays` prop).
const HEADINGS = [
  { key: 'style_number', label: 'Style Number', hide: '' },
  { key: 'channel', label: 'Channel', hide: 'hidden sm:table-cell' },
  { key: 'order_date', label: 'Date', hide: 'hidden md:table-cell' },
  {
    key: 'pending_days',
    label: 'Pending Days',
    hide: 'hidden md:table-cell',
    optional: 'showPendingDays',
  },
  { label: 'Employee', hide: 'hidden lg:table-cell' },
  { label: 'Reason', hide: 'hidden lg:table-cell' },
  {
    label: 'Scan Status',
    hide: 'hidden lg:table-cell',
    optional: 'showScanStatus',
  },
  { label: 'Stock', hide: 'hidden md:table-cell' },
  { label: 'Status', hide: '' },
  { label: '', hide: '' },
];

// Shows which direction a column is sorted in, and — when more than one
// column is active at once — a small priority badge so it's clear which
// column decides ties first.
const SortIndicator = ({ direction, priority }) => (
  <span className="inline-flex items-center">
    <span className="relative -space-y-1.5 text-slate-300">
      <FiChevronUp className={`block h-3 w-3 ${direction === 'asc' ? 'text-indigo-600' : ''}`} />
      <FiChevronDown
        className={`-mt-1 block h-3 w-3 ${direction === 'desc' ? 'text-indigo-600' : ''}`}
      />
    </span>
    {priority && (
      <span className="ml-0.5 text-[10px] font-semibold text-indigo-500">{priority}</span>
    )}
  </span>
);

const getSortMeta = (sortRules, key) => {
  const idx = (sortRules || []).findIndex((rule) => rule.key === key);
  if (idx === -1) return { direction: null, priority: null };
  return {
    direction: sortRules[idx].direction,
    priority: sortRules.length > 1 ? idx + 1 : null,
  };
};

const OrdersTable = ({
  orders,
  onCancelOrder,
  onShip,
  shippingOrderId,
  onMoveToCutting,
  movingToCuttingId,
  onMoveToProcess,
  movingToProcessId,
  onMarkCancelled,
  markingCancelledId,
  onMarkProcessed,
  markingProcessedId,
  pagination,
  onPageChange,
  stockInfoByStyle,
  selectable,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sortRules,
  onSortToggle,
  showPendingDays,
  showScanStatus,
  scanStatusFor,
}) => {
  const { imageFor } = useProductImages(orders);
  const allSelected =
    selectable && orders.length > 0 && orders.every((order) => selectedIds?.has(order._id));
  const [previewImage, setPreviewImage] = useState(null);
  const optionalFlags = { showPendingDays, showScanStatus };
  const headings = HEADINGS.filter((heading) => !heading.optional || optionalFlags[heading.optional]);

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
              {headings.map((heading) => {
                const { direction, priority } = getSortMeta(sortRules, heading.key);
                return (
                  <th
                    key={heading.label || 'actions'}
                    className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${heading.hide}`}
                  >
                    {heading.key && onSortToggle ? (
                      <button
                        type="button"
                        onClick={() => onSortToggle(heading.key)}
                        className="inline-flex items-center gap-1 transition hover:text-slate-700"
                      >
                        {heading.label}
                        <SortIndicator direction={direction} priority={priority} />
                      </button>
                    ) : (
                      heading.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const status = getStatus(order, stockInfoByStyle);
              const stockInfo = stockInfoByStyle?.get(order.style_number);
              const displayReason = getDisplayReason(order, stockInfoByStyle || new Map());
              return (
                <tr
                  key={order._id}
                  className="transition even:bg-slate-50/60 hover:bg-indigo-50/40 border-b border-slate-200"
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
                    {formatValue(order.size)} · {formatValue(order.channel)}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 md:table-cell">
                    {formatDateTime(order.order_date)}
                  </td>
                  {showPendingDays && (
                    <td className="hidden whitespace-nowrap px-4 py-3 tabular-nums text-slate-600 md:table-cell">
                      {(() => {
                        const days = getDaysSince(order.order_date);
                        return days === null ? '—' : `${days} ${days === 1 ? 'day' : 'days'}`;
                      })()}
                    </td>
                  )}
                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 lg:table-cell">
                    <div>{formatValue(order.employee_name)}</div>
                    <div className="text-xs text-slate-400">#{formatValue(order.employee_id)}</div>
                  </td>
                  <td className="hidden max-w-[200px] px-4 py-3 text-slate-600 lg:table-cell">
                    <ReasonChips reason={displayReason} />
                  </td>
                  {showScanStatus && (
                    <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 lg:table-cell">
                      {scanStatusFor?.(order.order_id) || '—'}
                    </td>
                  )}
                  <td className="hidden max-w-[200px] px-4 py-3 text-slate-600 md:table-cell">
                    {stockInfo?.fabrics?.length ? (
                      <div className="space-y-0.5">
                        {stockInfo.fabrics.map((fabric, index) => (
                          <div key={`${fabric.fabricNumber}-${index}`} className="text-xs">
                            <span className="tabular-nums font-medium text-slate-700">
                              {formatStock(fabric.availableStock)}
                            </span>{' '}
                            <span className="text-slate-400">
                              {fabric.fabricName || '—'} ({fabric.fabricNumber || '—'})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="tabular-nums">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {onMoveToCutting && !order.isShipped && !order.isCancelApproval && (
                        <button
                          type="button"
                          onClick={() => onMoveToCutting(order)}
                          disabled={movingToCuttingId === order._id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FiScissors className="h-3.5 w-3.5" />
                          {movingToCuttingId === order._id ? 'Moving…' : 'Move to Cutting'}
                        </button>
                      )}
                      {onMoveToProcess && !order.isShipped && !order.isCancelApproval && (
                        <button
                          type="button"
                          onClick={() => onMoveToProcess(order)}
                          disabled={movingToProcessId === order._id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FiRepeat className="h-3.5 w-3.5" />
                          {movingToProcessId === order._id ? 'Moving…' : 'Move to Process'}
                        </button>
                      )}
                      {onShip && !order.isShipped && !order.isCancelApproval && (
                        <button
                          type="button"
                          onClick={() => onShip(order)}
                          disabled={shippingOrderId === order._id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FiTruck className="h-3.5 w-3.5" />
                          {shippingOrderId === order._id ? 'Shipping…' : 'Ship'}
                        </button>
                      )}
                      {onCancelOrder && !order.isShipped && !order.isCancelApproval && (
                        <button
                          type="button"
                          onClick={() => onCancelOrder(order)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-red-700"
                        >
                          <FiXCircle className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      )}
                      {onMarkProcessed && !order.isShipped && !order.isCancelApproval && (
                        <button
                          type="button"
                          onClick={() => onMarkProcessed(order)}
                          disabled={markingProcessedId === order._id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FiCheckCircle className="h-3.5 w-3.5" />
                          {markingProcessedId === order._id ? 'Marking…' : 'Mark as Processed'}
                        </button>
                      )}
                      {onMarkCancelled && !order.isShipped && !order.isCancelled && (
                        <button
                          type="button"
                          onClick={() => onMarkCancelled(order)}
                          disabled={markingCancelledId === order._id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-slate-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FiXCircle className="h-3.5 w-3.5" />
                          {markingCancelledId === order._id ? 'Marking…' : 'Mark as Cancelled'}
                        </button>
                      )}
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
