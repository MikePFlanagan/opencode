class_name SaveService
extends Node
## Placeholder save/progression surface. Milestone 0 defines the API only.

const SAVE_PATH := "user://uptris_save.json"

var _data: Dictionary = {
	"version": 1,
	"milestone": "M0",
	"unlocks": {},
	"settings": {},
}


func load_game() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return _data.duplicate(true)
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return _data.duplicate(true)
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return _data.duplicate(true)
	_data = parsed
	return _data.duplicate(true)


func save_game(data: Dictionary = {}) -> bool:
	if not data.is_empty():
		_data = data
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(_data, "\t"))
	return true
