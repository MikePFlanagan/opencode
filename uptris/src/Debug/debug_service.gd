extends Node
## Debug overlays and runtime flags. Disabled presentation in release unless forced.

signal overlay_changed(visible: bool)

var overlay_visible: bool = false
var show_fps: bool = true
var show_platform: bool = true
var force_debug_in_release: bool = false


func _ready() -> void:
	overlay_visible = OS.is_debug_build()
	UptrisLog.info("DebugService", "overlay_visible=%s" % str(overlay_visible))


func toggle_overlay() -> void:
	set_overlay_visible(not overlay_visible)


func set_overlay_visible(visible: bool) -> void:
	if not OS.is_debug_build() and not force_debug_in_release:
		overlay_visible = false
		overlay_changed.emit(overlay_visible)
		EventBus.debug_visibility_changed.emit(overlay_visible)
		return
	overlay_visible = visible
	overlay_changed.emit(overlay_visible)
	EventBus.debug_visibility_changed.emit(overlay_visible)


func is_active() -> bool:
	return overlay_visible and (OS.is_debug_build() or force_debug_in_release)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed(Actions.DEBUG_TOGGLE):
		toggle_overlay()
		get_viewport().set_input_as_handled()
