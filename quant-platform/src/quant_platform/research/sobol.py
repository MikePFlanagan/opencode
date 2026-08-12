"""Sobol low-discrepancy sequence for parameter exploration.

Provenance: clean reimplementation (D) of the direction-number algorithm studied from
quantmind/d3-quant `src/sobol.ts` at b803c89c286f91d9955db7d0b3007cfb4cb8f939
(BSD-3-Clause). Coefficient table truncated to the same published dimensions.
"""

from __future__ import annotations

BITS = 52
SCALE = 2 << 51

# Joe & Kuo direction numbers (dimension, s, a, m_i...) — same published table as d3-quant
_COEFFICIENTS = [
    (2, 1, 0, [1]),
    (3, 2, 1, [1, 3]),
    (4, 3, 1, [1, 3, 1]),
    (5, 3, 2, [1, 1, 1]),
    (6, 4, 1, [1, 1, 3, 3]),
    (7, 4, 4, [1, 3, 5, 13]),
    (8, 5, 2, [1, 1, 5, 5, 17]),
    (9, 5, 4, [1, 1, 5, 5, 5]),
    (10, 5, 7, [1, 1, 7, 11, 1]),
]


class Sobol:
    def __init__(self, dimension: int) -> None:
        if dimension < 1 or dimension > len(_COEFFICIENTS) + 1:
            raise ValueError(f"dimension must be in 1..{len(_COEFFICIENTS) + 1}")
        self.dimension = dimension
        self.count = 0
        self._x = [0] * dimension
        self._direction = [[0] * (BITS + 1) for _ in range(dimension)]

        for i in range(1, BITS + 1):
            self._direction[0][i] = 1 << (BITS - i)

        for d in range(1, dimension):
            s, a, m = _COEFFICIENTS[d - 1][1], _COEFFICIENTS[d - 1][2], _COEFFICIENTS[d - 1][3]
            m_vals = [0] + list(m)
            for i in range(1, s + 1):
                self._direction[d][i] = m_vals[i] << (BITS - i)
            for i in range(s + 1, BITS + 1):
                self._direction[d][i] = self._direction[d][i - s] ^ (self._direction[d][i - s] >> s)
                for k in range(1, s):
                    self._direction[d][i] ^= ((a >> (s - 1 - k)) & 1) * self._direction[d][i - k]

    def next(self) -> list[float]:
        if self.count == 0:
            self.count += 1
            return [0.0] * self.dimension
        c = 1
        value = self.count - 1
        while value & 1:
            value >>= 1
            c += 1
        out: list[float] = []
        for i in range(self.dimension):
            self._x[i] ^= self._direction[i][c]
            out.append(self._x[i] / SCALE)
        self.count += 1
        return out

    def generate(self, n: int) -> list[list[float]]:
        return [self.next() for _ in range(n)]
