#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

GODOT_BIN="${GODOT_BIN:-godot}"

if ! command -v "$GODOT_BIN" >/dev/null 2>&1; then
  echo "error: Godot binary not found (set GODOT_BIN)" >&2
  exit 1
fi

echo "==> UPTRIS validate: $($GODOT_BIN --version)"
echo "==> Import project"
"$GODOT_BIN" --headless --path "$ROOT" --import --quit-after 3

echo "==> Unit tests"
"$GODOT_BIN" --headless --path "$ROOT" res://tests/unit/test_runner.tscn

echo "==> Desktop smoke"
"$GODOT_BIN" --headless --path "$ROOT" -- --uptris-smoke

echo "==> Milestone 0 validation complete"
