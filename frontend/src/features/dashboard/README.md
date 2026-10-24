# Dashboard

**Owner:** Member 3 — Analytics, Forecasting & Infrastructure (Jaz Villanueva)

## Requirements (SRS v1.2)

- **FR-11 Dashboard and reports:** summaries of sales, inventory, product performance and customer/reseller activity. The Owner sees everything; Staff will see only the panels their role allows once roles exist (#1).
- **FR-6 Low-stock monitoring:** the stock watch panel lists products at or below their reorder level, using the same rule and labels as the Products screen.
- **FR-15:** reorder suggestions get a panel once forecasting is running (placeholder for now).

## What's on it

| Panel | Shows |
|---|---|
| Summary tiles | Revenue, number of sales, units sold, average sale, for the chosen period (7 / 30 / 90 days, all time) |
| Daily sales | Revenue per day as columns; point at or tab to a day for its total; "Show as a table" for the numbers |
| Sales by channel | Walk-in, online and reseller revenue |
| Top products | Best sellers by units |
| Customers & resellers | Top buyers by revenue (walk-in sales with no customer are left out) |
| Stock watch | Out-of-stock and low-stock products |
| Recent sales | The latest five sales, voided ones included |

Voided sales never count toward totals.

## Data

`dashboardApi.js` returns one object for every panel.

- **Sample mode** (default): built from the Sales module's sample data, so the Dashboard and the Sales screen always agree. Products without their own reorder level use 5, the Products screen's default.
- **Database mode** (`VITE_USE_SAMPLE_DATA=false`): reads `dashboard_summary` and `low_stock` (contract in `docs/api-contracts.md`).

## Files

| File | What it does |
|---|---|
| `DashboardPage.jsx` | Page layout, period picker |
| `dashboardApi.js` | Data source (sample or database) |
| `dashboardUtils.js` | Totals and breakdowns, in centavos so sums stay exact |
| `*.jsx` panels | One component per panel |
| `dashboard.module.css` | Dashboard styles |
