"""1-D local-level Kalman filter for trend estimation.

Provenance: clean reimplementation (D) of the linear-Gaussian Kalman predict/update
equations studied from quantmind/quantflow `quantflow/ta/kalman.py` at
76fb818c012fcfa9ea29997ac3b1ef716f1d5c31 (BSD-3-Clause).

This is intentionally a minimal online scalar filter suitable for feature pipelines,
not a port of QuantFlow's full state-space / UKF stack.
"""

from __future__ import annotations

import math


class LocalLevelKalman:
    """Scalar random-walk level with Gaussian observation noise."""

    def __init__(
        self,
        process_var: float = 1e-4,
        observation_var: float = 1e-2,
        initial_mean: float = 0.0,
        initial_var: float = 1.0,
    ) -> None:
        if process_var < 0 or observation_var <= 0 or initial_var <= 0:
            raise ValueError("invalid variance parameters")
        self.process_var = process_var
        self.observation_var = observation_var
        self.mean = initial_mean
        self.var = initial_var
        self._initialized = False

    @property
    def trend(self) -> float:
        return self.mean

    def update(self, observation: float) -> float:
        if not self._initialized:
            self.mean = observation
            self._initialized = True
            return self.mean

        # Predict
        pred_mean = self.mean
        pred_var = self.var + self.process_var

        # Update
        innov = observation - pred_mean
        innov_var = pred_var + self.observation_var
        gain = pred_var / innov_var
        self.mean = pred_mean + gain * innov
        self.var = (1.0 - gain) * pred_var
        return self.mean

    def batch(self, values: list[float]) -> list[float]:
        return [self.update(v) for v in values]

    def log_likelihood_step(self, observation: float) -> float:
        """Return Gaussian innovation log-likelihood contribution, then update."""
        if not self._initialized:
            self.update(observation)
            return 0.0
        pred_var = self.var + self.process_var
        innov = observation - self.mean
        innov_var = pred_var + self.observation_var
        ll = -0.5 * (math.log(2.0 * math.pi * innov_var) + (innov * innov) / innov_var)
        self.update(observation)
        return ll
