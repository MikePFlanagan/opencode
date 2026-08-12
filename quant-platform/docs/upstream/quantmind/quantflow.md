# quantflow

- What: Quantitative finance library — stochastic processes, options, rates, TA, market data connectors, docs/API.
- Maintenance: Active (pushed 2026-08-08). Default branch `main`.
- License: BSD-3-Clause
- Useful modules: `sp/*`, `options/*`, `ta/*`, `rates/*`, `data/*`, `dists/*`
- Algorithms: Heston, BNS, jump diffusion, CIR/OU/Wiener/Poisson, SVI/SSVI, Black IV, EWMA, Kalman/UKF, OHLC estimators
- Architecture: pydantic models + numpy/scipy; FastAPI app; MCP tooling
- Integration candidates: EWMA, Kalman, OHLC, Black, Wiener (done); SVI/Heston/data connectors (next)
- Rejected now: DivFM neural pricer (heavy ML dep), full FastAPI app merge
