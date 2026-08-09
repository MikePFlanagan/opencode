class_name AudioService
extends Node
## Placeholder audio facade for later era-transition music work.
## Not an autoload in Milestone 0 — kept as a composable service type.

signal era_changed(era_id: String)

var current_era_id: String = "primitive"


func play_sfx(_id: String, _opts: Dictionary = {}) -> void:
	pass


func play_music(_id: String, _opts: Dictionary = {}) -> void:
	pass


func set_era(era_id: String) -> void:
	current_era_id = era_id
	era_changed.emit(era_id)
