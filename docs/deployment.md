# Deployment

Everything runs on free tiers. Recurring cost: ₱0, as long as usage stays within the limits listed in `architecture.md`.

## Environments

| Environment | Frontend | Database |
|---|---|---|
| Local | `npm run dev` | Local Supabase stack (Docker) or the staging project |
| Demo / staging | GitHub Pages, deployed from `main`: https://jaz-villanueva.github.io/sj-perfume-cms/ | Supabase project `sjpt-cms-staging` |
| Production (planned) | Cloudflare Pages | Supabase project `sjpt-cms-prod` |

Supabase Free allows two active projects, which is exactly staging plus production.

## GitHub Pages (demo / staging)

- `.github/workflows/deploy-pages.yml` runs on every push to `main`. It tests and builds the app, then deploys it. You can also run it by hand from the Actions tab.
- The app is served from `/sj-perfume-cms/`. The workflow sets `BASE_PATH` for the build, and the router reads it from `import.meta.env.BASE_URL`.
- GitHub Pages has no URL rewrites, so the workflow copies `index.html` to `404.html`. Deep links such as `/sj-perfume-cms/products` still load the app (with an HTTP 404 status).
- **Supabase connection:** set the repository **variables** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Settings → Secrets and variables → Actions → Variables. Until they are set, the deployed app runs without data access.
- **Limitations:**
  - No custom HTTP headers, so the `_headers` file only applies on Cloudflare.
  - No per-pull-request preview deploys.
  - GitHub's terms don't allow Pages to be used to run a business. GitHub Pages therefore serves as the demo and staging host; the client's production site goes on Cloudflare Pages.

## One-time setup (done by a maintainer, not in code)

1. **Supabase:** create both projects in the Singapore region. In Authentication settings:
   - disable sign-ups, e-mail confirmation and secure password change
   - leave the default e-mail sender unused
2. **Cloudflare Pages (production, before hand-over):** connect the repository, then set:
   - root directory `frontend`
   - build command `npm run build`
   - output directory `dist`
   - environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, with different values for production and preview
3. **GitHub:** add repository secrets for the scheduled jobs once they exist:
   - the database session-pooler URL
   - the backup encryption public key
   - the backup-target credentials
4. **Branch protection on `main`:** require a pull request and passing CI checks.

## Secrets

- The service-role (secret) key and the database password never go in the repository, in `VITE_` variables, or in workflow logs.
- Edge Function secrets are set with `supabase secrets set`.

## Backups (FR-20, NFR-4)

Planned:

- A nightly GitHub Actions job dumps the database through the session pooler.
- The dump is encrypted with `age` and uploaded to an off-site target (decision D6), with 30-day retention.
- A weekly restore drill restores the latest dump into a temporary database and checks the row counts.
- Each run is recorded so the dashboard can warn when the last success is more than 26 h old.

**Not yet implemented or tested:** don't rely on backups until the restore drill passes.
