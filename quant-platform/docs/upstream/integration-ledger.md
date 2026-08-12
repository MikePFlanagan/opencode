# Integration Ledger

## Component: EWMA
- Purpose: Online smoothing / volatility feature building block
- Upstream organization: quantmind
- Repository: quantflow
- Repository URL: https://github.com/quantmind/quantflow
- Upstream commit: 76fb818c012fcfa9ea29997ac3b1ef716f1d5c31
- Original path(s): quantflow/ta/ewma.py
- License: BSD-3-Clause
- Integration classification: D
- Our implementation path: src/quant_platform/features/ewma.py
- Changes made: stdlib-only online EWMA with period/half-life/alpha constructors
- Tests: tests/test_integrations.py::test_ewma_*
- Benchmarks: benchmarks/test_bench.py::test_ewma_benchmark
- Reason for adoption: clean, well-documented parameterization
- Known limitations: no pandas vectorization
- Upgrade considerations: optional A — depend on quantflow if heavier TA needed

## Component: LocalLevelKalman
- Purpose: Trend estimate feature
- Upstream: quantmind/quantflow@76fb818c012fcfa9ea29997ac3b1ef716f1d5c31
- Original path(s): quantflow/ta/kalman.py
- License: BSD-3-Clause
- Classification: D
- Path: src/quant_platform/features/kalman.py
- Tests: test_kalman_tracks_step
- Limitations: scalar only; UKF/multivariate deferred

## Component: OHLC range estimators
- Upstream: quantmind/quantflow@76fb818c… / quantflow/ta/ohlc.py
- License: BSD-3-Clause / Classification: D
- Path: src/quant_platform/features/ohlc.py
- Tests: test_parkinson_positive

## Component: Black / Black-Scholes
- Upstream: quantmind/quantflow@76fb818c… / quantflow/options/bs.py
- License: BSD-3-Clause / Classification: D
- Path: src/quant_platform/research/options.py
- Tests: test_black_scholes_call_atm_positive

## Component: Wiener / GBM Monte Carlo
- Upstream: quantmind/quantflow@76fb818c… / quantflow/sp/wiener.py
- License: BSD-3-Clause / Classification: D
- Path: src/quant_platform/research/monte_carlo.py
- Tests: test_wiener_reproducible, test_gbm_positive

## Component: Sobol
- Upstream: quantmind/d3-quant@b803c89c286f91d9955db7d0b3007cfb4cb8f939
- Original path(s): src/sobol.ts
- License: BSD-3-Clause / Classification: D
- Path: src/quant_platform/research/sobol.py
- Tests: test_sobol_first_draws

## Component: OrderBook imbalance
- Upstream: quantmind/kollector@ca09445cfc9f69299c7b52919a25c9459fd42997
- Original path(s): common/src/orders.rs
- License: MIT / Classification: D/E
- Path: src/quant_platform/market_data/orderbook.py
- Tests: test_orderbook_imbalance

## Component: Strategy DSL
- Upstream: quantmind/dynts@21ac57c648bfec402fa6b1fe569496cf098fb5e8
- Original path(s): dynts/dsl/*
- License: BSD-3-Clause / Classification: E
- Path: src/quant_platform/strategies/dsl.py
- Tests: test_dsl_safe_expression
- Known limitations: features must be precomputed; no function calls in expressions

## Component: Currency day-count helpers
- Upstream: quantmind/ccy@9d163901059e40001b5f39f7a8cbac74ed323819
- Classification: E
- Path: src/quant_platform/market_data/calendars.py

## Component: RiskEngine + ExecutionRouter
- Upstream: none (native)
- Classification: native
- Paths: src/quant_platform/risk/engine.py, src/quant_platform/execution/router.py
- Tests: test_risk_kill_switch_blocks, test_execution_research_never_live, test_live_requires_explicit_enable
