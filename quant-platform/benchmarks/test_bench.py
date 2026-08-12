"""Micro-benchmarks for core numerical routines."""

from __future__ import annotations

from quant_platform.features import EWMA, LocalLevelKalman
from quant_platform.research.monte_carlo import gbm_paths
from quant_platform.research.sobol import Sobol


def test_ewma_benchmark(benchmark):
    series = [float(i % 50) for i in range(5000)]

    def run():
        return EWMA(period=20).batch(series)

    out = benchmark(run)
    assert len(out) == 5000


def test_kalman_benchmark(benchmark):
    series = [float(i % 50) for i in range(5000)]

    def run():
        return LocalLevelKalman().batch(series)

    out = benchmark(run)
    assert len(out) == 5000


def test_sobol_benchmark(benchmark):
    def run():
        return Sobol(5).generate(2000)

    out = benchmark(run)
    assert len(out) == 2000


def test_gbm_benchmark(benchmark):
    out = benchmark(lambda: gbm_paths(50, steps=100, seed=0))
    assert len(out.paths) == 50
