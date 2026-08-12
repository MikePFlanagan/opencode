# LICENSE-AUDIT — QuantMind

Classification key:
- **A** direct dependency
- **B** vendored component
- **C** adapted implementation
- **D** clean reimplementation
- **E** conceptual inspiration only
- **F** reject

| Repository | SPDX / observed | Classification | Notes |
|---|---|---|---|
| quantflow | BSD-3-Clause | A/D | Prefer native clean reimplementations for core math; A if later adding as optional dep |
| kollector | MIT | D/E | Rust L2 collector — concepts + clean Python book features |
| ccy | BSD-3-Clause | E/D | Day-count / FX pair helpers only |
| dynts | BSD-3-Clause | E | DSL inspiration; no PLY/eval port |
| d3-quant | BSD-3-Clause | D | Sobol reimplementation |
| aio-fluid | BSD-3-Clause | E | Scheduler patterns; local workers first |
| qmlib | UNKNOWN + GPL headers | F | Contains QuantLib GPL headers — do not copy |
| pulsar* | BSD-3-Clause | F | Obsolete asyncio stack |
| lux / giotto / d3-view* | BSD-3-Clause | F | Obsolete UI tooling |
| jflib | BSD-3-Clause | F | 2010 C++ archive |
| metablock-* | varies | F | Unrelated infra for this mission |
| awesome-* | none listed | F | Curated lists only |
| pyslink / benchmarking / startup | BSD / unknown | F | Tooling noise |

## Gate rules applied

1. No code copied when license unclear.
2. qmlib rejected for source reuse due to GPL contamination risk.
3. Prefer D/E over B unless a tiny attribution-preserving vendor is clearly superior.
4. Required notices recorded in `THIRD_PARTY_NOTICES.md`.
