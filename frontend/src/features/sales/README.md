# Sales

**Owner:** Member 2 — Sales & Operations (James Earl Cugal)

## Requirements (SRS v1.1)

- **FR-11 Record a sale with automatic stock deduction.** Staff record each order with its channel (walk-in, online/Messenger or reseller), the customer (optional) or the reseller (required for reseller sales), and the items. Stock is deducted in the same transaction. The Owner can void a sale: compensating stock movements are written and the sale is kept, never deleted.
- **Reseller orders** are recorded as sales with channel `reseller` and use the reseller price (decision D3).
- **NFR-5:** when two users sell the last unit at the same time, exactly one succeeds (0 negative balances in 50 concurrent trials).
- **NFR-11:** a trained user records a 3-item sale in 60 seconds or less.

## Out of scope

- Payments: no payment method, reference number or gateway. The system records what was sold, not how it was paid.
- Receipts and any other printed output (FR-12 was removed in SRS v1.1).

## Files

| File | What it does |
|---|---|
| `SalesPage.jsx` | Sales list with channel filter, new-sale form, void with reason |
| `saleUtils.js` | Prices by channel, totals in centavos, sale validation, the `record_sale` payload |
| `salesApi.js` | Data access. Uses Supabase when `frontend/.env.local` is filled in, otherwise sample data in memory |
| `module2.module.css` | Styles shared by the Sales and Customers screens |

## Database functions this screen expects

Still to be written in a migration once the foundation tables (`products`, `product_stock`, `stock_movements`, `profiles`) are merged. The sample backend in `salesApi.js` follows the same rules.

- `record_sale(payload jsonb)` with `payload = { channel, customer_id, reseller_id, lines: [{ product_id, quantity }] }`. Prices are looked up in the function (retail price, or reseller price for channel `reseller`), never sent from the browser. Locks the `product_stock` rows in product-id order, refuses with `P0001` and hint `only N available` if any line is short, and saves nothing in that case. Returns `{ sale_id, sale_no, total }`.
- `void_sale(sale_id bigint, reason text)`: Owner only (`42501` otherwise). Refuses an already voided sale. Writes compensating movements and sets `status = 'voided'`, `voided_at`, `voided_by`, `void_reason`.

## Still to do

- Hide the Void button from Staff once logins and roles exist.
- Migration with the `sales` and `sale_items` tables, both functions, RLS and pgTAP tests (including the NFR-5 concurrency test).
