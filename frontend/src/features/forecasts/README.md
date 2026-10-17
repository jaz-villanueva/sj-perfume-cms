# Forecasts and reorder suggestions

**Owner:** Member 3 — Analytics, Forecasting & Infrastructure (Jaz Villanueva)

## Requirements (SRS v1.2)

- **FR-14 Forecasting:** estimate future sales or demand by product and period from historical data. Show the forecast horizon, the assumptions and the confidence or limitations.
  - The model is **not chosen yet** (SRS §5). Candidates: naive, moving average, simple exponential smoothing, Holt, or a machine-learning model if the data justifies it.
  - A weekly forecast for the next 8 weeks is preferred.
- **FR-15 Stock-demand planning:** projected stock needs, low-stock risk and advisory reorder suggestions, traceable to the displayed forecast and current stock. Suggestions never place supplier orders; the Owner decides.
- **NFR-11:** label every value as an estimate, and show the period, the date it was generated and any data limitations. Products with little history are flagged as low confidence.
- **NFR-12:** evaluate forecasts on held-out history against a simple baseline, and report the method and the results.

## Notes

- The nightly Python job in `/forecasting` computes the forecasts; this page only reads them.
