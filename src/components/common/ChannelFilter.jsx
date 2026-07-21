// Matches the DEFAULT_CHANNELS seeded by the backend (see
// backend/controllers/channelController.js) so the dropdown values line up
// with what's actually stored on orders.
export const CHANNELS = ['Myntra', 'Shopify', 'Nykaa', 'Ajio', 'Tatacliq'];

// Drop-in channel filter for any order-listing page — purely controlled,
// the page owns the selected channel and decides how to filter with it.
const ChannelFilter = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
  >
    <option value="">All Channels</option>
    {CHANNELS.map((channel) => (
      <option key={channel} value={channel}>
        {channel}
      </option>
    ))}
  </select>
);

export default ChannelFilter;
