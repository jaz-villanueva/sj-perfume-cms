# Forecasting

**Owner:** Member 3 — Analytics, Forecasting & Infrastructure (Jaz Villanueva)

A Python job that runs every night at 03:00 PHT (19:00 UTC) on GitHub Actions. It reads weekly sales from Supabase and writes forecasts back, and the app only displays the results. The job runs on GitHub Actions because Supabase Edge Functions are limited to 2 s of CPU time per request, which is too little for 5,000 products.

## Requirements

- **FR-22:** an 8-week weekly unit forecast for every active product and for the total, with an 80 % prediction interval.
  - Each product is backtested on four models: naive, 4-week moving average, simple exponential smoothing and Holt linear trend.
  - The model with the lowest backtest error is used.
  - Products with fewer than 8 weeks of history are labelled "Low confidence".
- **FR-23:** suggested reorder quantity and projected stock-out date, calculated as follows:
  - suggested quantity = forecast demand over (lead time + 7-day review) + safety stock − available stock, and never below 0
  - safety stock = 1.65 × backtest RMSE × √(weeks of lead time + review)
- **NFR-18:** weekly total WAPE ≤ 25 %, and MASE < 1 for ≥ 70 % of the top-20 products, on the synthetic SEED-F dataset.
- **NFR-19:** 5,000 products × 104 weeks finishes in ≤ 10 minutes with peak memory ≤ 512 MB.

## Still to define in the SRS revision

- The error metric used to select the model (proposed: MAE from a rolling-origin backtest). Store RMSE as well, because FR-23 uses it.
- How the 80 % interval is computed for the naive and moving-average models (proposed: empirical backtest residual quantiles).

## Development

```bash
python -m venv .venv
.venv/Scripts/activate        # Windows (macOS/Linux: source .venv/bin/activate)
pip install -e ".[dev]"
pytest
```

Every result must be reproducible: use fixed random seeds for the synthetic data, and no randomness in the models.
