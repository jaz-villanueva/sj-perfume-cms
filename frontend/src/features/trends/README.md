# Sales trends

**Owner:** Member 3 — Analytics, Forecasting & Infrastructure (Jaz Villanueva)

## Requirements (SRS v1.2)

- **FR-14 Forecasting and trends (trends part):** historical sales and product-usage trends by product and time period. These views are the "actual" side that forecasts are compared with.
- **NFR-11:** keep actual values visually separate from forecast estimates. This page shows no forecasts.

## What's on it

| Panel | Shows |
|---|---|
| Weekly sales | Revenue per week (Monday to Sunday) as columns, with the average of the last 4 weeks as a line. Point at or tab to a week for its numbers; "Show as a table" lists every week. |
| Monthly totals | Sales, units and revenue for the last 6 calendar months |
| Product trend | Units sold per week for one product, chosen from the products that sold in the period |

The period picker sets 12, 26 or 52 weeks. Voided sales never count toward totals. The moving average is the average of past weeks that happened, so it is labelled as an average of actual sales, not an estimate.

## Data

`trendsUtils.js` does all the calculations and works on the sale objects returned by `salesApi.listSales()`, so the same code serves sample data now and the database later.

- **Sample mode** (default): sample sales from the Sales module. The period opens on 52 weeks, because the sample dates are fixed in October 2026.
- **Database mode** (`VITE_USE_SAMPLE_DATA=false`): reads the same sales list, which returns the 200 most recent sales. The page warns when that limit is reached, because older weeks can then be short.

## Still to do

- A database view or function for weekly and monthly totals (`trend_series`, see `docs/api-contracts.md`), so that totals cover all sales and can be checked in SQL. Until then the page calculates them from the sales list.
- The forecast itself (FR-14) and reorder suggestions (FR-15). The model is chosen after reviewing the client's historical data, so no forecast appears here yet.

## Notes

- Charts are drawn by hand, like the dashboard charts. Recharts is not used, so the app adds no chart dependency.

## Files

| File | What it does |
|---|---|
| `TrendsPage.jsx` | Page layout, period and product pickers, tables |
| `ColumnChart.jsx` | Columns with an optional average line and hover readout |
| `trendsUtils.js` | Weekly, monthly and product totals, in centavos so sums stay exact |
| `trends.module.css` | Trends styles |
