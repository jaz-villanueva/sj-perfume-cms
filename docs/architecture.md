# Architecture

## Overview

```
Browser (Owner/Staff PC or phone) ── HTTPS ──► Cloudflare Workers static assets (React + Vite single-page app)
        │
        │ supabase-js (publishable key + user session)
        ▼
Supabase (Singapore region)
  ├─ Auth ............ e-mail/password; no e-mail is ever sent
  ├─ PostgREST ....... tables and views behind row-level security; RPC functions for multi-row writes
  ├─ Postgres ........ stock ledger, sales, audit triggers, report views, forecast tables
  ├─ Storage ......... product photos (private bucket, signed URLs)
  └─ Edge Functions .. admin-users (service role), login (lockout), health
GitHub Actions
  ├─ ci.yml .......... lint, unit tests, build, pgTAP, pytest
  ├─ forecast ........ nightly 03:00 PHT: Python/statsmodels → forecast tables      (planned)
  ├─ backup .......... nightly pg_dump → age encryption → off-site storage          (planned)
  └─ restore drill ... weekly: restore the latest backup into a temporary database and verify it (planned)
```

## Key decisions

1. **No separate backend server.** Business rules live in Postgres: constraints, RLS, and `security definer` functions with a pinned `search_path`. The three Edge Functions handle only what needs the service-role key.
2. **Stock integrity.**
   - `stock_movements` is append-only.
   - `product_stock` holds the current balance, with `CHECK (on_hand >= 0)`.
   - Every stock-changing operation runs in one Postgres function: it locks the affected rows in product-id order (so concurrent operations can't deadlock), validates them, and writes. A failure rolls everything back.
   - A test enforces the invariant `Σ movements = on_hand` for every product.
3. **Field-level secrecy through tables, not columns.** The cost price lives in a separate Owner-only table, because RLS works on whole rows.
4. **Accounts without e-mail.**
   - Public sign-ups are disabled, and so are e-mail confirmation and "secure password change".
   - The Owner creates accounts and sets temporary passwords through the `admin-users` Edge Function.
   - If the Owner account's password is lost, a maintainer resets it from the Supabase dashboard, following a documented runbook.
5. **Revocation within 60 s (FR-3).** Every RLS policy checks `profiles.is_active`, so a deactivated user loses data access on their next request. The auth user is also banned so the session can't be refreshed.
6. **Scheduled work runs on GitHub Actions.** Edge Functions are limited to 2 s of CPU time per request, which is too little for forecasting, and Supabase Free has no backups.
7. **Feature folders.** Each folder in `frontend/src/features/` belongs to one module and registers its own routes, which keeps merge conflicts between members low.

## Free-tier limits (verified October 2026)

| Service | Limits that matter |
|---|---|
| Supabase Free | 500 MB database, 1 GB file storage, 5 GB egress, 2 active projects, **paused after 7 days without activity**, **no automatic backups**, 1-day log retention. Session timeouts, leaked-password protection and the password-verification hook are paid features. The default e-mail sender only reaches project team members. |
| Supabase Edge Functions | 2 s CPU per request, 150 s wall clock, 256 MB memory |
| Cloudflare Workers (static assets) | Static asset requests free and unlimited; Workers Builds: 3,000 build minutes/month, 1 concurrent build, 20-minute build limit |
| GitHub Actions | Free for public repositories. **Scheduled workflows in a public repo are disabled after 60 days without repository activity.** |

## Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-1 | Schedule: acceptance on 21 Nov 2026 | Musts first; cut Should items (FR-22/23) if needed |
| R-3 | Lockout can be bypassed by calling Supabase Auth directly | Supabase's per-IP rate limits apply instead; disclose this in the SRS |
| R-5 | Project pauses after 7 idle days | Daily use and the nightly jobs keep it active; documented in the hand-over |
| R-6 | Public repository: Actions logs and artifacts are visible | Never upload dumps as artifacts here; never print data in logs |
| R-7 | The Supabase direct DB host is IPv6-only, and GitHub runners have no IPv6 | Use the session-pooler connection string |
| R-8 | The 60-day schedule shutdown after hand-over | Documented, with a keep-alive or re-enable step in the runbook |
