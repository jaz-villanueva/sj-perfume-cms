# Customers

**Owner:** Member 2 — Sales & Operations (James Earl Cugal)

## Requirements (SRS v1.1)

- **FR-9 Customer records:** name, mobile number, e-mail, address, preferred channel, data-privacy consent and consent date. A save without consent is blocked. Searching by name or mobile returns in 3 seconds or less with 10,000 records.
- **NFR-6:** duplicate mobile numbers are rejected. Numbers are stored in one format, `09XXXXXXXXX`, so `0917 123 4567`, `+63 917 123 4567` and `639171234567` count as the same number.
- **NFR-14 (RA 10173):** a privacy notice is shown wherever data is collected. The Owner can export or remove one person's data in 5 minutes or less. "Remove" means anonymise, so past sales totals stay correct.

## Scope notes

- Customers never log in. These are internal records only.

## Files

| File | What it does |
|---|---|
| `CustomersPage.jsx` | Search, customer list, add/edit form with the privacy notice and consent checkbox |
| `customerUtils.js` | Mobile number normalisation, validation, search matching |
| `customersApi.js` | Data access. Uses Supabase when `frontend/.env.local` is filled in, otherwise sample data in memory |

## Database

The `customers` table is created by `supabase/migrations/20261024130000_base_tables_and_sales.sql`: unique mobile stored as `09XXXXXXXXX`, `consent_at not null`, readable and editable by Owner and Staff, never deleted.

## Still to do

- Owner-only export and anonymise (`export_data_subject`, `anonymize_customer`) for NFR-14.
- Server-side search once there are more than 1,000 customers.
