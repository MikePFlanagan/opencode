# Milestone 0 Validation

## Environment

- Host OS: Linux (cloud agent)
- Godot: 4.4.1.stable.official
- Renderer: Forward Plus
- Project path: `uptris/`
- Date recorded: 2026-08-09

## Commands

```bash
cd uptris
./scripts/ci/validate.sh
```

Equivalent:

```bash
godot --headless --path . --import --quit-after 3
godot --headless --path . res://tests/unit/test_runner.tscn
godot --headless --path . -- --uptris-smoke
```

## Results (Milestone 0)

| Check | Result |
|-------|--------|
| Project import | PASS |
| Unit tests | PASS — 13 passed, 0 failed |
| Desktop smoke / baseline | PASS — `smoke_completed success=true` |
| Exit code | `0` |

Observed smoke log highlights:

- `PlatformService os=Linux family=DESKTOP`
- `AppConfig milestone=M0 version=0.0.0-m0`
- `InputService actions_ready count=12`
- `GameDirector phase=RUNNING`
- `Bootstrap scene_ready design=1280x720`

## Interactive Checks

```bash
godot --path .
```

Expected:

- Window opens with dark electronic background
- Cyan brick preview pulses
- Status shows `Baseline OK`
- `F3` toggles debug overlay
- Move vector updates in debug overlay when WASD/arrows pressed

## Out of Scope (intentionally)

- Brick entity implementation
- Assemblies / transformations
- Any gameplay genre
- Signed store exports
