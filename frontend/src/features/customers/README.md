# Customers

**Owner:** Member 2 — Sales & Operations (James Earl Cugal)

## Requirements

- **FR-9 Customer records:** name, mobile number, e-mail, address, preferred channel, data-privacy consent and consent date. A save without consent is blocked. Searching by name or mobile returns in ≤ 3 s with 10,000 records.
- **NFR-6:** duplicate mobile numbers are rejected (normalise them before comparing).
- **NFR-14 (RA 10173):** a privacy notice is shown wherever data is collected. The Owner can export or delete one person's data in ≤ 5 minutes. "Delete" means anonymise, so past sales totals stay correct.

## Scope notes

- Customers never log in. These are internal records only.
