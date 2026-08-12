"""L2 order book imbalance and spread analytics.

Provenance: conceptual inspiration (E) / clean reimplementation (D) of L2 book
structure studied from quantmind/kollector `common/src/orders.rs` at
ca09445cfc9f69299c7b52919a25c9459fd42997 (MIT).

No Rust source was copied; algorithms are expressed natively for research features.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class BookSide:
    """Price -> size map. Bids are best-first descending; asks ascending."""

    levels: dict[float, float] = field(default_factory=dict)
    descending: bool = False

    def set(self, price: float, size: float) -> None:
        if size <= 0:
            self.levels.pop(price, None)
            return
        self.levels[price] = size

    def best(self) -> tuple[float, float] | None:
        if not self.levels:
            return None
        price = max(self.levels) if self.descending else min(self.levels)
        return price, self.levels[price]

    def depth_notional(self, max_levels: int | None = None) -> float:
        items = sorted(self.levels.items(), reverse=self.descending)
        if max_levels is not None:
            items = items[:max_levels]
        return sum(price * size for price, size in items)

    def depth_size(self, max_levels: int | None = None) -> float:
        items = sorted(self.levels.items(), reverse=self.descending)
        if max_levels is not None:
            items = items[:max_levels]
        return sum(size for _, size in items)


@dataclass
class OrderBook:
    symbol: str
    bids: BookSide = field(default_factory=lambda: BookSide(descending=True))
    asks: BookSide = field(default_factory=lambda: BookSide(descending=False))

    def mid(self) -> float | None:
        bid = self.bids.best()
        ask = self.asks.best()
        if bid is None or ask is None:
            return None
        return 0.5 * (bid[0] + ask[0])

    def spread(self) -> float | None:
        bid = self.bids.best()
        ask = self.asks.best()
        if bid is None or ask is None:
            return None
        return ask[0] - bid[0]

    def imbalance(self, levels: int = 5) -> float | None:
        """Signed size imbalance in [-1, 1]: (bid - ask) / (bid + ask)."""
        bid_sz = self.bids.depth_size(levels)
        ask_sz = self.asks.depth_size(levels)
        total = bid_sz + ask_sz
        if total == 0:
            return None
        return (bid_sz - ask_sz) / total

    def microprice(self) -> float | None:
        bid = self.bids.best()
        ask = self.asks.best()
        if bid is None or ask is None:
            return None
        bid_p, bid_sz = bid
        ask_p, ask_sz = ask
        total = bid_sz + ask_sz
        if total == 0:
            return None
        return (ask_p * bid_sz + bid_p * ask_sz) / total
