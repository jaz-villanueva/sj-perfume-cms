# Inventory

**Owner:** Member 1 — Products & Inventory (Robin Louis Putong)

## Requirements (SRS v1.2)

- **FR-5 Inventory management.** Record stock-in, sale-related deductions, returns and stock adjustments, each with quantity, reason or reference, actor and timestamp. Show the current on-hand quantity and the movement history. Balances always match the recorded movements; invalid movements and negative stock are blocked.
- **FR-6 Low-stock monitoring (Should).** Products at or below their reorder level appear in a low-stock view and on the dashboard; products above it don't.
- **NFR-2:** stock balances stay consistent with recorded transactions, even when two users take the last unit at the same time.

## Rules

- The browser never updates stock tables directly. All stock writes go through Postgres functions, which run as one transaction.
- This module provides `record_stock_movement` and the `product_stock` balance that Member 2's `record_sale` relies on. Agree the signatures in `docs/api-contracts.md` before implementing either side.
- Corrections are new movements; quantities are never silently overwritten (SRS §8).
