# Capability Gap Matrix

| Capability | Existing System (pre) | QuantMind Source | Better Implementation | Integration Decision |
|---|---|---|---|---|
| market data | none | quantflow data/*, kollector | adapters later; vault patterns | E — design only for now |
| OHLC normalization | none | quantflow ta/ohlc | Parkinson/GK/RS | **D integrated** |
| options | none | quantflow options/bs,svi | Black forward + BS | **D integrated** (BS/Black); SVI deferred |
| volatility | none | ewma, ohlc, heston | EWMA + realized + range | **D integrated** |
| volatility surfaces | none | svi/ssvi/surface | QuantFlow stronger | P1 — A or D later |
| stochastic models | none | sp/* | Wiener/GBM first | **D integrated** (Wiener/GBM); Heston/BNS P1 |
| macro data | none | fred/fed/fiscal | connectors | P1 |
| rates | none | rates/* | Nelson-Siegel etc. | P1 |
| crypto | none | deribit + kollector | exchange adapters | P1 |
| equities | none | yahoo/fmp | connectors | P1 |
| currencies | none | ccy | helpers | **E/D integrated** |
| order books | none | kollector L2 | imbalance/spread | **D integrated** |
| technical features | none | ewma/kalman/supersmooth | EWMA+Kalman | **D integrated** |
| statistical features | none | dynts/stats | zscore/returns | **D integrated** |
| regime detection | none | — | native engine | **new native** |
| alpha signals | none | dynts DSL | safe DSL | **E/D integrated** |
| portfolio construction | none | — | native later | P1 |
| position sizing | none | — | risk-clipped | **partial via risk** |
| risk | none | — | authoritative engine | **new native** |
| backtesting | none | — | deterministic long/flat | **new native** |
| walk-forward | none | — | design ready | P1 |
| Monte Carlo | none | quantflow sp + d3 sobol | GBM + Sobol | **D integrated** |
| parameter optimization | none | sobol | Sobol grid | **D integrated** |
| transaction costs | none | — | bps model | **integrated in backtest** |
| slippage | none | — | bps model | **integrated in backtest** |
| execution | none | — | RESEARCH/PAPER/LIVE | **new native** |
| paper trading | none | — | default | **new native** |
| live trading | none | — | explicit enable | **stub, disabled** |
| distributed compute | none | aio-fluid | local first | E — P2 |
| visualization | none | d3-quant | later dashboard | P2 |
| observability | none | kollector metrics | later | P2 |
