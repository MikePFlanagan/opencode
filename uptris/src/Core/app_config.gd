extends Node
## Runtime configuration defaults for Milestone 0.
## Content and genres should read through this service rather than hardcoding values.

const DESIGN_WIDTH := 1280
const DESIGN_HEIGHT := 720
const TARGET_FPS := 60
const MILESTONE_ID := "M0"
const MILESTONE_NAME := "Project Genesis"
const PROJECT_VERSION := "0.0.0-m0"

var headless_smoke: bool = false
var auto_quit_msec: int = 0


func _ready() -> void:
	_apply_cli_overrides()
	_apply_display_defaults()
	UptrisLog.info("AppConfig", "milestone=%s version=%s headless_smoke=%s" % [
		MILESTONE_ID,
		PROJECT_VERSION,
		str(headless_smoke),
	])


func design_size() -> Vector2i:
	return Vector2i(DESIGN_WIDTH, DESIGN_HEIGHT)


func _apply_cli_overrides() -> void:
	var args := OS.get_cmdline_user_args()
	for arg in args:
		if arg == "--uptris-smoke":
			headless_smoke = true
			auto_quit_msec = 1500
		if arg.begins_with("--uptris-quit-msec="):
			auto_quit_msec = int(arg.get_slice("=", 1))


func _apply_display_defaults() -> void:
	Engine.max_fps = TARGET_FPS
	if PlatformService.is_mobile():
		# Prefer stretch expand on handhelds; orientation is landscape in project.godot.
		get_tree().root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND
