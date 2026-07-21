# Pending Orders — Frontend

React + Vite app for the warehouse team to scan orders, check fabric stock, and push each order through the Pending → Ready for Cutting / Ready for Process → Shipped pipeline (or flag it for cancellation). Talks to the backend in `../backend` plus two external services (a stock API and a Google Sheet of style details).

## Tech Stack

- React 18 + Vite 5
- React Router 7
- Tailwind CSS 4
- `xlsx` (bulk import), `html5-qrcode` (camera barcode scanning)

## Getting Started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build
npm run lint
```

### Environment Variables (`.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend (no `/api` prefix — calls hit `/pending-orders`, `/product-styles` directly) |
| `VITE_GOOGLE_SHEET_API_KEY` | API key for reading the style-details Google Sheet |

## Login

Not a real auth system — `LoginPage` asks for an Employee ID, looks it up via `GET /pending-orders/nocodb/user/:employee_id` (backed by an internal employee-directory API), and stores `{ id, name, locations }` in `localStorage` (`AuthContext`). There's no password and no server-side session; anyone with a valid employee ID can sign in.

## How an Order Moves Through the App

There's no separate "status" field — every page derives an order's current stage from `reason` / `isProcessed` / `isCancelApproval` / `isShipped` plus live fabric stock (`lib/orderCategories.js` → `categorizeOrdersWithStockInfo`). The stages, and the page that drives each transition:

| Stage | Route | What happens here |
|---|---|---|
| **Scan** | `/` (Scan Order) | Type/scan an order ID → looked up in NocoDB → fabric stock checked. Enough stock queues it on the right for manual routing; low stock queues it on the left to bulk-save into Pending. |
| **Pending** | `/pending` | Awaiting fabric. Sort/filter/search, bulk-select, "Move to Cutting", or export a fabric pull-list PDF. |
| **Ready for Cutting** | `/ready-for-cutting` | Enough fabric is in stock (checked live) or it was manually moved here. QR codes can be generated for the cutting floor. |
| **Move to Process / Cancel** | `/pending-to-cutting` | Scan an order still in Pending/Ready-for-Cutting and pick a reason: `Alter` / `Return Found` → Ready for Process; `Cancel Request` → Cancel Requests. |
| **Ready for Process** | `/ready-for-process` | Orders flagged `Alter`/`Return Found`. Can be shipped directly from here. |
| **Ship Order** | `/ship-order` | Scan an order that's Ready for Cutting or Ready for Process → marks it shipped. |
| **Shipped** | `/shipped` | Terminal — everything marked shipped. |
| **Cancel Requests** | `/cancel-requests` | Orders flagged `Cancel Request`, awaiting manual review. |
| **All Orders** | `/all-orders` | Full unfiltered list; also where you manually add one order or bulk-import a spreadsheet. |
| **Dashboard** | `/dashboard` | Counts per stage, filterable by a single date or date range. |

Every order also auto-expires 30 days after creation (a TTL index on the backend), so this app is meant to reflect *current* work-in-progress, not long-term order history.

## Data Fetching

`OrdersOverviewContext` fetches the full order list, the external fabric-stock list, and the style-details Google Sheet **once** on load (not per-page), then every page reads from that shared, already-categorized snapshot. `reload()` re-fetches all three. Pages that list orders (`Pending`, `Ready for Cutting`, `Ready for Process`, `Shipped`, `Cancel Requests`, `All Orders`) all follow the same pipeline before rendering:

```
raw orders → search (Order ID / Style Number) → [Pending only: channel filter, date-range filter]
           → sort (useSortableOrders) → client-side pagination (25/page) → <OrdersTable>
```

## Pending Orders Page — Sorting, Filtering, PDF Export

The `<OrdersTable>` column headers (Style Number, Channel, Date) are clickable and support **multi-column sort**: each click cycles that column asc → desc → off, and the most-recently-clicked column becomes the primary sort key while older active columns stay on as tie-breakers (a small badge shows the priority order). This is implemented in `hooks/useSortableOrders.js` and used by every order-listing page; **Pending Orders** additionally defaults to newest-first (today's orders on top) until a header is clicked (`DEFAULT_SORT` in `PendingOrdersPage.jsx`).

Pending Orders also has, above the table:
- **Search** (`OrderSearch`) — Order ID / Style Number.
- **Channel filter** (`ChannelFilter`) — Myntra / Shopify / Nykaa / Ajio / Tatacliq.
- **Date range filter** (`DateRangeFilter`) — filters by `order_date`.
- **Export PDF** — prints a fabric pull-list (Style Number, Size, Channel, Fabric Stock, Fabric Name, Location) for every order matching the current search/channel/date filters, via the browser's print-to-PDF (`window.print()` + a `.print-area` block hidden on screen, see `index.css`).

## Project Structure

```
frontend/src/
├── pages/            # one file per route (see table above)
├── components/
│   ├── orders/        # OrdersTable, OrderFormDialog, BulkImportDialog
│   ├── common/         # OrderSearch, ChannelFilter, DateRangeFilter, Pagination, StatusBadge, ...
│   ├── scan/           # CameraScannerDialog, ScanSavedList
│   ├── dashboard/      # StatusBarChart
│   └── services/       # downloadQrCode, google_sheet.service
├── context/           # AuthContext (employee login), OrdersOverviewContext (shared data + categorization)
├── hooks/             # useClientPagination, useSortableOrders, useProductImages
└── lib/               # api.js (backend + stock calls), orderCategories.js (stage logic),
                        # filterOrdersBy{Search,Channel,DateRange}.js, formatters.js, nocodb.js, scanQueue.js
```
