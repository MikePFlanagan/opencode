"""Wiener / GBM path simulation and Monte Carlo helpers.

Provenance: clean reimplementation (D) of Wiener sampling ideas from
quantmind/quantflow `quantflow/sp/wiener.py` at
76fb818c012fcfa9ea29997ac3b1ef716f1d5c31 (BSD-3-Clause).
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

from quant_platform.research.sobol import Sobol


@dataclass
class PathResult:
    times: list[float]
    paths: list[list[float]]  # shape: n_paths x (steps+1)


def wiener_paths(
    n_paths: int,
    time_horizon: float = 1.0,
    steps: int = 100,
    sigma: float = 1.0,
    seed: int | None = 0,
) -> PathResult:
    rng = random.Random(seed)
    dt = time_horizon / steps
    sdt = sigma * math.sqrt(dt)
    times = [i * dt for i in range(steps + 1)]
    paths: list[list[float]] = []
    for _ in range(n_paths):
        path = [0.0]
        for _t in range(steps):
            path.append(path[-1] + sdt * rng.gauss(0.0, 1.0))
        paths.append(path)
    return PathResult(times=times, paths=paths)


def gbm_paths(
    n_paths: int,
    spot: float = 100.0,
    mu: float = 0.0,
    sigma: float = 0.2,
    time_horizon: float = 1.0,
    steps: int = 100,
    seed: int | None = 0,
) -> PathResult:
    rng = random.Random(seed)
    dt = time_horizon / steps
    times = [i * dt for i in range(steps + 1)]
    paths: list[list[float]] = []
    drift = (mu - 0.5 * sigma * sigma) * dt
    vol = sigma * math.sqrt(dt)
    for _ in range(n_paths):
        path = [spot]
        for _t in range(steps):
            path.append(path[-1] * math.exp(drift + vol * rng.gauss(0.0, 1.0)))
        paths.append(path)
    return PathResult(times=times, paths=paths)


def monte_carlo_mean_terminal(paths: PathResult) -> float:
    terminals = [p[-1] for p in paths.paths]
    return sum(terminals) / len(terminals)


def sobol_parameter_grid(bounds: list[tuple[float, float]], n: int) -> list[list[float]]:
    """Map Sobol unit cube draws into [low, high] parameter bounds."""
    sobol = Sobol(len(bounds))
    draws = sobol.generate(n)
    grid: list[list[float]] = []
    for u in draws:
        grid.append([low + (high - low) * x for x, (low, high) in zip(u, bounds)])
    return grid
