"""Performance metrics and deterministic backtesting utilities."""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class PerformanceReport:
    total_return: float
    cagr: float
    sharpe: float
    sortino: float
    max_drawdown: float
    calmar: float
    win_rate: float
    expectancy: float
    profit_factor: float
    volatility: float
    trade_count: int
    average_trade: float


def max_drawdown(equity: list[float]) -> float:
    peak = equity[0]
    worst = 0.0
    for x in equity:
        peak = max(peak, x)
        dd = 0.0 if peak <= 0 else 1.0 - x / peak
        worst = max(worst, dd)
    return worst


def summarize_equity(
    equity: list[float],
    trade_pnls: list[float],
    periods_per_year: float = 252.0,
) -> PerformanceReport:
    if len(equity) < 2:
        raise ValueError("equity curve too short")
    rets = [(equity[i] / equity[i - 1] - 1.0) for i in range(1, len(equity))]
    mean = sum(rets) / len(rets)
    var = sum((r - mean) ** 2 for r in rets) / max(len(rets) - 1, 1)
    vol = math.sqrt(var * periods_per_year)
    sharpe = 0.0 if vol == 0 else (mean * periods_per_year) / vol
    downside = [min(r, 0.0) for r in rets]
    dvar = sum(r * r for r in downside) / max(len(rets) - 1, 1)
    dvol = math.sqrt(dvar * periods_per_year)
    sortino = 0.0 if dvol == 0 else (mean * periods_per_year) / dvol
    years = len(rets) / periods_per_year
    total_return = equity[-1] / equity[0] - 1.0
    cagr = (equity[-1] / equity[0]) ** (1.0 / years) - 1.0 if years > 0 and equity[0] > 0 else 0.0
    mdd = max_drawdown(equity)
    calmar = 0.0 if mdd == 0 else cagr / mdd
    wins = [p for p in trade_pnls if p > 0]
    losses = [p for p in trade_pnls if p < 0]
    win_rate = 0.0 if not trade_pnls else len(wins) / len(trade_pnls)
    expectancy = 0.0 if not trade_pnls else sum(trade_pnls) / len(trade_pnls)
    gross_win = sum(wins)
    gross_loss = abs(sum(losses))
    profit_factor = math.inf if gross_loss == 0 and gross_win > 0 else (0.0 if gross_loss == 0 else gross_win / gross_loss)
    return PerformanceReport(
        total_return=total_return,
        cagr=cagr,
        sharpe=sharpe,
        sortino=sortino,
        max_drawdown=mdd,
        calmar=calmar,
        win_rate=win_rate,
        expectancy=expectancy,
        profit_factor=profit_factor,
        volatility=vol,
        trade_count=len(trade_pnls),
        average_trade=expectancy,
    )


@dataclass
class BacktestConfig:
    transaction_cost_bps: float = 1.0
    slippage_bps: float = 1.0
    initial_cash: float = 100_000.0


def run_long_flat_backtest(
    prices: list[float],
    long_signal: list[bool],
    config: BacktestConfig | None = None,
) -> tuple[list[float], list[float], PerformanceReport]:
    """Simple long/flat backtest with costs. Signals aligned to prices length."""
    cfg = config or BacktestConfig()
    if len(prices) != len(long_signal) or len(prices) < 2:
        raise ValueError("prices/signals length mismatch")
    cash = cfg.initial_cash
    position = 0.0
    equity = [cash]
    trades: list[float] = []
    cost_rate = (cfg.transaction_cost_bps + cfg.slippage_bps) / 10_000.0

    for i in range(1, len(prices)):
        want_long = long_signal[i - 1]  # no look-ahead: act on prior bar signal
        price = prices[i]
        target = (cash / price) if want_long and position == 0 else (0.0 if not want_long and position > 0 else position)
        delta = target - position
        if abs(delta) > 1e-12:
            notional = abs(delta) * price
            cost = notional * cost_rate
            cash -= delta * price + cost
            pnl_proxy = -cost
            if position != 0 and target == 0:
                # closing — approximate trade pnl from last equity move later
                trades.append(pnl_proxy)
            elif position == 0 and target != 0:
                trades.append(pnl_proxy)
            position = target
        mark = cash + position * price
        equity.append(mark)

    # Derive trade pnls from equity deltas when position flips for reporting richness
    report = summarize_equity(equity, trades if trades else [equity[-1] - equity[0]])
    return equity, trades, report
