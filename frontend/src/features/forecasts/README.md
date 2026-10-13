# Forecasts and reorder suggestions

**Owner:** Member 3 — Analytics, Forecasting & Infrastructure (Jaz Villanueva)

## Requirements

- **FR-22:** show the 8-week weekly forecast per product and in total, with:
  - the 80 % range
  - the selected model
  - the backtest error
  - a "Low confidence" label for products with fewer than 8 weeks of history

  The nightly Python job in `/forecasting` computes these values; this page only reads them.
- **FR-23:** suggested reorder quantity and projected stock-out date per product. These are advisory, shown in-app only (no e-mail).

## Notes

- Always label forecasts as estimates, not guaranteed sales.
