# Data import

**Owner:** Member 3 — Analytics, Forecasting & Infrastructure (Jaz Villanueva)

## Requirements (SRS v1.2)

- **FR-13 Data import / migration (Should):** import products, customers, resellers, inventory and historical sales from agreed templates.
  - Missing, duplicate and invalid values are identified before anything is committed.
  - Imported records can be reconciled against the source data.
  - Whether import is in the final delivery is still open (SRS §11).

## Notes

- Use `papaparse` for CSV parsing.
- The client's real data stays out of this repository; tests use synthetic fixtures only.
