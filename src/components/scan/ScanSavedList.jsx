import { formatDateTime, formatValue } from '../../lib/formatters';

const ScanSavedList = ({ items }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {['Order ID', 'Style', 'Size', 'Color', 'Channel', 'Saved At'].map((heading) => (
              <th
                key={heading}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.order.order_id} className="even:bg-slate-50/60">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                {formatValue(item.order.order_id)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">
                {formatValue(item.order.style_number)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatValue(item.order.size)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatValue(item.color)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatValue(item.order.channel)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(item.savedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default ScanSavedList;
