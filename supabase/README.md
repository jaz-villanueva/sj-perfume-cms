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

## Applying to the staging project (no CLI needed)

1. Supabase dashboard → **SQL Editor** → **New query**. Paste the migration files from `migrations/` in order and **Run**. Then do the same with `seed.sql` if the project should have demo data. On a project that already has the earlier migrations, run only the new files, oldest first.
2. **Authentication → Users → Add user**: e-mail and password, tick **Auto Confirm User**. Every new user gets a `profiles` row with the role `staff`. This is only needed for the first Owner account; after that the Owner adds Staff accounts in the app (**Users**), which needs the `admin-users` function below.
3. Make the Owner's account an Owner, in the SQL Editor:

   ```sql
   update public.profiles set role = 'owner'
    where id = (select id from auth.users where email = 'owner@example.com');
   ```
4. In `frontend/.env.local`, fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` and set `VITE_USE_SAMPLE_DATA=false`.

## Edge Functions

| Function | What it does | Tests |
|---|---|---|
| `admin-users` | The Owner creates, edits, deactivates, reactivates and deletes Staff accounts and resets their passwords (FR-3). Uses the secret (service-role) key, which Supabase provides to the function automatically; it never goes in the browser or the repository. | `node --test supabase/functions/admin-users/handler.test.ts` (Node 22.18+) |

### Deploying `admin-users` to the staging project

Apply the migrations first (the function calls `admin_apply_account_change`). Then, from the repository root (Node only, no Docker needed with `--use-api`):

```bash
npx supabase login
npx supabase functions deploy admin-users --project-ref <project-ref> --use-api
```

Leave **Verify JWT** on (the default). The dashboard's **Edge Functions → Deploy a new function → Via Editor** also works if you add both files, `index.ts` and `handler.ts`, with the same names.

To check it: sign in to the app as the Owner, open **Users**, and add a test Staff account. If the screen says the function has not been deployed, the deploy didn't finish or the name is different.

## Owner password reset

The Owner can't reset their own password in the app, and the dashboard's "send recovery e-mail" doesn't reach anyone (no e-mail is set up). A maintainer sets a temporary password instead:

1. Supabase dashboard → **SQL Editor** → **New query**, with the Owner's e-mail and a temporary password:

   ```sql
   update auth.users set encrypted_password = extensions.crypt('TEMPORARY-PASSWORD', extensions.gen_salt('bf'))
    where email = 'owner@example.com';
   ```
2. Give the Owner the temporary password in person. They change it under **Users → My account**.

## Running locally

The local stack needs Docker Desktop (free for education and personal use).

```bash
supabase start          # Postgres, Auth, Storage, Studio on localhost
supabase db reset       # re-apply all migrations and seed.sql
supabase test db        # run the pgTAP tests
supabase stop
```

CI runs `supabase test db` on every pull request, so database tests run there even on machines without Docker.
