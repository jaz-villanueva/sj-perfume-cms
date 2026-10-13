# SJ Perfume Trading — Centralized Management System (SJPT-CMS)

An internal web system for the owner of SJ Perfume Trading. It covers:

- products and pricing
- the stock-movement ledger
- sales and receipts
- customer and reseller records
- reports, sales trends and 8-week demand forecasts

All of it runs on one PostgreSQL database.

Computer Engineering capstone (CPECAPS), De La Salle University – Manila, Group 7.

**Live (staging):** https://sjpt-cms.sjperfumetrading.workers.dev, deployed automatically from `main`.

> **Owner-side only.** There are no customer or reseller logins, no public storefront, no payment or courier integrations, and no e-mail features. See [`docs/requirements-baseline.md`](docs/requirements-baseline.md).

## Stack

All components are free tiers or open source:

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite, React Router, hosted on Cloudflare Workers (static assets) |
| Database and auth | Supabase Free (PostgreSQL, Auth, row-level security, Storage, Edge Functions) |
| Scheduled jobs | GitHub Actions (nightly forecast and encrypted backup) |
| Forecasting | Python, statsmodels |
| Testing | Vitest, Testing Library, pgTAP, pytest; Playwright and k6 later |

## Deployment

| Environment | Where | Updated |
|---|---|---|
| Staging | https://sjpt-cms.sjperfumetrading.workers.dev | Automatically on every push to `main` |
| Branch previews | One Cloudflare preview URL per branch, linked from the pull request's "Workers Builds" check | Automatically on every push to the branch |
| Production | Not created yet. It will be set up at hand-over, ideally under the client's own accounts. | — |

### Cloudflare (hosting)

- **Hosting:** Cloudflare Workers static assets on the Free plan, Worker `sjpt-cms`.
- **Builds:** Workers Builds is connected to this repository.
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Deploy command: `npx wrangler deploy` on `main`, `npx wrangler preview` on other branches
- **Config files:** `frontend/wrangler.jsonc` holds the Worker config. `frontend/public/_headers` holds the security headers.
- **Build variables:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, set in the Worker's build settings.

### Supabase (database and auth)

- **Organization and project:** organization `SJPT-CMS` (Free plan), project `sjpt-cms-staging`, region Southeast Asia (Singapore).
- **Project URL:** `https://hdvzvgcsmcauyluxduaz.supabase.co`.
- **Publishable key:** in the dashboard under Project Settings → API Keys. It is public by design. Never put the secret key in the frontend.
- **Auth:**
  - E-mail and password only.
  - Public sign-up and e-mail confirmation are off; the Owner creates accounts inside the app.
  - Passwords need at least 8 characters, with letters and digits.
- **Tables:** new tables are not exposed through the API automatically. Each migration grants access explicitly, behind row-level security.

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
