# UPTRIS Coding Standards

Godot 4.x / GDScript.

## Principles

- Prefer one clear function over premature helpers.
- Avoid `any`-equivalent loosely typed Dictionaries at module boundaries when a typed resource or class exists.
- Prefer early returns over deep `else` trees.
- Prefer composition through services over giant singleton god-objects (GameDirector orchestrates; it does not own genre logic).
- Keep genre modules decoupled.
- Data-drive content (materials, assemblies, transformations, levels) wherever practical.

## Style

- Indent with tabs (see `.editorconfig`).
- Files: `snake_case.gd`
- Classes: `PascalCase` via `class_name` only when referenced across modules
- Autoload names: `PascalCase` matching service identity (`InputService`, `GameDirector`)
- Signals: `snake_case` past-tense or noun events (`action_pressed`, `milestone_ready`)
- Private members: leading underscore (`_history`)

## Architecture Rules

1. Do not instantiate genres from other genres.
2. Do not bypass Brick Engine ownership of brick identity/state once Milestone 1 exists.
3. Do not hardcode platform branches inside genres; ask `PlatformService` / `AppConfig`.
4. Do not add C# / native extensions without a measured performance need.
5. Do not commit secrets, keystores, or filled export credentials.

## Logging

Use `UptrisLog.info/debug/warn/error(channel, message)` instead of ad-hoc `print` in production paths.

## Testing

- Put deterministic tests in `tests/unit`.
- Keep smoke/boot validation in `scripts/ci/validate.sh`.
- Tests must not require GPU-bound visual confirmation for Milestone 0 logic.

## Comments

Comment non-obvious constraints and milestone boundaries. Do not narrate obvious assignments.
