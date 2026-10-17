# Reports

**Owner:** Member 3 — Analytics, Forecasting & Infrastructure (Jaz Villanueva)

## Requirements (SRS v1.2)

- **FR-11 Dashboard and reports:** reports for sales, inventory, product performance and customer/reseller activity.
  - The Owner sees all reports; Staff see only the reports their role allows.
  - Report totals must match the underlying records.
  - CSV/XLSX export may be included. Whether it's in the final delivery is still open (SRS §11).

## Notes

- Use `exceljs` for XLSX export. The `xlsx` package on npm is outdated.
- Reports that show revenue or cost are Owner-only.
