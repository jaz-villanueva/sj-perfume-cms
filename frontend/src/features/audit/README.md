# Audit log

**Owner:** Shared foundation

## Requirements (SRS v1.2)

- **FR-17 Audit trail:** record important create, update, delete, stock and sales actions with the acting user, timestamp, affected record, action type and before/after values.
  - Database triggers write the entries, and no ordinary user can edit or delete them.
  - The Owner reads the log here; Staff get no view (SRS §4).
- **NFR-7 Auditability:** destructive actions need confirmation and are restricted by role.
- **NFR-5 Privacy:** entries for customers and resellers never keep personal details.

## What the screen does

Owner only (Staff see a short message; the database returns nothing to them anyway). Newest entries first, 100 at a time with **Show older entries**. Filters: area, kind of action, who did it, and a date range in Philippine time. Each entry shows the before → after values of what changed.

## Files

| File | What it does |
|---|---|
| `AuditLogPage.jsx` | The screen |
| `auditUtils.js` | Wording for areas, actions, fields and values; date filters |
| `auditApi.js` | Reads `audit_log` and the profile names. Sample entries in memory without a database |

Styles come from `../users/admin.module.css`.

## Database

`supabase/migrations/20261110120100_audit_trail.sql`, tested by `supabase/tests/database/03_audit_trail.test.sql`.

- `audit_log(id, created_at, actor_id, actor_role, action, table_name, record_id, record_label, old_data, new_data)`. For edits, `old_data` and `new_data` hold only the columns that changed.
- What is logged: products, cost prices, resellers, customers and profiles (added, changed, deleted); sales (recorded, once per sale when it commits, with items and total; voided); stock-in, return and adjustment movements. Sale and void movements are covered by the sale entries.
- Named actions: `void`, `anonymize`, `export`, `deactivate`, `reactivate`, `delete_account`, `password_reset`.
- Changes made through the `admin-users` function name the Owner as the actor.
- Append-only: a trigger refuses every update, delete and truncate, including from the service role. The Owner can read; nobody can write except the database's own functions.
