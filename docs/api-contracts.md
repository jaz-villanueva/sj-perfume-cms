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
| `record_stock_movement(payload)` | Member 1 | Member 1 UI, imports | Stock-in, return or adjustment with a reason; updates `product_stock` under a row lock |
| `record_sale(payload)` | Member 2 | Sales UI | One atomic sale: lines, stock deduction, movements |
| `void_sale(sale_id, reason)` | Member 2 | Sales UI (Owner) | Compensating movements; never deletes |
| `export_data_subject(kind, id)` / `anonymize_customer(id)` | Member 2 | Customers UI (Owner) | NFR-14 |
| `import_batch(kind, rows)` | Member 3 | Imports UI | Validates every row, then commits the valid rows in one transaction |
| report RPCs (`sales_summary`, `trend_series`, ...) | Member 3 | Reports, trends, dashboard | Owner-only aggregates |

Detailed payload schemas are added here in the pull request that implements each function. The OpenAPI 3 document required by NFR-12 is generated from this file at the end of the project.
