# Product catalog (public)

**Owner:** Member 1 — Products & Inventory (Robin Louis Putong)

## Requirements (SRS v1.2)

- **FR-12 Product catalog display (Must).** An online catalog that customers can open **without logging in**. It shows approved fields only, such as product image, name, size, retail price, description and availability. It must never expose cost price, customer or reseller data, internal reports or sensitive inventory details.

## Design

- Read from the `public_catalog` view (`GET /rest/v1/public_catalog`) with the publishable key only, no user session. It's the only database object the `anon` role can read.
- Show availability as a label (In stock / Low / Out of stock), not the exact quantity.
- Only products marked `show_in_catalog` appear.

## Still to decide (SRS §11)

- Exactly which product fields are public, and how availability is represented.
- Whether this page lives at `/catalog` on the same site (current plan) or on its own address.
