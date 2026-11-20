# User accounts and access

**Owner:** Shared foundation

## Requirements (SRS v1.2)

- **FR-1 Authentication:** Owner/Admin and Staff sign in with e-mail and password (Supabase Auth) before seeing any internal data.
- **FR-2 Role-based access control:** deny by default on every screen and every database call. Staff can't run Owner-only operations by tweaking the UI or calling endpoints directly.
- **FR-3 User account management:** the Owner creates, views, edits, deactivates, reactivates and deletes Staff accounts. Staff manage only their own profile and password.
  - No e-mail is involved.
  - All of this goes through the `admin-users` Edge Function, so the service-role key never reaches the browser.
- **FR-16 Administrative data management:** only the Owner can make privileged deletions. Deleting an account keeps the identity needed for past sales and audit entries.
- **NFR-4 Session management:** client-side idle logout; failed sign-ins limited by a `login` Edge Function (Supabase Free has no password-verification hook).

## What the screen does

- **Owner:** the account list (Owner first, deleted accounts last) and, for each Staff account, **Edit**, **Reset password**, **Deactivate** / **Reactivate** and **Delete**. Deactivate and Delete ask for confirmation. **Add staff account** sets a temporary password (**Suggest** makes one).
- **Everyone:** **My account** to change their own name and password. Changing the password asks for the current one.

## Files

| File | What it does |
|---|---|
| `UsersPage.jsx` | The screen |
| `userUtils.js` | Account and password validation, status, sorting, temporary password suggestion |
| `usersApi.js` | Reads `profiles`; calls the `admin-users` function for the Owner's changes; `update_my_profile` and `supabase.auth.updateUser` for "My account". Sample data in memory without a database |
| `admin.module.css` | Styles for the Users and Audit log screens |

## Server side

- `supabase/migrations/20261110120000_user_accounts.sql` (tested by `02_user_accounts.test.sql`): `profiles.email` and `profiles.deleted_at`; `update_my_profile(p_full_name)`; `admin_apply_account_change(p_actor, p_user_id, p_action, p_full_name, p_email)`, callable by the service role only, which checks the actor is an active Owner and the target is a Staff account.
- `supabase/functions/admin-users/`: checks the caller is a signed-in, active Owner, then changes Supabase Auth (create, e-mail, password, ban, soft delete) and the profile. Deactivation updates the profile first, so access stops on the next request, then bans the sign-in so the session can't be refreshed. Delete is a soft delete in Auth plus `deleted_at`; the row stays for history. Deployment: `supabase/README.md`.

## Still to do

- NFR-4: idle logout and the `login` lockout function.
