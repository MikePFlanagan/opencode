"""Regime classification from feature streams."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class TrendRegime(str, Enum):
    UP = "up"
    DOWN = "down"
    SIDEWAYS = "sideways"


class VolatilityRegime(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


class LiquidityRegime(str, Enum):
    AMPLE = "ample"
    TIGHT = "tight"
    STRESSED = "stressed"


@dataclass(frozen=True)
class MarketRegime:
    trend: TrendRegime
    volatility: VolatilityRegime
    liquidity: LiquidityRegime
    correlation: str = "normal"
    macro: str = "neutral"


def classify_trend(kalman_slope: float, threshold: float = 0.0) -> TrendRegime:
    if kalman_slope > threshold:
        return TrendRegime.UP
    if kalman_slope < -threshold:
        return TrendRegime.DOWN
    return TrendRegime.SIDEWAYS


def classify_volatility(realized_vol: float, low: float, high: float) -> VolatilityRegime:
    if realized_vol < low:
        return VolatilityRegime.LOW
    if realized_vol > high:
        return VolatilityRegime.HIGH
    return VolatilityRegime.NORMAL


def classify_liquidity(spread_bps: float | None, imbalance: float | None) -> LiquidityRegime:
    if spread_bps is None:
        return LiquidityRegime.STRESSED
    if spread_bps > 50:
        return LiquidityRegime.STRESSED
    if spread_bps > 15 or (imbalance is not None and abs(imbalance) > 0.8):
        return LiquidityRegime.TIGHT
    return LiquidityRegime.AMPLE


def build_regime(
    kalman_slope: float,
    realized_vol: float,
    vol_low: float,
    vol_high: float,
    spread_bps: float | None = None,
    imbalance: float | None = None,
) -> MarketRegime:
    return MarketRegime(
        trend=classify_trend(kalman_slope),
        volatility=classify_volatility(realized_vol, vol_low, vol_high),
        liquidity=classify_liquidity(spread_bps, imbalance),
    )
