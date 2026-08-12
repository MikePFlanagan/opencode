"""Safe declarative strategy DSL.

Provenance: conceptual inspiration (E) from quantmind/dynts DSL at
21ac57c648bfec402fa6b1fe569496cf098fb5e8 (BSD-3-Clause).

NO arbitrary code execution. Expressions are parsed into an AST of allow-listed
operators and feature references only.
"""

from __future__ import annotations

import ast
import operator
from dataclasses import dataclass
from typing import Callable


ALLOWED_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
}
ALLOWED_CMPOPS = {
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
}
ALLOWED_BOOLOPS = {
    ast.And: all,
    ast.Or: any,
}
ALLOWED_UNARY = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
    ast.Not: operator.not_,
}


@dataclass(frozen=True)
class Signal:
    name: str
    long: bool
    short: bool


class UnsafeExpressionError(ValueError):
    pass


def _eval_node(node: ast.AST, context: dict[str, float]) -> float | bool:
    if isinstance(node, ast.Expression):
        return _eval_node(node.body, context)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float, bool)):
        return node.value
    if isinstance(node, ast.Name):
        if node.id not in context:
            raise UnsafeExpressionError(f"unknown feature: {node.id}")
        return context[node.id]
    if isinstance(node, ast.UnaryOp) and type(node.op) in ALLOWED_UNARY:
        return ALLOWED_UNARY[type(node.op)](_eval_node(node.operand, context))
    if isinstance(node, ast.BinOp) and type(node.op) in ALLOWED_BINOPS:
        return ALLOWED_BINOPS[type(node.op)](
            _eval_node(node.left, context),
            _eval_node(node.right, context),
        )
    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, context)
        for op, comparator in zip(node.ops, node.comparators):
            if type(op) not in ALLOWED_CMPOPS:
                raise UnsafeExpressionError(f"disallowed compare: {type(op).__name__}")
            right = _eval_node(comparator, context)
            if not ALLOWED_CMPOPS[type(op)](left, right):
                return False
            left = right
        return True
    if isinstance(node, ast.BoolOp) and type(node.op) in ALLOWED_BOOLOPS:
        values = [_eval_node(v, context) for v in node.values]
        return ALLOWED_BOOLOPS[type(node.op)](bool(v) for v in values)
    if isinstance(node, ast.Call):
        raise UnsafeExpressionError("function calls are not allowed; precompute features")
    if isinstance(node, ast.Attribute):
        raise UnsafeExpressionError("attribute access is not allowed")
    raise UnsafeExpressionError(f"disallowed syntax: {type(node).__name__}")


def evaluate(expression: str, features: dict[str, float]) -> bool:
    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError as exc:
        raise UnsafeExpressionError(str(exc)) from exc
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom, ast.Lambda, ast.ListComp, ast.DictComp, ast.SetComp, ast.GeneratorExp, ast.Await, ast.Yield)):
            raise UnsafeExpressionError("disallowed syntax construct")
    result = _eval_node(tree, features)
    return bool(result)


@dataclass
class StrategyRule:
    name: str
    long_when: str
    short_when: str = "False"

    def evaluate(self, features: dict[str, float]) -> Signal:
        return Signal(
            name=self.name,
            long=evaluate(self.long_when, features),
            short=evaluate(self.short_when, features),
        )
