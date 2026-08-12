"""Execution boundary: RESEARCH / PAPER / LIVE.

Research and paper paths never submit live orders. Live requires explicit opt-in.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol

from quant_platform.risk.engine import PortfolioState, RiskEngine


class ExecutionMode(str, Enum):
    RESEARCH = "research"
    PAPER = "paper"
    LIVE = "live"


@dataclass(frozen=True)
class OrderRequest:
    symbol: str
    side: str
    size: float
    strategy: str


@dataclass(frozen=True)
class Fill:
    symbol: str
    side: str
    size: float
    price: float
    mode: ExecutionMode
    status: str


class BrokerGateway(Protocol):
    def submit(self, order: OrderRequest, price: float) -> Fill: ...


@dataclass
class PaperBroker:
    fills: list[Fill] = field(default_factory=list)

    def submit(self, order: OrderRequest, price: float) -> Fill:
        fill = Fill(order.symbol, order.side, order.size, price, ExecutionMode.PAPER, "filled")
        self.fills.append(fill)
        return fill


@dataclass
class LiveBroker:
    """Explicit live gateway. Refuses unless enabled=True at construction."""

    enabled: bool = False
    fills: list[Fill] = field(default_factory=list)

    def submit(self, order: OrderRequest, price: float) -> Fill:
        if not self.enabled:
            raise RuntimeError("LIVE broker is disabled; refusing order")
        fill = Fill(order.symbol, order.side, order.size, price, ExecutionMode.LIVE, "submitted")
        self.fills.append(fill)
        return fill


class ExecutionRouter:
    def __init__(
        self,
        mode: ExecutionMode = ExecutionMode.PAPER,
        risk: RiskEngine | None = None,
        paper: PaperBroker | None = None,
        live: LiveBroker | None = None,
    ) -> None:
        self.mode = mode
        self.risk = risk or RiskEngine()
        self.paper = paper or PaperBroker()
        self.live = live or LiveBroker(enabled=False)

    def submit(
        self,
        order: OrderRequest,
        price: float,
        state: PortfolioState,
        *,
        spread_bps: float | None = None,
        data_age_seconds: float | None = None,
    ) -> Fill:
        if self.mode is ExecutionMode.RESEARCH:
            return Fill(order.symbol, order.side, order.size, price, ExecutionMode.RESEARCH, "simulated")

        decision = self.risk.check_order(
            order.symbol,
            order.side,
            order.size,
            state,
            spread_bps=spread_bps,
            data_age_seconds=data_age_seconds,
        )
        if not decision.allowed:
            return Fill(order.symbol, order.side, 0.0, price, self.mode, f"rejected:{decision.reason}")

        sized = OrderRequest(order.symbol, order.side, decision.clipped_size, order.strategy)
        if self.mode is ExecutionMode.PAPER:
            return self.paper.submit(sized, price)
        if self.mode is ExecutionMode.LIVE:
            if not self.live.enabled:
                raise RuntimeError("LIVE mode requested but live broker is not explicitly enabled")
            return self.live.submit(sized, price)
        raise RuntimeError(f"unknown mode {self.mode}")
