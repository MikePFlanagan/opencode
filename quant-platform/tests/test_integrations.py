"""Unit tests for QuantMind-informed integrations."""

from __future__ import annotations

import math

import pytest

from quant_platform.execution.router import ExecutionMode, ExecutionRouter, LiveBroker, OrderRequest
from quant_platform.features import EWMA, LocalLevelKalman, Bar, parkinson_variance, log_returns, realized_volatility
from quant_platform.market_data.orderbook import OrderBook
from quant_platform.regimes.engine import build_regime, TrendRegime, VolatilityRegime
from quant_platform.research.backtest import run_long_flat_backtest, summarize_equity
from quant_platform.research.monte_carlo import gbm_paths, sobol_parameter_grid, wiener_paths
from quant_platform.research.options import black_scholes_price, black_forward_price
from quant_platform.research.sobol import Sobol
from quant_platform.risk.engine import PortfolioState, RiskEngine
from quant_platform.strategies.dsl import StrategyRule, UnsafeExpressionError, evaluate


def test_ewma_converges_toward_level():
    ewma = EWMA(period=5)
    values = ewma.batch([1, 1, 1, 1, 1, 1])
    assert values[-1] == pytest.approx(1.0)
    assert 0 < ewma.alpha < 1


def test_ewma_from_half_life():
    ewma = EWMA.from_half_life(math.log(2) * 10)
    assert ewma.period == 10


def test_kalman_tracks_step():
    kf = LocalLevelKalman(process_var=0.01, observation_var=0.1)
    series = [0.0] * 20 + [10.0] * 20
    filtered = kf.batch(series)
    assert filtered[-1] == pytest.approx(10.0, abs=1.0)


def test_parkinson_positive():
    bar = Bar(open=100, high=102, low=99, close=101)
    assert parkinson_variance(bar) > 0


def test_orderbook_imbalance():
    book = OrderBook("BTCUSD")
    book.bids.set(100, 5)
    book.bids.set(99, 5)
    book.asks.set(101, 2)
    book.asks.set(102, 2)
    imb = book.imbalance(2)
    assert imb is not None and imb > 0
    assert book.spread() == pytest.approx(1.0)


def test_dsl_safe_expression():
    assert evaluate("ema_fast > ema_slow and zscore < -2", {"ema_fast": 3, "ema_slow": 2, "zscore": -3})
    with pytest.raises(UnsafeExpressionError):
        evaluate("__import__('os').system('ls')", {})
    with pytest.raises(UnsafeExpressionError):
        evaluate("ema_fast > ema_slow", {})  # missing feature


def test_strategy_rule():
    rule = StrategyRule("mr", long_when="zscore < -2", short_when="zscore > 2")
    sig = rule.evaluate({"zscore": -2.5})
    assert sig.long and not sig.short


def test_risk_kill_switch_blocks():
    risk = RiskEngine()
    state = PortfolioState()
    risk.engage_kill_switch("test")
    d = risk.check_order("AAPL", "buy", 10, state)
    assert not d.allowed


def test_execution_research_never_live():
    router = ExecutionRouter(mode=ExecutionMode.RESEARCH)
    fill = router.submit(OrderRequest("AAPL", "buy", 1, "t"), 100.0, PortfolioState())
    assert fill.mode is ExecutionMode.RESEARCH
    assert fill.status == "simulated"


def test_live_requires_explicit_enable():
    router = ExecutionRouter(mode=ExecutionMode.LIVE, live=LiveBroker(enabled=False))
    with pytest.raises(RuntimeError):
        router.submit(OrderRequest("AAPL", "buy", 1, "t"), 100.0, PortfolioState())


def test_sobol_first_draws():
    s = Sobol(2)
    assert s.next() == [0.0, 0.0]
    second = s.next()
    assert second[0] == pytest.approx(0.5)
    assert second[1] == pytest.approx(0.5)


def test_black_scholes_call_atm_positive():
    price = black_scholes_price(100, 100, 1.0, 0.0, 0.2, call=True)
    assert price > 0
    # put-call parity with r=0: C - P = 0 for ATM forward
    put = black_scholes_price(100, 100, 1.0, 0.0, 0.2, call=False)
    assert price == pytest.approx(put, rel=1e-9)


def test_black_forward_atm():
    # k=0 ATM forward call price ≈ 0.5 * sigma * sqrt(2/pi * t) roughly
    px = black_forward_price(0.0, 0.2, 1.0, 1.0)
    assert 0.05 < px < 0.12


def test_wiener_reproducible():
    a = wiener_paths(5, seed=1)
    b = wiener_paths(5, seed=1)
    assert a.paths == b.paths
    assert a.paths[0][0] == 0.0


def test_gbm_positive():
    paths = gbm_paths(3, spot=100, steps=50, seed=2)
    assert all(all(x > 0 for x in p) for p in paths.paths)


def test_sobol_grid():
    grid = sobol_parameter_grid([(0.0, 1.0), (10.0, 20.0)], 4)
    assert len(grid) == 4
    assert all(0 <= row[0] <= 1 and 10 <= row[1] <= 20 for row in grid)


def test_backtest_no_lookahead_and_metrics():
    prices = [100 + i * 0.1 for i in range(100)]
    signal = [False] * 50 + [True] * 50
    equity, trades, report = run_long_flat_backtest(prices, signal)
    assert len(equity) == len(prices)
    assert report.trade_count >= 1
    assert 0 <= report.max_drawdown <= 1


def test_regime_classification():
    regime = build_regime(kalman_slope=0.5, realized_vol=0.3, vol_low=0.1, vol_high=0.4, spread_bps=5, imbalance=0.1)
    assert regime.trend is TrendRegime.UP
    assert regime.volatility is VolatilityRegime.NORMAL


def test_returns_features():
    rets = log_returns([100, 110, 121])
    assert rets[0] == pytest.approx(math.log(1.1))
    vol = realized_volatility(rets, annualization=1.0)
    assert vol >= 0
