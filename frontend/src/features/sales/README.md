# Sales

**Owner:** Member 2 — Sales & Operations (James Earl Cugal)

## Requirements

- **FR-11 Record a sale with automatic stock deduction.** *(Requirement text is missing from SRS v1.0 and will be restored.)* Implement it as one Postgres function, `record_sale`:
  1. Lock the stock rows in product-id order.
  2. Check availability.
  3. Insert the sale, its items and the stock movements.
  4. Update the balances.

  If anything fails, nothing is saved.
- **Void (Owner only).** Write compensating stock movements; never delete a sale.
- **FR-12 58 mm acknowledgment receipt.** Print from the browser with `@page { size: 58mm auto }` through the printer's OS driver. It is not a BIR official receipt.
- **NFR-5:** when two users sell the last unit at the same time, exactly one succeeds (0 negative balances in 50 concurrent trials).
- **NFR-11:** a trained user records a 3-item scanned sale in ≤ 60 s.

## Scope notes

- Payments are recorded as method plus reference number only. There is no payment gateway.
- This module depends on Member 1's stock functions; see `docs/api-contracts.md`.
