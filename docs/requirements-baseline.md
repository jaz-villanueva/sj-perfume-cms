# Requirements baseline

**Source of truth:** SRS v1.0 (13 Oct 2026) **as modified by the team's owner-only scope decisions** below, plus the **SRS v1.1 decisions** recorded by Member 2 in `frontend/src/features/sales/README.md` and `frontend/src/features/customers/README.md`. Where they differ, SRS v1.1 wins.

## Scope modifications to SRS v1.0

1. **Owner-side internal system only.** The following are removed: the Reseller Portal, the public product catalog, customer accounts, shopping cart and checkout. Customers and resellers remain as **internal records** that Owner/Staff encode; they never log in.
2. **No e-mail of any kind.** The following are removed: password-reset e-mails, reseller invites, purchase-order notifications, new-PO alerts and the 08:00 low-stock digest. Notifications appear inside the app.
3. **Free tiers only (₱0 recurring).** The stack is React + Vite, Supabase Free, Cloudflare Workers (static assets), GitHub and GitHub Actions. This replaces the Node.js/Nginx/Docker VPS in CON-4, NFR-13 and NFR-19.
4. **Three developers**, not the four stated in CON-3.
5. **SRS v1.1:** reseller orders are recorded as sales with channel `reseller` at the reseller price (decision D3); receipts (FR-12) are removed; payments are out of scope — no payment method, reference number or gateway is recorded.

## Functional requirements

Status values: **Keep**, **Modify** (intent kept, criterion changes), **Remove**, **Restore** (ID listed in the traceability matrix but the requirement text is missing from SRS v1.0), **Open** (waiting on a team decision).

| ID | Pri | Requirement | Status | Notes |
|---|---|---|---|---|
| FR-1 | Must | Login, role routing, lockout 5 fails / 15 min | Modify | Supabase Auth. Lockout goes through a `login` Edge Function, because the free plan has no password-verification hook (see architecture risk R-3). |
| FR-2 | Must | Deny-by-default access control | Modify | Drop the Reseller and Public roles. A read blocked by RLS returns an empty result rather than HTTP 403, so the criterion becomes "403 or an empty result with no record data". |
| FR-3 | Must | User management | Modify | The Owner creates, deactivates and reactivates accounts and sets temporary passwords in the app. No reset e-mail and no self-service reset link. |
| FR-4 | Must | Products & pricing; cost price Owner-only | Keep | The cost price sits in an Owner-only table. |
| FR-5 | Must | Stock-movement ledger; on-hand derived from it | Keep | |
| FR-6 | — | USB barcode scan lookup | Restore | |
| FR-7 | Should | Low-stock flag | Modify | Dashboard panel only; the e-mail digest is removed. |
| FR-8 | — | Printable Code 128 SKU labels | Restore | |
| FR-9 | Must | Customer records with consent | Keep | Internal records only. |
| FR-10 | Must | Reseller records | Modify | Records only; the portal invite is removed. |
| FR-11 | Must | Record sale with automatic stock deduction | Keep (v1.1) | Channel walk-in, online (Messenger) or reseller; customer optional, reseller required for reseller sales; stock deducted in the same transaction; the Owner can void a sale (compensating movements, never deleted). |
| FR-12 | — | 58 mm acknowledgment receipt | Remove (v1.1) | No receipts or other printed sales output. |
| FR-13 | Must | Reseller submits PO through the portal | Remove | The portal is removed. Reseller orders are recorded as sales with channel `reseller` (D3, v1.1). |
| FR-14 | Must | PO workflow with stock reservation | Remove (v1.1) | No separate order workflow, reservation or courier tracking; reseller orders go through FR-11. |
| FR-15 | — | Reseller data isolation | Remove | No reseller logins. |
| FR-16 | Must | Dashboard, reports, CSV/XLSX export | Keep | "By reseller" reports use sales with channel `reseller`; the PO-status summary is dropped. |
| FR-17 | Must | CSV import with row-level validation | Keep | |
| FR-18 | Must | Read-only audit log | Keep | |
| FR-19 | Should | Public product catalog | Remove | Customer-facing. |
| FR-20 | — | Nightly encrypted off-site backup and restore | Restore | Runs on GitHub Actions. |
| FR-21 | Must | Sales trends | Keep | |
| FR-22 | Should | Nightly 8-week forecast with 80 % range | Keep | The selection metric and the interval method still need defining. |
| FR-23 | Should | Reorder suggestion and stock-out date | Modify | Shown in the app only, no e-mail. Uses RMSE, so the forecast must store RMSE alongside MAE. |

## Non-functional requirements

| ID | Status | Notes |
|---|---|---|
| NFR-1, 2, 5, 6, 11, 15, 16, 18 | Keep | NFR-11 (v1.1): a trained user records a 3-item sale in ≤ 60 s. NFR-15's reseller orders are sales with channel `reseller`. |
| NFR-3 Availability | Modify | Monitor a `health` Edge Function and the site with a free uptime monitor. Free tiers carry no SLA. |
| NFR-4 RPO/RTO | Keep | Supabase Free has no automatic backups, so we run our own. |
| NFR-7 Security | Modify | Supabase Auth's bcrypt cost can't be configured (to be verified; believed to be 10). TLS comes from Cloudflare and Supabase. |
| NFR-8 Security testing | Keep | Re-count the RBAC test cases once roles are final. |
| NFR-9 Sessions | Modify | 30-minute idle logout is a client-side timer; server-side timeouts are a paid feature. |
| NFR-10 Usability | Modify | Test participants are internal users instead of resellers. |
| NFR-12 Maintainability | Modify | Requirements: ≥ 70 % coverage of the JS domain/service code; pgTAP tests for every RPC and RLS policy; OpenAPI 3 for the RPCs and Edge Functions (PostgREST only generates 2.0). |
| NFR-13 Portability | Modify | "Fresh Supabase project + Cloudflare Workers deploy from the README in ≤ 30 min" replaces Docker Compose on Ubuntu. |
| NFR-14 RA 10173 | Keep | "Delete" means anonymise, so sales history stays consistent. |
| NFR-17 Cost | Modify | ₱0 recurring. The one-time cost is the barcode scanner; no receipt printer is needed (FR-12 removed). |
| NFR-19 Forecast performance | Modify | Measured on a GitHub-hosted runner with peak memory ≤ 512 MB. |

## Open decisions

| # | Decision | Needed before |
|---|---|---|
| D2 | Roles: Owner + Staff, or Owner only | Foundation schema and the RBAC test count |
| D6 | Off-site backup target: Backblaze B2, a private GitHub repo, or Cloudflare R2 (R2 needs a card on file) | Backup workflow |
| D7 | License | Before the final hand-over |
| D8 | UI component library (e.g. Mantine) or plain CSS | First feature screens |

Decided: **D3** — reseller orders are recorded as sales with channel `reseller` (SRS v1.1).

## SRS document fixes for v1.1

- Restore the text and acceptance criteria for FR-6, FR-8 and FR-20; remove FR-12, FR-14 and FR-15 (FR-11 is restored in v1.1).
- Fix the AS-5/AS-6 numbering gap and change CON-3 to three developers.
- Remove the SMTP actor, the Reseller Portal and the public visitor from the context diagram and the architecture diagram.
- Add every e-mail feature, the portals and the public catalog to the out-of-scope list in §4.3.
