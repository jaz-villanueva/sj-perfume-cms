# Audit log

**Owner:** Shared foundation

## Requirements

- **FR-18:** record an audit entry for every create, update and delete on products, prices, stock, sales, customers, resellers and users.
  - Each entry holds the user, role, timestamp, action, record, old value and new value.
  - Database triggers write the entries, and no role can edit or delete them.
  - This page is a read-only viewer for the Owner.
