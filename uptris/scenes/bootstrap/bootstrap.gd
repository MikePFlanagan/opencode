extends Control
## Desktop baseline scene for Milestone 0.
## Confirms autoloads, resolution strategy, input wiring, and debug overlay.

@onready var _title: Label = %TitleLabel
@onready var _subtitle: Label = %SubtitleLabel
@onready var _status: Label = %StatusLabel
@onready var _debug: Label = %DebugLabel
@onready var _brick_preview: ColorRect = %BrickPreview

var _elapsed_msec: int = 0
var _smoke_reported: bool = false


func _ready() -> void:
	_title.text = "UPTRIS"
	_subtitle.text = "ONE BRICK. EVERY GAME."
	_status.text = "Milestone 0 — Project Genesis"
	_debug.visible = DebugService.is_active()
	DebugService.overlay_changed.connect(_on_overlay_changed)
	GameDirector.begin_running()
	_pulse_brick()
	UptrisLog.info("Bootstrap", "scene_ready design=%sx%s" % [
		AppConfig.DESIGN_WIDTH,
		AppConfig.DESIGN_HEIGHT,
	])
	_validate_baseline()


func _process(delta: float) -> void:
	_elapsed_msec += int(delta * 1000.0)
	if DebugService.is_active():
		_debug.text = _debug_text()
	if AppConfig.auto_quit_msec > 0 and _elapsed_msec >= AppConfig.auto_quit_msec:
		_finish_smoke(true, "auto-quit after %dms" % _elapsed_msec)


func _pulse_brick() -> void:
	var tween := create_tween().set_loops()
	tween.tween_property(_brick_preview, "modulate", Color(1.2, 1.2, 1.2, 1.0), 0.8)
	tween.tween_property(_brick_preview, "modulate", Color(1, 1, 1, 1), 0.8)


func _validate_baseline() -> void:
	var missing: Array[String] = []
	for action in Actions.ALL:
		if not InputMap.has_action(action):
			missing.append(action)
	if not missing.is_empty():
		_status.text = "Baseline failed: missing actions"
		_finish_smoke(false, "missing actions: %s" % ", ".join(missing))
		return
	if GameDirector.get_phase_name() != "RUNNING":
		_status.text = "Baseline failed: GameDirector phase"
		_finish_smoke(false, "unexpected phase %s" % GameDirector.get_phase_name())
		return
	_status.text = "Baseline OK — %s / %s" % [
		PlatformService.os_name,
		PlatformKind.family_name(PlatformService.family),
	]
	if AppConfig.headless_smoke:
		_finish_smoke(true, "baseline checks passed")


func _finish_smoke(success: bool, detail: String) -> void:
	if _smoke_reported:
		return
	_smoke_reported = true
	EventBus.emit_smoke_completed(success, detail)
	if AppConfig.headless_smoke or AppConfig.auto_quit_msec > 0:
		await get_tree().create_timer(0.05).timeout
		get_tree().quit(0 if success else 1)


func _on_overlay_changed(visible: bool) -> void:
	_debug.visible = visible


func _debug_text() -> String:
	return "\n".join([
		"UPTRIS DEBUG",
		"milestone: %s (%s)" % [AppConfig.MILESTONE_ID, AppConfig.MILESTONE_NAME],
		"version: %s" % AppConfig.PROJECT_VERSION,
		"fps: %.1f" % Engine.get_frames_per_second(),
		"phase: %s" % GameDirector.get_phase_name(),
		"platform: %s" % PlatformService.os_name,
		"touch: %s" % str(PlatformService.is_touch),
		"move: %s" % str(InputService.get_move_vector()),
		"physics_budget: %d" % PlatformService.recommended_physics_budget(),
	])
