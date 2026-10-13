# Inventory

**Owner:** Member 1 — Products & Inventory (Robin Louis Putong)

## Requirements

- **FR-5 Stock ledger.** Record every stock movement (stock-in from supplier, sale, return, adjustment with a reason) and compute on-hand from the ledger. *Acceptance:* on-hand 10, stock-in 5, adjustment −2 "damaged" → on-hand 13, and both movements appear in the product history with user, timestamp and reason.
- **FR-7 Low-stock flag.** Products at or below their reorder level are flagged on the dashboard. In-app only: the e-mail digest from SRS v1.0 is removed.
- **NFR-5** (shared with Member 2): stock never goes negative, even when two users take the last unit at the same time.

## Rules

- The browser never updates stock tables directly. All stock writes go through Postgres functions, which run as one transaction.
- This module provides `record_stock_movement` and the `product_stock` balance that Member 2's `record_sale` relies on. Agree the signatures in `docs/api-contracts.md` before implementing either side.
