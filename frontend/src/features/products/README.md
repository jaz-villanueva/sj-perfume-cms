# Products

**Owner:** Member 1 — Products & Inventory (Robin Louis Putong)

## Requirements

- **FR-4 Products & pricing.** Add and edit products with SKU (`SJ-NNNNNN`), barcode, name, brand, scent family, size (mL), retail price, reseller price, reorder level and photo. The cost price is visible and editable by the Owner only. A duplicate SKU or barcode blocks the save with a "duplicate" message. A saved product appears in the list within 2 s.
- **FR-6 Barcode lookup.** A USB scanner types the code like a keyboard; find the product by barcode or SKU. *(Requirement text is missing from SRS v1.0 and will be restored.)*
- **FR-8 Code 128 SKU labels**, printable (JsBarcode). *(Text missing from SRS v1.0.)*
- **NFR-6:** duplicate SKUs and barcodes are rejected 100 % of the time.

## Notes

- The cost price lives in an Owner-only table (`product_costs`), because row-level security can't hide a single column.
- Product photos go to Supabase Storage (1 GB free in total). Compress them in the browser (about 200 KB WebP) before uploading.
- Schema and contracts: `docs/database-schema.md`, `docs/api-contracts.md`.
