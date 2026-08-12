"""Currency / calendar helpers inspired by quantmind/ccy (conceptual / clean).

Provenance: conceptual inspiration (E) from quantmind/ccy at
9d163901059e40001b5f39f7a8cbac74ed323819 (BSD-3-Clause).
Minimal day-count and FX pair utilities — not a vendored port of ccy.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Currency:
    code: str
    decimals: int = 2


MAJOR = {
    "USD": Currency("USD", 2),
    "EUR": Currency("EUR", 2),
    "GBP": Currency("GBP", 2),
    "JPY": Currency("JPY", 0),
    "CHF": Currency("CHF", 2),
}


@dataclass(frozen=True)
class FxPair:
    base: str
    quote: str

    @property
    def name(self) -> str:
        return f"{self.base}{self.quote}"


def year_fraction_act365(start: date, end: date) -> float:
    return (end - start).days / 365.0


def year_fraction_act360(start: date, end: date) -> float:
    return (end - start).days / 360.0
