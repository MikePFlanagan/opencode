extends Node
## Structured logging for UPTRIS.
## Prefer these helpers over bare print() so CI and debug overlays stay consistent.

enum Level { TRACE, DEBUG, INFO, WARN, ERROR }

const LEVEL_NAMES := {
	Level.TRACE: "TRACE",
	Level.DEBUG: "DEBUG",
	Level.INFO: "INFO",
	Level.WARN: "WARN",
	Level.ERROR: "ERROR",
}

signal message_emitted(level: Level, channel: String, text: String)

var min_level: Level = Level.INFO
var _history: Array[Dictionary] = []
var _history_limit: int = 256


func _ready() -> void:
	if OS.is_debug_build():
		min_level = Level.DEBUG


func set_min_level(level: Level) -> void:
	min_level = level


func trace(channel: String, text: String) -> void:
	_emit(Level.TRACE, channel, text)


func debug(channel: String, text: String) -> void:
	_emit(Level.DEBUG, channel, text)


func info(channel: String, text: String) -> void:
	_emit(Level.INFO, channel, text)


func warn(channel: String, text: String) -> void:
	_emit(Level.WARN, channel, text)


func error(channel: String, text: String) -> void:
	_emit(Level.ERROR, channel, text)


func history() -> Array[Dictionary]:
	return _history.duplicate()


func clear_history() -> void:
	_history.clear()


func _emit(level: Level, channel: String, text: String) -> void:
	if level < min_level:
		return
	var line := "[%s][%s] %s" % [LEVEL_NAMES[level], channel, text]
	match level:
		Level.WARN:
			push_warning(line)
		Level.ERROR:
			push_error(line)
		_:
			print(line)
	_history.append({
		"level": level,
		"channel": channel,
		"text": text,
		"msec": Time.get_ticks_msec(),
	})
	if _history.size() > _history_limit:
		_history.pop_front()
	message_emitted.emit(level, channel, text)
