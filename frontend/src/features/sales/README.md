# Sales

**Owner:** Member 2 — Sales & Operations (James Earl Cugal)

## Requirements (SRS v1.2)

- **FR-9 Sales recording.** Staff record each order with its channel (walk-in, online/Messenger or reseller), the customer (optional) or the reseller (required for reseller sales), and the items. Stock is deducted in the same transaction, exactly once, and a sale beyond the stock on hand is refused. The Owner can void a sale: compensating stock movements are written and the sale is kept, never deleted.
- **Reseller orders** are recorded as sales with channel `reseller` and use the reseller price (decision D3).
- **FR-5, NFR-2 (stock integrity):** when two users sell the last unit at the same time, exactly one succeeds and stock never goes below zero.
- **NFR-6 (usability):** a trained user records a 3-item sale in 60 seconds or less.
- **FR-17 (audit trail):** each sale is logged once, with its final total and items, and each void with its reason.

Requirement IDs before SRS v1.2: FR-11 (sales), NFR-5 (concurrency), NFR-11 (speed). See the mapping in `docs/requirements-baseline.md`.

## Out of scope

- Payments: no payment method, reference number or gateway. The system records what was sold, not how it was paid.
- Receipts and any other printed output.

## Files

| File | What it does |
|---|---|
| `SalesPage.jsx` | Sales list with channel filter, new-sale form, void with reason |
| `saleUtils.js` | Prices by channel, totals in centavos, sale validation, the `record_sale` payload |
| `salesApi.js` | Data access, including one customer's sales for the Customers screen. Uses Supabase when `frontend/.env.local` is filled in, otherwise sample data in memory |
| `module2.module.css` | Styles shared by the Sales and Customers screens |

## Database

Created by `supabase/migrations/20261024130000_base_tables_and_sales.sql`, tested by `supabase/tests/database/01_sales.test.sql`. Audit entries come from `20261110120100_audit_trail.sql` (tested by `03_audit_trail.test.sql`).

- `record_sale(payload jsonb)` with `payload = { channel, customer_id, reseller_id, lines: [{ product_id, quantity }] }`. Prices are looked up in the function (retail price, or reseller price for channel `reseller`), never sent from the browser. Locks the `product_stock` rows in product-id order, refuses with `P0001` and a hint such as `Only 3 Vanilla Musk Eau de Parfum available.` if any line is short, and saves nothing in that case. Returns `{ sale_id, sale_no, total }`. Owner or Staff.
- `void_sale(p_sale_id bigint, p_reason text)`: Owner only (`42501` otherwise). Refuses an already voided sale. Writes compensating `void` movements, returns the stock and sets `status = 'voided'`, `voided_at`, `voided_by`, `void_reason`.
- Tables `sales` and `sale_items` are read-only for the app; only these functions write them.
- The last-unit race was checked by racing two sessions for the last unit 20 times: exactly one sale each time, stock never below 0.

## Still to do

- The last-unit race as an automated test (pgTAP runs in one session, so it can't race two).
