# Deployment

Everything runs on free tiers. Recurring cost: ₱0, as long as usage stays within the limits listed in `architecture.md`.

## Environments

| Environment | Frontend | Database |
|---|---|---|
| Local | `npm run dev` | Local Supabase stack (Docker) or the staging project |
| Preview | Cloudflare Workers preview URL, built for every non-`main` branch | Supabase project `sjpt-cms-staging` |
| Staging / demo | Cloudflare Workers, built from `main` | Supabase project `sjpt-cms-staging` |
| Production | Set up at hand-over, ideally under the client's own Cloudflare and Supabase accounts | Separate production project |

Only one Supabase project exists for now. A free project pauses after 7 days without activity, so an unused production database would just keep pausing.

## Cloudflare Workers (static assets)

The frontend is a static single-page app served by Cloudflare Workers static assets. Cloudflare's dashboard now treats Pages as its legacy workflow, which is why Workers is used. Requests for static assets are free and unlimited, and no Worker script runs.

- **Config:** `frontend/wrangler.jsonc` defines:
  - the Worker name (`sjpt-cms`)
  - the asset directory (`dist`)
  - `not_found_handling: "single-page-application"`, so deep links such as `/products` load the app
- **Security headers:** `frontend/public/_headers` sets them.
- **Builds:** Cloudflare Workers Builds is connected to this GitHub repository.
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Deploy command (`main`): `npx wrangler deploy`
  - Non-production branches: `npx wrangler versions upload`, which produces a preview URL
- **Build variables:** set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Worker's build settings (Settings → Build → Variables and secrets). Both values are public by design; data is protected by row-level security.

## Supabase

- Organization `SJPT-CMS` (Free plan), project `sjpt-cms-staging`, region Southeast Asia (Singapore).
- Settings chosen when the project was created:
  - Data API on
  - "Automatically expose new tables" **off**, so every table is private until a migration grants access (deny-by-default, FR-2)
  - automatic RLS off, because migrations enable RLS explicitly
- **Authentication settings:**
  - public sign-ups disabled
  - e-mail confirmation off
  - secure password change off
  - the default e-mail sender left unused
- The database password belongs to the project owner's password manager. It is never committed or shared in chat.

## Secrets

- The service-role (secret) key and the database password never go in the repository, in `VITE_` variables, or in workflow logs.
- Edge Function secrets are set with `supabase secrets set`.
- GitHub repository secrets for the scheduled jobs (database session-pooler URL, backup keys) are added when those jobs are built.

## Backups (FR-20, NFR-4)

Planned:

- A nightly GitHub Actions job dumps the database through the session pooler.
- The dump is encrypted with `age` and uploaded to an off-site target (decision D6), with 30-day retention.
- A weekly restore drill restores the latest dump into a temporary database and checks the row counts.
- Each run is recorded so the dashboard can warn when the last success is more than 26 h old.

**Not yet implemented or tested:** don't rely on backups until the restore drill passes.
