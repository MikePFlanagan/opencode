"""Return and volatility feature helpers (deterministic, pure)."""

from __future__ import annotations

import math


def simple_returns(prices: list[float]) -> list[float]:
    if len(prices) < 2:
        return []
    out: list[float] = []
    for i in range(1, len(prices)):
        prev = prices[i - 1]
        if prev == 0:
            raise ValueError("zero price in series")
        out.append(prices[i] / prev - 1.0)
    return out


def log_returns(prices: list[float]) -> list[float]:
    if len(prices) < 2:
        return []
    out: list[float] = []
    for i in range(1, len(prices)):
        prev = prices[i - 1]
        if prev <= 0 or prices[i] <= 0:
            raise ValueError("non-positive price in series")
        out.append(math.log(prices[i] / prev))
    return out


def realized_volatility(returns: list[float], annualization: float = 252.0) -> float:
    if len(returns) < 2:
        return 0.0
    mean = sum(returns) / len(returns)
    var = sum((r - mean) ** 2 for r in returns) / (len(returns) - 1)
    return math.sqrt(var * annualization)


def rolling_zscore(values: list[float], window: int) -> list[float | None]:
    if window < 2:
        raise ValueError("window must be >= 2")
    out: list[float | None] = []
    for i in range(len(values)):
        if i + 1 < window:
            out.append(None)
            continue
        chunk = values[i + 1 - window : i + 1]
        mean = sum(chunk) / window
        var = sum((x - mean) ** 2 for x in chunk) / (window - 1)
        std = math.sqrt(var)
        out.append(0.0 if std == 0 else (values[i] - mean) / std)
    return out
