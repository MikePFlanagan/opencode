"""Exponentially weighted moving average.

Provenance: clean reimplementation (D) of EWMA math studied from
quantmind/quantflow `quantflow/ta/ewma.py` at commit
76fb818c012fcfa9ea29997ac3b1ef716f1d5c31 (BSD-3-Clause).

Uses the half-life / period parameterization:
    alpha = 1 - exp(-1 / period)
"""

from __future__ import annotations

import math


class EWMA:
    """Online EWMA smoother with optional asymmetric tau."""

    def __init__(self, period: int = 10, tau: float | None = None) -> None:
        if period < 1:
            raise ValueError("period must be >= 1")
        if tau is not None and not 0.0 <= tau <= 1.0:
            raise ValueError("tau must be in [0, 1]")
        self.period = period
        self.tau = tau
        self._alpha = 1.0 - math.exp(-1.0 / period)
        self._count = 0
        self._smoothed = 0.0

    @classmethod
    def from_half_life(cls, half_life: float, tau: float | None = None) -> EWMA:
        if half_life <= 0:
            raise ValueError("half_life must be > 0")
        period = max(1, int(round(half_life / math.log(2))))
        return cls(period=period, tau=tau)

    @classmethod
    def from_alpha(cls, alpha: float, tau: float | None = None) -> EWMA:
        if not 0.0 < alpha < 1.0:
            raise ValueError("alpha must be in (0, 1)")
        period = max(1, int(round(-1.0 / math.log1p(-alpha))))
        return cls(period=period, tau=tau)

    @property
    def alpha(self) -> float:
        return self._alpha

    @property
    def value(self) -> float | None:
        return self._smoothed if self._count > 0 else None

    def update(self, observation: float) -> float:
        self._count += 1
        if self._count == 1:
            self._smoothed = observation
            return self._smoothed
        alpha = self._alpha
        if self.tau is not None:
            alpha = alpha * self.tau if observation > self._smoothed else alpha * (1.0 - self.tau)
        self._smoothed += alpha * (observation - self._smoothed)
        return self._smoothed

    def batch(self, values: list[float]) -> list[float]:
        return [self.update(v) for v in values]
