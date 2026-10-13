# Development workflow

## One-time setup

1. Install Node.js 24 (see `frontend/.nvmrc`), Git, and Python 3.11+ (needed only for `forecasting/`).
2. Optional, for running the database locally: Docker Desktop and the Supabase CLI.
3. Clone the repository and set **your own** identity for this repository only:

   ```bash
   git config user.name "Your Name"
   git config user.email "the-email-on-your-github-account@example.com"
   ```

   GitHub credits a commit to whichever account owns the commit's e-mail address. Use an e-mail that is verified on **your** GitHub account, or your `ID+username@users.noreply.github.com` address.

4. Run the frontend:

   ```bash
   cd frontend
   npm install
   cp .env.example .env.local   # fill in the staging Supabase URL and publishable key
   npm run dev
   ```

   The app shell runs even without `.env.local`; data features need it.

## Day-to-day

1. `git switch main && git pull`
2. `git switch -c feature/<short-name>`. Prefixes: `feature/`, `fix/`, `chore/`, `docs/`.
3. Work inside your module's folders (see the module table in the README).
4. Run the checks before pushing:
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `pytest` (for forecasting changes)
5. Commit with a short imperative message describing the change, e.g. `Add inventory movement ledger`.
6. Push and open a pull request. Fill in the template, including the SRS requirement IDs.
7. Another member reviews. Merge after CI passes. Squash merging is preferred.

`main` is never committed to directly after the initial setup.

## Shared files

These affect everyone. Change them only in a small, separate pull request and tell the team:

- `frontend/src/app/`
- `frontend/src/lib/`
- `frontend/src/components/`
- `supabase/config.toml`
- `.github/`
- `docs/api-contracts.md`

## Database changes

See `supabase/README.md`. In short:

- Create new migrations with `supabase migration new`.
- Never edit a merged migration.
- Every table gets RLS and a test that proves a disallowed role is denied.

## Testing

| Layer | Tool | Location |
|---|---|---|
| UI and domain logic | Vitest + Testing Library | next to the code (`*.test.js[x]`) |
| Database (RLS, functions) | pgTAP | `supabase/tests/database/` |
| Forecasting | pytest | `forecasting/tests/` |
| End-to-end and cross-browser | Playwright | added in Phase 4 |
| Load (NFR-2) | k6 | added in Phase 4 |
