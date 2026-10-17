# Products

**Owner:** Member 1 — Products & Inventory (Robin Louis Putong)

## Requirements (SRS v1.2)

- **FR-4 Product management.** Authorized users view and search products. The Owner and permitted Staff create or edit name, brand, scent family, size, SKU, prices, image and reorder level. Valid data is saved and searchable; invalid required fields and duplicate unique identifiers (SKU) are rejected. If the cost price is kept, only the Owner can see or edit it.
- **FR-10 Centralized search** (shared): products are searchable from the same app as the other records.
- **NFR-2:** duplicate SKUs are always rejected.

## Notes

- The cost price lives in an Owner-only table (`product_costs`), because row-level security can't hide a single column.
- Product photos go to Supabase Storage (1 GB free in total). Compress them in the browser (about 200 KB WebP) before uploading.
- Barcode scanning and printed SKU labels were in SRS v1.0 but are not in v1.2.
- Schema and contracts: `docs/database-schema.md`, `docs/api-contracts.md`.
