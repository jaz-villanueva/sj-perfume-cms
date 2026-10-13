# Supabase

The database is the backend. Business rules live here, not in the browser:

- constraints
- row-level security (RLS) on every table
- Postgres functions for every write that touches more than one row (sales, stock movements, imports)

## Layout

| Path | Contents |
|---|---|
| `config.toml` | Local stack settings. Public sign-ups are off; the Owner creates accounts in the app. |
| `migrations/` | Schema changes, one file per change, created with `supabase migration new <name>`. |
| `functions/` | Edge Functions that need the service-role key (`admin-users`, `login`, `health`). |
| `tests/database/` | pgTAP tests, run with `supabase test db`. |
| `seed.sql` | Synthetic seed data for local development. |

## Rules

1. **Never edit a migration that has been merged to `main`.** Add a new one instead.
2. Every new table gets RLS enabled and policies in the same migration, plus a pgTAP test that proves a disallowed role is denied.
3. Functions that change stock or sales are `security definer` with `set search_path = ''` and fully qualified names.
4. If two open pull requests both add migrations, the one merged second must rename its file to a later timestamp before merging.
5. Never commit real client data, database dumps, or keys.

## Running locally

The local stack needs Docker Desktop (free for education and personal use).

```bash
supabase start          # Postgres, Auth, Storage, Studio on localhost
supabase db reset       # re-apply all migrations and seed.sql
supabase test db        # run the pgTAP tests
supabase stop
```

CI runs `supabase test db` on every pull request, so database tests run there even on machines without Docker.
