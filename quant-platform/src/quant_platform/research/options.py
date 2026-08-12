"""Black-Scholes / Black forward pricing utilities.

Provenance: clean reimplementation (D) of forward-space Black formulas studied from
quantmind/quantflow `quantflow/options/bs.py` at
76fb818c012fcfa9ea29997ac3b1ef716f1d5c31 (BSD-3-Clause).

Uses the standard normal CDF via the math.erf approximation (no SciPy dependency).
"""

from __future__ import annotations

import math


def norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def norm_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def black_forward_price(log_moneyness: float, sigma: float, ttm: float, call_put: float = 1.0) -> float:
    """Undiscounted Black price in forward terms.

    log_moneyness k = log(K/F); call_put = +1 call / -1 put.
    """
    if ttm <= 0 or sigma <= 0:
        intrinsic = max(call_put * (1.0 - math.exp(log_moneyness)), 0.0)
        return intrinsic
    sig = sigma * math.sqrt(ttm)
    d1 = (-log_moneyness + 0.5 * sigma * sigma * ttm) / sig
    d2 = d1 - sig
    s = call_put
    return s * norm_cdf(s * d1) - s * math.exp(log_moneyness) * norm_cdf(s * d2)


def black_scholes_price(
    spot: float,
    strike: float,
    ttm: float,
    rate: float,
    vol: float,
    call: bool = True,
) -> float:
    if spot <= 0 or strike <= 0:
        raise ValueError("spot and strike must be positive")
    forward = spot * math.exp(rate * ttm)
    discount = math.exp(-rate * ttm)
    k = math.log(strike / forward)
    return discount * forward * black_forward_price(k, vol, ttm, 1.0 if call else -1.0)


def black_vega_forward(log_moneyness: float, sigma: float, ttm: float) -> float:
    if ttm <= 0 or sigma <= 0:
        return 0.0
    sig = sigma * math.sqrt(ttm)
    d1 = (-log_moneyness + 0.5 * sigma * sigma * ttm) / sig
    return norm_pdf(d1) * math.sqrt(ttm)
