# QuantMind Integration Plan

## Priority order (executed)

1. QuantFlow foundations — EWMA, Kalman, OHLC estimators, Black, Wiener/GBM
2. Market microstructure features — L2 book imbalance (Kollector concepts)
3. Statistical features — returns, z-score, realized vol
4. Volatility/risk — RiskEngine + kill switch
5. Research — backtest metrics, Monte Carlo, Sobol
6. Strategy DSL — safe AST evaluator (dynts-inspired)
7. CCY — minimal day-count / FX helpers
8. Deferred — Heston/SVI, Deribit/FRED connectors, aio-fluid workers, qmlib

## Non-goals this iteration

- Live trading activation
- Blind dependency on archived pulsar/lux stacks
- Copying qmlib / GPL sources
- Replacing nonexistent prior trading code
