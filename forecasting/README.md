# Forecasting

**Owner:** Member 3 — Analytics, Forecasting & Infrastructure (Jaz Villanueva)

A Python job that runs every night at 03:00 PHT (19:00 UTC) on GitHub Actions. It reads weekly sales from Supabase and writes forecasts back, and the app only displays the results. The job runs on GitHub Actions because Supabase Edge Functions are limited to 2 s of CPU time per request.

## Requirements (SRS v1.2)

- **FR-14 Forecasting and trends:** estimate future sales or demand by product and period from historical data, with the horizon, assumptions and confidence or limitations.
- **FR-15 Stock-demand planning:** projected stock needs and advisory reorder suggestions, traceable to the forecast and current stock. Suggestions never place orders.
- **NFR-11 Forecast transparency:** label estimates, show the period and the generated date, and disclose data limitations. Flag low-confidence products (little history, gaps, one-off spikes).
- **NFR-12 Forecast evaluation:** measure accuracy on held-out history against a simple baseline, and report the method and the results.

## Model selection (SRS §5: not chosen yet)

The model is picked **after** reviewing the client's historical data, which is due as CSV.

1. **Check the data:** how many weeks of history, how complete, how many products.
2. **Backtest candidates** with a rolling origin:
   - naive ("same as last week") as the baseline
   - 4-week moving average
   - simple exponential smoothing
   - Holt linear trend
   - a machine-learning model only if the data justifies it
3. **Compare** with MAE and WAPE, plus MASE against the naive baseline. Document the chosen method and its results.
4. **Horizon:** weekly for the next 8 weeks if the data allows it, otherwise shorter, and stated in the UI.

A reorder suggestion could be "forecast demand over lead time + review period + safety stock − available stock (never below 0)". That formula was in SRS v1.0; confirm it with the client before building it.

## Development

```bash
python -m venv .venv
.venv/Scripts/activate        # Windows (macOS/Linux: source .venv/bin/activate)
pip install -e ".[dev]"
pytest
```

Every result must be reproducible: use fixed random seeds for synthetic data, and no randomness in the models.
