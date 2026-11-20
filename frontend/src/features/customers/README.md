# Customers

**Owner:** Member 2 — Sales & Operations (James Earl Cugal)

## Requirements (SRS v1.2)

- **FR-7 Customer records:** create, search, view and update customers, and see each customer's sales. Fields: name, mobile number, e-mail, address, preferred channel, data-privacy consent and consent date. A save without consent is blocked.
- Duplicate mobile numbers are rejected. Numbers are stored in one format, `09XXXXXXXXX`, so `0917 123 4567`, `+63 917 123 4567` and `639171234567` count as the same number.
- **NFR-5 Privacy (RA 10173):** a privacy notice is shown wherever data is collected; only signed-in Owner and Staff see customer data. The Owner can export or remove one person's data. "Remove" means anonymise, so past sales totals stay correct.
- **NFR-1:** searching by name or mobile returns within 3 seconds on the pilot data.

Requirement IDs before SRS v1.2: FR-9 (customers), NFR-6 (duplicates), NFR-14 (privacy).

## Scope notes

- Customers never log in. These are internal records only.
- Anonymised customers drop out of the list and can't be picked for new sales, but their past sales stay, under "Anonymised customer #N".

## Files

| File | What it does |
|---|---|
| `CustomersPage.jsx` | Search, customer list, add/edit form with the privacy notice and consent checkbox |
| `CustomerDetails.jsx` | One customer: their sales and total spent (FR-7); for the Owner, **Export data** and **Anonymise** with confirmation (NFR-5) |
| `customerUtils.js` | Mobile number normalisation, validation, search matching, sales summary |
| `customersApi.js` | Data access. Uses Supabase when `frontend/.env.local` is filled in, otherwise sample data in memory |
| `download.js` | Saves the export as a JSON file |

## Database

The `customers` table is created by `supabase/migrations/20261024130000_base_tables_and_sales.sql`: unique mobile stored as `09XXXXXXXXX`, `consent_at not null`, readable and editable by Owner and Staff, never deleted.

`supabase/migrations/20261110120200_customer_privacy.sql` (tested by `04_customer_privacy.test.sql`) adds:

- `export_data_subject(p_kind text, p_id bigint) returns jsonb`: Owner only. `p_kind` is `customer` or `reseller`. Returns `{ exported_at, kind, record, sales: [{ sale_no, sold_at, channel, status, total, items }], note }` and logs the export in the audit trail.
- `anonymize_customer(p_id bigint) returns jsonb`: Owner only. Erases name, mobile, e-mail and address, sets `anonymized_at`, keeps the sales. Returns `{ customer_id, anonymized_at, sales_kept }`. Refuses a customer already anonymised (`P0001`).
- Owner and Staff can edit only the business fields (name, mobile, e-mail, address, preferred channel), never an anonymised record, and can't set `anonymized_at` themselves.
- Audit entries for customers never store personal details, only that a field changed, so nothing is left behind after anonymising.

## Still to do

- Server-side search once there are more than 1,000 customers.
