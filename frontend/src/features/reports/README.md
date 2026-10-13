# Reports

**Owner:** Member 3 — Analytics, Forecasting & Infrastructure (Jaz Villanueva)

## Requirements

- **FR-16 Reports:**
  - sales by day, week and month, by product and by reseller
  - top sellers
  - inventory valuation at cost
  - export of any report to CSV or XLSX

  *Acceptance:* on a seeded dataset of 200 sales, every total matches an independently computed reference spreadsheet to the centavo.

## Notes

- Use `exceljs` for XLSX export. The `xlsx` package on npm is outdated.
- Reports that show revenue or cost are Owner-only.
