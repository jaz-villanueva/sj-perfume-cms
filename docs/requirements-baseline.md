# Requirements baseline

**Source of truth:** SRS Revised Version 1.2 (14 October 2026). This page lists every SRS requirement with the module that owns it and how we plan to build it, plus the team's technical decisions that sit on top of the SRS.

Feature READMEs written before v1.2 may still use the older v1.0 / v1.1 numbers; see [the ID mapping](#requirement-id-mapping) at the end.

## Scope (SRS v1.2)

- **Internal system for Owner/Admin and Staff.** Both roles exist (decision D2, settled by §1.4). Every internal screen requires sign-in.
- **Public product catalog.** Customers can view approved product fields online without logging in (FR-12, confirmed in v1.2).
- **Customers and resellers are business records only.** They have no logins, no reseller portal, no cart, no checkout and no online payment processing.
- **Sales are entered by Owner/Admin or Staff**, including reseller transactions, which are sales linked to a reseller (decision D3).
- **Payments are not processed.** A payment method or reference is recorded only if needed for sales records. There is no receipt requirement.
- **Forecasting is required, but the model isn't chosen yet** (§5). The model is selected after reviewing the client's historical data.
- **Out of scope (§7.2):**
  - reseller or customer accounts, cart or checkout
  - automatic supplier ordering
  - marketplace or social-media integrations
  - accounting, payroll, tax and BIR invoicing
  - courier booking (tracking numbers may be typed in manually)
  - native mobile apps
  - guaranteed forecast accuracy

## Team technical decisions

These sit on top of the SRS; the SRS leaves stack and hosting open (§11).

1. **Free tiers only (₱0 recurring, NFR-13).** The stack is React + Vite, Supabase Free, Cloudflare Workers (static assets), GitHub and GitHub Actions.
2. **No e-mail features.** The Owner creates Staff accounts and resets passwords inside the app. No invite or reset e-mails are sent.
3. **Three developers**, each owning a module. See the module table in the README.

## Functional requirements

| ID | Requirement | Pri | Module | Implementation notes |
|---|---|---|---|---|
| FR-1 | Authentication | Must | Shared | Supabase Auth with e-mail and password; public sign-ups off. |
| FR-2 | Role-based access control | Must | Shared | Deny by default with row-level security. Owner-only operations are checked in Postgres functions, never only hidden in the UI. |
| FR-3 | User account management | Must | Shared | The Owner creates, edits, deactivates, reactivates and deletes Staff accounts through the `admin-users` Edge Function. Staff can change only their own profile and password. |
| FR-4 | Product management | Must | M1 | Unique SKU; image in Storage. If the cost price is kept, it sits in an Owner-only table. |
| FR-5 | Inventory management | Must | M1 | Append-only `stock_movements` (stock-in, sale, return, adjustment, with reason, actor and time). The database blocks negative stock. |
| FR-6 | Low-stock monitoring | Should | M1 | Products at or below their reorder level appear in a low-stock view and on the dashboard. |
| FR-7 | Customer records | Must | M2 | Search and update, with related sales. Personal data handled per NFR-5. |
| FR-8 | Reseller records | Must | M1 | Internal records with linked sales; no reseller logins. |
| FR-9 | Sales recording | Must | M2 | One atomic `record_sale`. Records channel, products, quantities, prices, total and customer or reseller when known. Stock is deducted exactly once, and a sale beyond available stock is rejected. |
| FR-10 | Centralized search and records | Must | Shared | Products, inventory, sales, customers and resellers are all searchable from the one app. |
| FR-11 | Dashboard and reports | Must | M3 | The Owner sees all reports; Staff see the reports their role allows. CSV/XLSX export may be included (see open items). |
| FR-12 | Product catalog display | Must | M1 | Public page, no login. Served from a read-only view of approved fields only (image, name, size, retail price, description, availability). Never exposes cost price, records or exact stock. |
| FR-13 | Data import / migration | Should | M3 | CSV templates. Every row is validated before anything is committed, and imports can be reconciled with the source. |
| FR-14 | Forecasting and trends | Must | M3 | Model chosen after the data review. Candidates: naive, moving average, SES, Holt, or ML if justified. Weekly forecast for 8 weeks preferred. Estimates are labelled as estimates. |
| FR-15 | Stock-demand planning | Must | M3 | Advisory reorder suggestions, traceable to the forecast and current stock. Never places orders automatically. |
| FR-16 | Administrative data management | Must | Shared | Only the Owner can make privileged deletions, and they need confirmation. Records stay soft-deleted or deactivated when hard deletion would break history. |
| FR-17 | Audit trail | Must | Shared | `audit_log` written by triggers; no one can edit or delete entries. |
| FR-18 | Standard operating procedures | Must | Shared | The §9 procedures are documented for Owner and Staff in `docs/`. |

## Non-functional requirements

| ID | Category | How we meet it |
|---|---|---|
| NFR-1 | Performance | Common searches return in ≤ 3 s on the pilot data; slow operations show progress. |
| NFR-2 | Data integrity | Database constraints and unique identifiers; stock balances follow the movement ledger. |
| NFR-3 | Security | Supabase Auth stores salted bcrypt hashes; HTTPS through Cloudflare and Supabase; access control enforced in Postgres. |
| NFR-4 | Session management | Client-side idle logout; failed sign-ins limited by the `login` Edge Function. |
| NFR-5 | Privacy (RA 10173) | Personal data visible to authorized users only; consent recorded; anonymised where history must be kept. |
| NFR-6 | Usability | Clear labels and consistent workflows; minimal duplicate entry. |
| NFR-7 | Auditability | Audit trail (FR-17); destructive actions need confirmation and the right role. |
| NFR-8 | Reliability and recovery | Planned: nightly encrypted backup on GitHub Actions plus a restore drill. Frequency and targets to be confirmed before deployment. |
| NFR-9 | Portability | Current mainstream browsers; responsive from phone to desktop. |
| NFR-10 | Maintainability | READMEs, setup docs, and automated tests in CI (Vitest, pgTAP, pytest). |
| NFR-11 | Forecast transparency | Forecast views show the period, the generated date and data limitations, and keep estimates apart from actual values. |
| NFR-12 | Forecast evaluation | Forecasts are evaluated on held-out history against a baseline, and the method and results are reported. |
| NFR-13 | Cost | Free tiers, ₱0 recurring; any cost-affecting dependency is documented. |
| NFR-14 | Operational effectiveness | All record categories in one place; system entry becomes the standard procedure after deployment. |

## Decisions

- **Decided:**
  - **D2:** roles are Owner/Admin and Staff (§1.4).
  - **D3:** reseller transactions are recorded as sales (§1.2).
  - **Public catalog** in scope (v1.2).
- **Open (SRS §11):**
  - which product fields the public catalog shows, and how availability is shown
  - the forecasting model and horizon, chosen after reviewing the client's data
  - whether CSV/XLSX export and import are in the final delivery
  - which record types may be hard-deleted and which must be soft-deleted
  - measurable performance and forecast thresholds
- **Open (team):**
  - **D6:** off-site backup target
  - **D7:** license
  - **D8:** UI component library

## Requirement ID mapping

| v1.0 / v1.1 | Now (v1.2) |
|---|---|
| FR-1 Login · FR-2 Access control · FR-3 User management | FR-1 · FR-2 · FR-3 |
| FR-4 Products & pricing | FR-4 |
| FR-5 Stock ledger | FR-5 |
| FR-6 Barcode scan lookup | Not in v1.2 |
| FR-7 Low-stock flag | FR-6 |
| FR-8 Code 128 SKU labels | Not in v1.2 |
| FR-9 Customer records | FR-7 |
| FR-10 Reseller records | FR-8 |
| FR-11 Record sale | FR-9 |
| FR-12 Receipt | Removed |
| FR-13, FR-14 Reseller purchase orders | Removed (reseller transactions are sales, FR-9) |
| FR-16 Dashboard & reports | FR-11 |
| FR-17 CSV import | FR-13 |
| FR-18 Audit log | FR-17 |
| FR-19 Public catalog | FR-12 (now Must) |
| FR-20 Backups | NFR-8 |
| FR-21 Trends · FR-22 Forecast | FR-14 |
| FR-23 Reorder suggestions | FR-15 |
| NFR-5 Stock never negative | FR-5, NFR-2 |
| NFR-9 Sessions and lockout | NFR-4 |
| NFR-14 Data Privacy Act | NFR-5 |
