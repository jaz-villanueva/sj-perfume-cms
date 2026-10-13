# Deployment

Everything runs on free tiers. Recurring cost: ₱0, as long as usage stays within the limits listed in `architecture.md`.

## Environments

| Environment | Frontend | Database |
|---|---|---|
| Local | `npm run dev` | Local Supabase stack (Docker) or the staging project |
| Staging | Cloudflare Pages preview deploy (one per pull request) | Supabase project `sjpt-cms-staging` |
| Production | Cloudflare Pages, `main` branch | Supabase project `sjpt-cms-prod` |

Supabase Free allows two active projects, which is exactly staging plus production.

## One-time setup (done by a maintainer, not in code)

1. **Supabase:** create both projects in the Singapore region. In Authentication settings:
   - disable sign-ups, e-mail confirmation and secure password change
   - leave the default e-mail sender unused
2. **Cloudflare Pages:** connect the repository, then set:
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
