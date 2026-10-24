# API contracts

The "API" is Supabase:

- **Reads** go through tables and views behind row-level security, using supabase-js.
- **Writes that touch more than one row** go through Postgres functions, called as RPCs. The browser never writes to stock or sales tables directly.

> **Status: proposed.** Signatures are agreed here *before* either side implements them, so modules can work in parallel against stubs. Change them only through a pull request that every affected owner reviews.

## Conventions

- Function names are `verb_noun` in `public`, `security definer`, with `set search_path = ''`.
- Arguments come in a single `jsonb` payload when there are more than three. The function returns the created row's id, or a `jsonb` result.
- Errors use `raise exception ... using errcode = '<code>'`, which PostgREST turns into these HTTP statuses:

  | Situation | errcode | HTTP |
  |---|---|---|
  | Not allowed for this role | `42501` | 403 |
  | Validation failed (e.g. insufficient stock, duplicate) | `P0001` with a `hint` the UI can show | 400 |
  | Not found | `P0002` | 404 |

## Planned functions

| Function | Owner | Used by | Purpose |
|---|---|---|---|
| `record_stock_movement(payload)` | Member 1 | Member 1 UI, imports | `payload = { product_id, kind: stock_in \| return \| adjustment, quantity, reason, reference }`; an adjustment may be negative and needs a reason; refuses to go below zero. Returns `{ movement_id, on_hand }`. A minimal version is in the base migration; Member 1 extends it |
| `record_sale(payload)` | Member 2 | Sales UI | One atomic sale. `payload = { channel, customer_id, reseller_id, lines: [{ product_id, quantity }] }`; prices are looked up in the function (retail, or reseller price for channel `reseller`). Returns `{ sale_id, sale_no, total }`; refuses with `P0001` if stock is short. Full contract: `frontend/src/features/sales/README.md` |
| `void_sale(p_sale_id, p_reason)` | Member 2 | Sales UI (Owner) | Owner only (`42501` otherwise); compensating movements; never deletes |
| `export_data_subject(kind, id)` / `anonymize_customer(id)` | Member 2 | Customers UI (Owner) | NFR-14 |
| `import_batch(kind, rows)` | Member 3 | Imports UI | Validates every row, then commits the valid rows in one transaction |
| `public_catalog` view (`GET /rest/v1/public_catalog`) | Member 1 | Public catalog page (no login) | Approved product fields + availability label; readable by `anon` with the publishable key only |
| report RPCs (`sales_summary`, `trend_series`, ...) | Member 3 | Reports, trends, dashboard | Owner-only aggregates |

### Dashboard (FR-11, Member 3)

The dashboard calls these once the sample-data switch is off (`frontend/src/features/dashboard/dashboardApi.js`). They depend on the products, stock and sales tables from #1–#3.

- `dashboard_summary(p_days int, p_chart_days int) returns jsonb` (Owner; a reduced version for Staff once roles exist). `p_days = 0` means all time. Voided sales never count. Returns:

  ```json
  {
    "summary":      { "revenue": "9150.00", "sales_count": 3, "units": 18, "average_sale": "3050.00" },
    "by_channel":   [{ "channel": "walk_in", "revenue": "850.00", "sales_count": 1 }],
    "daily":        [{ "day": "2026-10-14", "revenue": "850.00", "sales_count": 1 }],
    "top_products": [{ "product_id": 4, "sku": "SJ-000104", "name": "Citrus Bloom Body Mist", "units": 12, "revenue": "3500.00" }],
    "top_buyers":   [{ "kind": "reseller", "id": 1, "name": "Scents by Mia", "sales_count": 1, "revenue": "7600.00" }]
  }
  ```

  `daily` lists only days with sales, in PHT, for the last `p_chart_days` days; the app fills the empty days. Money is `numeric(12,2)` returned as strings.
- `low_stock` view: `id, sku, name, on_hand, reorder_level` for active products with `on_hand <= reorder_level` (FR-6). Readable by Owner and Staff.

Detailed payload schemas are added here in the pull request that implements each function. The OpenAPI 3 document required by NFR-12 is generated from this file at the end of the project.
