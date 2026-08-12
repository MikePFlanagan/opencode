"""Risk engine — authoritative controls no strategy may bypass."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class RiskLimits:
    max_position_size: float = 1000.0
    max_portfolio_exposure: float = 10_000.0
    max_leverage: float = 1.0
    daily_loss_limit: float = 500.0
    max_drawdown: float = 0.2
    max_symbol_exposure: float = 2000.0
    max_correlation_exposure: float = 5000.0
    max_spread_bps: float = 100.0
    stale_data_seconds: float = 30.0


@dataclass
class PortfolioState:
    positions: dict[str, float] = field(default_factory=dict)
    equity: float = 100_000.0
    peak_equity: float = 100_000.0
    daily_pnl: float = 0.0
    connected: bool = True


@dataclass(frozen=True)
class RiskDecision:
    allowed: bool
    reason: str
    clipped_size: float = 0.0


class RiskEngine:
    def __init__(self, limits: RiskLimits | None = None) -> None:
        self.limits = limits or RiskLimits()
        self.kill_switch = False

    def engage_kill_switch(self, reason: str = "manual") -> None:
        self.kill_switch = True
        self._last_kill_reason = reason

    def reset_kill_switch(self) -> None:
        self.kill_switch = False

    def check_order(
        self,
        symbol: str,
        side: str,
        size: float,
        state: PortfolioState,
        *,
        spread_bps: float | None = None,
        data_age_seconds: float | None = None,
    ) -> RiskDecision:
        if self.kill_switch:
            return RiskDecision(False, "global kill switch engaged")
        if not state.connected:
            return RiskDecision(False, "broker/exchange disconnected")
        if size <= 0:
            return RiskDecision(False, "non-positive size")
        if data_age_seconds is not None and data_age_seconds > self.limits.stale_data_seconds:
            return RiskDecision(False, "stale market data")
        if spread_bps is not None and spread_bps > self.limits.max_spread_bps:
            return RiskDecision(False, "abnormal spread")

        drawdown = 0.0 if state.peak_equity <= 0 else 1.0 - state.equity / state.peak_equity
        if drawdown >= self.limits.max_drawdown:
            return RiskDecision(False, "max drawdown breached")
        if state.daily_pnl <= -abs(self.limits.daily_loss_limit):
            return RiskDecision(False, "daily loss limit breached")

        signed = size if side.lower() == "buy" else -size
        new_pos = state.positions.get(symbol, 0.0) + signed
        if abs(new_pos) > self.limits.max_symbol_exposure:
            return RiskDecision(False, "per-symbol limit")

        exposure = sum(abs(v) for v in state.positions.values()) - abs(state.positions.get(symbol, 0.0)) + abs(new_pos)
        if exposure > self.limits.max_portfolio_exposure:
            return RiskDecision(False, "portfolio exposure limit")

        clipped = min(size, self.limits.max_position_size)
        if clipped < size:
            return RiskDecision(True, "clipped to max position size", clipped_size=clipped)
        return RiskDecision(True, "ok", clipped_size=size)
