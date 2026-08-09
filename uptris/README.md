# UPTRIS

**ONE BRICK. EVERY GAME.**

UPTRIS is a continuously transforming arcade adventure where characters, enemies, environments, weapons, UI, puzzles, vehicles, bosses, and transitions are all constructed from living electronic bricks.

This repository folder contains the Godot 4 production project for UPTRIS.

## Current Milestone

**Milestone 0 — Project Genesis**

Foundation only. No gameplay genres yet.

Delivered:

- Godot 4.4 project configuration
- Layered directory architecture (`Core`, `Brick`, `Assembly`, `Transform`, `Genre`, `GameDirector`, …)
- Autoload service baseline (logging, platform, config, input, events, debug, GameDirector)
- Abstract input action map (keyboard + gamepad)
- Resolution / scaling strategy (1280×720 design, `canvas_items` + expand)
- Desktop bootstrap scene
- Headless unit tests + smoke validation script
- Architecture and coding standards docs
- Export preset template for macOS, Windows, Android, iOS

## Requirements

- [Godot 4.4.x](https://godotengine.org/download) (Forward Plus)
- Optional: export templates for target platforms

## Quick Start

```bash
cd uptris
godot --path .
```

Headless validation:

```bash
./scripts/ci/validate.sh
```

Or stepwise:

```bash
godot --headless --path . --import --quit-after 3
godot --headless --path . res://tests/unit/test_runner.tscn
godot --headless --path . -- --uptris-smoke
```

## Project Layout

```
uptris/
  project.godot
  scenes/bootstrap/     # Milestone 0 desktop baseline
  scenes/tests/         # Smoke helpers
  src/
    Core/               # Logging, platform, config, events, actions
    Brick/              # Milestone 1+
    Assembly/           # Milestone 2+
    Transform/          # Milestone 3+
    Genre/              # Genre module contract (no genres yet)
    GameDirector/       # Central orchestration
    Input/              # Abstract input service
    Audio/              # Audio facade stub
    Save/               # Save facade stub
    UI/
    Debug/
    Content/
  content/              # Data-driven assets (materials, locales, …)
  docs/                 # Architecture + standards
  tests/unit/           # Deterministic headless tests
  scripts/ci/           # Validation entrypoints
  export/               # Export preset templates
```

## Platforms

Primary targets:

- macOS
- Windows
- iPhone / iPad (iOS / iPadOS)
- Android

Later: Steam Deck, consoles.

Mobile performance budgets are represented early via `PlatformService` / `PlatformKind`.

## Agent Rules

AI coding agents must obey the UPTRIS build rules:

1. Never expand scope beyond the current milestone.
2. Inspect existing architecture before modifying it.
3. Prefer extending shared systems over duplicating functionality.
4. Never create genre-to-genre hard dependencies.
5. Preserve cross-platform compatibility.
6. Use data-driven configuration.
7. Profile before optimizing.
8. Maintain tests around deterministic logic.
9. Do not silently rewrite working systems.
10. Document architectural decisions.
11. Finish and validate each milestone before beginning another.
12. Keep the working tree understandable.
13. Commit at meaningful milestone boundaries.
14. Never imitate copyrighted assets or code from inspiration games.
15. The Brick Engine remains the source of truth.

## Next Milestone

**Milestone 1 — One Brick**

Build the smallest production-quality Brick Engine entity with pooling, materials, collision, and a stress-test scene.

Do not start Milestone 1 until Milestone 0 is accepted.

## License

Proprietary — all rights reserved unless otherwise stated by the project owner.
