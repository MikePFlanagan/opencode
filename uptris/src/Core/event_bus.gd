extends Node
## Process-wide signals for cross-system communication.
## Genres must not reference each other; they publish/subscribe here or via GameDirector.

signal milestone_ready(milestone_id: String)
signal smoke_completed(success: bool, detail: String)
signal debug_visibility_changed(visible: bool)
signal genre_change_requested(genre_id: String, payload: Dictionary)


func emit_milestone_ready(milestone_id: String) -> void:
	UptrisLog.info("EventBus", "milestone_ready=%s" % milestone_id)
	milestone_ready.emit(milestone_id)


func emit_smoke_completed(success: bool, detail: String) -> void:
	UptrisLog.info("EventBus", "smoke_completed success=%s detail=%s" % [str(success), detail])
	smoke_completed.emit(success, detail)
