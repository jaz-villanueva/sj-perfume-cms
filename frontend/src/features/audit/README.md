# Audit log

**Owner:** Shared foundation

## Requirements (SRS v1.2)

- **FR-17 Audit trail:** record important create, update, delete, stock and sales actions with the acting user, timestamp, affected record, action type and before/after values.
  - Database triggers write the entries, and no ordinary user can edit or delete them.
  - The Owner reads the log here; Staff get no view or a limited one (SRS §4).
- **NFR-7 Auditability:** destructive actions need confirmation and are restricted by role.
