# kollector

- What: Rust order-book collector with Binance/Bitstamp gateways, gRPC service, backoff/reconnect workers.
- Maintenance: Present; specialized infra.
- License: MIT
- Useful modules: `common/src/orders.rs` L2 book, `backoff.rs`, gateway adapters
- Architecture worth studying: gateway trait + shared L2 book + gRPC fanout
- Integration: Python OrderBook imbalance/spread features (done); full collector deferred
- Rejected now: embedding Rust service into research core
