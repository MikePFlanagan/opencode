extends Node
## Central orchestration stub for Milestone 0.
## Owns genre sequencing later; genres must never instantiate each other.

enum Phase { BOOT, IDLE, RUNNING, TRANSFORMING, PAUSED }

var phase: Phase = Phase.BOOT
var current_genre_id: String = ""
var milestone_id: String = ""


func _ready() -> void:
	milestone_id = AppConfig.MILESTONE_ID
	phase = Phase.IDLE
	UptrisLog.info("GameDirector", "ready milestone=%s" % milestone_id)
	EventBus.emit_milestone_ready(milestone_id)


func get_phase_name() -> String:
	return str(Phase.find_key(phase))


func request_genre(genre_id: String, payload: Dictionary = {}) -> void:
	# Milestone 0 has no genre modules. Keep the API surface stable for later work.
	UptrisLog.warn("GameDirector", "genre request ignored in %s: %s" % [milestone_id, genre_id])
	EventBus.genre_change_requested.emit(genre_id, payload)


func begin_running() -> void:
	phase = Phase.RUNNING
	UptrisLog.info("GameDirector", "phase=%s" % get_phase_name())


func begin_transform() -> void:
	phase = Phase.TRANSFORMING
	UptrisLog.info("GameDirector", "phase=%s" % get_phase_name())


func pause_game() -> void:
	phase = Phase.PAUSED
	InputService.set_enabled(false)
	UptrisLog.info("GameDirector", "phase=%s" % get_phase_name())


func resume_game() -> void:
	phase = Phase.RUNNING
	InputService.set_enabled(true)
	UptrisLog.info("GameDirector", "phase=%s" % get_phase_name())
