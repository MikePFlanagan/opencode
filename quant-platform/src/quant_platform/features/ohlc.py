"""OHLC range-based variance estimators.

Provenance: clean reimplementation (D) of Parkinson / Garman-Klass / Rogers-Satchell
estimators studied from quantmind/quantflow `quantflow/ta/ohlc.py` at
76fb818c012fcfa9ea29997ac3b1ef716f1d5c31 (BSD-3-Clause).
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class Bar:
    open: float
    high: float
    low: float
    close: float


def _validate(bar: Bar) -> None:
    if min(bar.open, bar.high, bar.low, bar.close) <= 0:
        raise ValueError("OHLC prices must be positive")
    if bar.high < max(bar.open, bar.close, bar.low):
        raise ValueError("inconsistent OHLC high")
    if bar.low > min(bar.open, bar.close, bar.high):
        raise ValueError("inconsistent OHLC low")


def parkinson_variance(bar: Bar) -> float:
    """Parkinson (1980) high-low variance estimator."""
    _validate(bar)
    return (math.log(bar.high / bar.low) ** 2) / (4.0 * math.log(2.0))


def garman_klass_variance(bar: Bar) -> float:
    """Garman-Klass OHLC variance estimator."""
    _validate(bar)
    log_hl = math.log(bar.high / bar.low)
    log_co = math.log(bar.close / bar.open)
    return 0.5 * log_hl**2 - (2.0 * math.log(2.0) - 1.0) * log_co**2


def rogers_satchell_variance(bar: Bar) -> float:
    """Rogers-Satchell variance estimator (handles drift)."""
    _validate(bar)
    log_ho = math.log(bar.high / bar.open)
    log_hc = math.log(bar.high / bar.close)
    log_lo = math.log(bar.low / bar.open)
    log_lc = math.log(bar.low / bar.close)
    return log_ho * log_hc + log_lo * log_lc
