# User accounts and access

**Owner:** Shared foundation

## Requirements (SRS v1.2)

- **FR-1 Authentication:** Owner/Admin and Staff sign in with e-mail and password (Supabase Auth) before seeing any internal data.
- **FR-2 Role-based access control:** deny by default on every screen and every database call. Staff can't run Owner-only operations by tweaking the UI or calling endpoints directly.
- **FR-3 User account management:** the Owner creates, views, edits, deactivates, reactivates and deletes Staff accounts. Staff manage only their own profile and password.
  - No e-mail is involved.
  - All of this goes through an `admin-users` Edge Function, so the service-role key never reaches the browser.
- **FR-16 Administrative data management:** only the Owner can make privileged deletions. Deleting an account keeps the identity needed for past sales and audit entries.
- **NFR-4 Session management:** client-side idle logout; failed sign-ins limited by a `login` Edge Function (Supabase Free has no password-verification hook).
