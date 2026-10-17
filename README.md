# SJ Perfume Trading — Centralized Management System (SJPT-CMS)

A web system for SJ Perfume Trading's Owner/Admin and Staff, plus a public product catalog. It covers:

- products, pricing and the public product catalog
- the stock-movement ledger
- sales (walk-in, online and reseller)
- customer and reseller records
- reports, sales trends, demand forecasts and reorder suggestions

All of it runs on one PostgreSQL database.

Computer Engineering capstone (CPECAPS), De La Salle University – Manila, Group 7.

**Live (staging):** https://sjpt-cms.sjperfumetrading.workers.dev, deployed automatically from `main`.

> **Scope (SRS v1.2).** Owner/Admin and Staff sign in; customers only browse the public catalog. There are no customer or reseller logins, no cart or checkout, no payment processing, and no e-mail features. See [`docs/requirements-baseline.md`](docs/requirements-baseline.md).

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
- **Sample data:** until the database tables exist, the screens show built-in sample data. Set `VITE_USE_SAMPLE_DATA=false` (or flip the default in `frontend/src/lib/supabase.js`) to use the database.

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
forecasting/   nightly Python forecasting job (FR-14, FR-15)
docs/          requirements baseline, architecture, schema, API contracts, workflow, deployment
.github/       CI and the pull request template
```

## Modules

| Module | Member | Frontend folders | Requirements |
|---|---|---|---|
| 1 — Products & Inventory | Robin Louis Putong | `products/`, `inventory/`, `resellers/`, `catalog/` | FR-4, FR-5, FR-6, FR-8, FR-12 |
| 2 — Sales & Operations | James Earl Cugal | `sales/`, `customers/` | FR-7, FR-9, NFR-5 |
| 3 — Analytics, Forecasting & Infrastructure | Jaz Villanueva | `dashboard/`, `reports/`, `trends/`, `forecasts/`, `imports/`, plus `forecasting/` | FR-11, FR-13, FR-14, FR-15, NFR-8, NFR-11, NFR-12 |
| Shared foundation | All | `users/`, `audit/`, `src/app/`, `src/lib/` | FR-1, FR-2, FR-3, FR-10, FR-16, FR-17, FR-18 |

Each feature folder has a README with its requirements and rules. Requirement IDs follow SRS v1.2; READMEs written before v1.2 may use older numbers (mapping in the requirements baseline).

## Getting started

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test
npm run lint
```

Copy `frontend/.env.example` to `frontend/.env.local` to connect to Supabase. See [`docs/development-workflow.md`](docs/development-workflow.md) for branching, commits and database changes.
