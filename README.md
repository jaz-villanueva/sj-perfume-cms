# SJ Perfume Trading — Centralized Management System (SJPT-CMS)

An internal web system for the owner of SJ Perfume Trading. It covers:

- products and pricing
- the stock-movement ledger
- sales and receipts
- customer and reseller records
- reports, sales trends and 8-week demand forecasts

All of it runs on one PostgreSQL database.

Computer Engineering capstone (CPECAPS), De La Salle University – Manila, Group 7.

> **Owner-side only.** There are no customer or reseller logins, no public storefront, no payment or courier integrations, and no e-mail features. See [`docs/requirements-baseline.md`](docs/requirements-baseline.md).

## Stack

All components are free tiers or open source:

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite, React Router, hosted on Cloudflare Pages |
| Database and auth | Supabase Free (PostgreSQL, Auth, row-level security, Storage, Edge Functions) |
| Scheduled jobs | GitHub Actions (nightly forecast and encrypted backup) |
| Forecasting | Python, statsmodels |
| Testing | Vitest, Testing Library, pgTAP, pytest; Playwright and k6 later |

## Repository layout

```
frontend/      React app. Each module owns folders in src/features/
supabase/      migrations, row-level security, Postgres functions, Edge Functions, pgTAP tests
forecasting/   nightly Python forecasting job (FR-22, FR-23)
docs/          requirements baseline, architecture, schema, API contracts, workflow, deployment
.github/       CI and the pull request template
```

## Modules

| Module | Member | Frontend folders | Requirements |
|---|---|---|---|
| 1 — Products & Inventory | Robin Louis Putong | `products/`, `inventory/`, `resellers/` | FR-4, FR-5, FR-6, FR-7, FR-8, FR-10 |
| 2 — Sales & Operations | James Earl Cugal | `sales/`, `customers/` | FR-9, FR-11, FR-12, NFR-5, NFR-11, NFR-14 (reseller orders pending decision) |
| 3 — Analytics, Forecasting & Infrastructure | Jaz Villanueva | `dashboard/`, `reports/`, `trends/`, `forecasts/`, `imports/`, plus `forecasting/` | FR-16, FR-17, FR-20, FR-21, FR-22, FR-23 |
| Shared foundation | All | `users/`, `audit/`, `src/app/`, `src/lib/` | FR-1, FR-2, FR-3, FR-18 |

Each feature folder has a README with its requirements and rules.

## Getting started

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test
npm run lint
```

Copy `frontend/.env.example` to `frontend/.env.local` to connect to Supabase. See [`docs/development-workflow.md`](docs/development-workflow.md) for branching, commits and database changes.
