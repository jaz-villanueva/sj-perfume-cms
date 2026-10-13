# User accounts and access

**Owner:** Shared foundation

## Requirements

- **FR-1 Login** with e-mail and password through Supabase Auth.
  - Lock the account for 15 minutes after 5 failed attempts. This needs a `login` Edge Function, because Supabase Free has no password-verification hook.
- **FR-2 Access control:** deny by default, on every screen and every database call.
- **FR-3 Account management:** the Owner manages accounts in the app.
  - Create, deactivate and reactivate accounts, and set temporary passwords.
  - No e-mail is involved: no invites and no reset links.
  - All of this goes through an `admin-users` Edge Function, so the service-role key never reaches the browser.
- **NFR-9:** log users out after 30 minutes of inactivity with a client-side timer. Server-side session timeouts are a paid Supabase feature.
