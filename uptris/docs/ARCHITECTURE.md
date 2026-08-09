# UPTRIS Architecture

## North Star

Everything in UPTRIS is explainable as bricks.

Genres are rulesets applied to one persistent brick universe. The product hypothesis is seamless transformation without conventional loading screens.

## Layer Separation

```
Content/     data definitions, authored assemblies, locales
UI/          menus and HUD constructed as brick-aware views later
Genre/       gameplay rulesets implementing GenreModule
GameDirector orchestration, progression, transformation triggers
Transform/   configuration-to-configuration brick motion
Assembly/    structured multi-brick objects
Brick/       atomic entity + pooling
Core/        logging, platform, config, events
Input/       abstract actions (touch/keyboard/gamepad)
Audio/       era-aware playback facade
Save/        progression persistence
Debug/       overlays, budgets, diagnostics
```

Dependency direction:

- Genres depend on GameDirector + shared services.
- Genres never depend on other genres.
- Transform depends on Brick/Assembly, not on genre business logic.
- Brick Engine is the source of truth for world matter.

## Autoloads (Milestone 0)

| Autoload          | Role                                      |
|-------------------|-------------------------------------------|
| `UptrisLog`       | Structured logging                        |
| `PlatformService` | OS family, touch, performance budgets     |
| `AppConfig`       | Design resolution, milestone metadata, CLI|
| `DebugService`    | Overlay + debug toggles                   |
| `InputService`    | Abstract action queries + touch vector    |
| `EventBus`        | Cross-system signals                      |
| `GameDirector`    | Phase / future genre sequencing           |

## Resolution Strategy

- Design resolution: **1280×720**
- Stretch mode: `canvas_items`
- Aspect: `expand`
- Default orientation: landscape
- Mobile uses the same design size; UI later adapts safe areas

This keeps authored layouts stable while allowing wider/taller handheld displays.

## Input Abstraction

Canonical actions in `Actions`:

`move_*`, `jump`, `attack`, `special`, `rotate`, `drop`, `interact`, `pause`

Genre-specific verbs map onto these concepts. Touch controls set a shared move vector through `InputService` rather than inventing parallel systems.

## Genre Module Contract

Every mode implements:

`initialize → enter → resume/pause → prepare_transition → complete → exit`

`GameDirector` decides when transformations occur. Modules receive shared services; they do not construct sibling genres.

## Transformation Pipeline (future)

```
Current Assembly
→ Freeze / prepare
→ Disassemble
→ Move bricks (authored or procedural paths)
→ Reconfigure camera
→ Reassemble
→ Change ruleset
→ Resume control
```

## Performance Rule

Do not simulate every visible brick as an independent rigid body.

Simulation tiers (from Milestone 1 onward):

1. Important bricks — full physics
2. Nearby debris — simplified physics
3. Background bricks — GPU/animation
4. Distant structures — merged rendering

Object pooling is foundational.

## Testing Strategy

- Deterministic pure logic: headless scene runner (`tests/unit/test_runner.tscn`)
- Boot / autoload / input map: desktop smoke (`--uptris-smoke`)
- CI entrypoint: `scripts/ci/validate.sh`
- Avoid mocks where real services can run headlessly

## Platform Configuration

`PlatformService` (backed by pure `PlatformKind` helpers) classifies:

- Desktop: Windows, macOS, Linux
- Mobile: Android, iOS
- Web: reserved

Export preset template lives at `export/export_presets.cfg.template`. Local signing material must never be committed.

## Milestone Gate

Milestone 0 stops at a clean launch + validated baseline.

Milestone 1 introduces the Brick entity. No genres before the vertical-slice path begins after Milestones 0–3.
