# Quant Platform

Greenfield quantitative research and trading platform.

This repository path was created because no existing quant trading application was
found under `~/Projects/01-active/` in the Cloud Agent environment. The attached
workspace was OpenCode (AI coding agent), not a trading system.

## Architecture

```
MARKET DATA → NORMALIZATION → FEATURE ENGINE → REGIME ENGINE
    → ALPHA / STRATEGY → PORTFOLIO → RISK → EXECUTION → BROKER
```

Supporting: Research Engine, Backtester, Walk-Forward, Monte Carlo, Parameter Optimizer.

## Execution modes

- `RESEARCH` — simulation only
- `PAPER` — default for new strategies
- `LIVE` — requires explicit configuration; never default

## Provenance

See `docs/upstream/` and `QUANTMIND-INTEGRATION-REPORT.md` for QuantMind archival,
license audit, and integration ledger.
