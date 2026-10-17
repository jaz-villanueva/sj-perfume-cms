# Database schema (draft)

> **Draft.** This is finalised in the foundation migration pull request, after decision D2 (roles). Change it through pull requests only.

| Area | Owner | Tables / objects |
|---|---|---|
| Identity | Shared | `profiles(id → auth.users, full_name, role, is_active)`, `login_failures` |
| Catalog | Member 1 | `products(sku 'SJ-NNNNNN' unique, name, brand, scent_family, size_ml, description, retail_price, reseller_price, reorder_level, lead_time_days default 7, photo_path, is_active, show_in_catalog)`, `product_costs(product_id, cost_price)`, Owner-only. `public_catalog` view: approved fields + availability label (In stock / Low / Out of stock), the only object `anon` can read (FR-12) |
| Stock | Member 1 | `product_stock(product_id, on_hand ≥ 0)`, `stock_movements(type, quantity ±, reason, reference, created_by, created_at)`, append-only |
| Resellers | Member 1 | `resellers(business_name, contact_person, mobile, email, address, price_tier, status, consent_at)` |
| Customers | Member 2 | `customers(name, mobile unique normalised, email, address, preferred_channel, consent_at not null, anonymized_at)` |
| Sales | Member 2 | `sales(sale_no, sold_at, channel walk_in\|online\|reseller, customer_id, reseller_id, total, status, void_reason, voided_at, voided_by)`, `sale_items(quantity > 0, unit_price, line_total)`. Reseller transactions are sales with channel `reseller`. SRS v1.2 allows an optional payment method / reference "only if needed"; none is stored for now |
| Audit | Shared | `audit_log(actor_id, actor_role, action, table_name, record_id, old_data, new_data, created_at)`, trigger-written, Owner read-only |
| Analytics | Member 3 | report views/RPCs, `forecast_runs`, `forecasts(product_id, week_start, forecast, lower80, upper80, model, mae, rmse, low_confidence)`, `reorder_suggestions` view |
| Operations | Member 3 | `import_batches`, `import_row_errors`, `backup_runs` |

## Conventions

- Money: `numeric(12,2)` in pesos. Never floating-point.
- Time: `timestamptz`, stored in UTC and displayed in PHT (`Asia/Manila`).
- Primary keys: `bigint generated always as identity`, unless there's a reason otherwise.
- Every table has `created_at`; mutable tables also have `updated_at`.
- Soft states (`is_active`, `status`, `deleted_at`) instead of deleting business records; Owner-only hard deletion only where history is not affected (FR-16).
