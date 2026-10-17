# Sales trends

**Owner:** Member 3 — Analytics, Forecasting & Infrastructure (Jaz Villanueva)

## Requirements (SRS v1.2)

- **FR-14 Forecasting and trends (trends part):** historical sales and product-usage trends by product and time period. These views are the "actual" side that forecasts are compared with.
- **NFR-11:** keep actual values visually separate from forecast estimates.

## Notes

- Charts use Recharts.
- Weekly and monthly totals and moving averages are computed in SQL views, so every number can be checked against the records.
