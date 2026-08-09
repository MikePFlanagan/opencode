extends Node
## Abstract input layer. Genres query this service instead of reading raw Input directly
## when they need shared action semantics (move / jump / attack / ...).

signal action_pressed(action: String)
signal action_released(action: String)

var _enabled: bool = true
var _touch_vector: Vector2 = Vector2.ZERO


func _ready() -> void:
	for action in Actions.ALL:
		if not InputMap.has_action(action):
			UptrisLog.warn("InputService", "missing InputMap action: %s" % action)
	UptrisLog.info("InputService", "actions_ready count=%d" % Actions.ALL.size())


func set_enabled(enabled: bool) -> void:
	_enabled = enabled


func is_enabled() -> bool:
	return _enabled


func get_move_vector() -> Vector2:
	if not _enabled:
		return Vector2.ZERO
	var keyboard := Input.get_vector(
		Actions.MOVE_LEFT,
		Actions.MOVE_RIGHT,
		Actions.MOVE_UP,
		Actions.MOVE_DOWN,
	)
	if keyboard != Vector2.ZERO:
		return keyboard
	return _touch_vector


func set_touch_vector(vector: Vector2) -> void:
	_touch_vector = vector.limit_length(1.0)


func clear_touch_vector() -> void:
	_touch_vector = Vector2.ZERO


func is_action_pressed(action: String) -> bool:
	if not _enabled:
		return false
	return Input.is_action_pressed(action)


func is_action_just_pressed(action: String) -> bool:
	if not _enabled:
		return false
	return Input.is_action_just_pressed(action)


func is_action_just_released(action: String) -> bool:
	if not _enabled:
		return false
	return Input.is_action_just_released(action)


func _unhandled_input(event: InputEvent) -> void:
	if not _enabled:
		return
	for action in Actions.ALL:
		if event.is_action_pressed(action):
			action_pressed.emit(action)
		if event.is_action_released(action):
			action_released.emit(action)
