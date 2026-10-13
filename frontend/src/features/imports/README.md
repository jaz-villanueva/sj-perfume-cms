# Data import

**Owner:** Member 3 — Analytics, Forecasting & Infrastructure (Jaz Villanueva)

## Requirements

- **FR-17:** import products, customers, resellers and historical sales (date, SKU, quantity, unit price, channel) from CSV templates.
  - Show a row-level validation report (duplicates, missing fields, invalid formats) before anything is saved.
  - Save the valid rows in one transaction, and never save part of a row.

  *Acceptance:* a 300-row file with 6 invalid rows saves 294 rows and lists the 6 rows with their row numbers and reasons.

## Notes

- Use `papaparse` for CSV parsing.
- The client's real data stays out of this repository; tests use synthetic fixtures only.
