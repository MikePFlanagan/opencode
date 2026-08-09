extends Node
## Alternate entry for CI smoke launches.
## Prefer: godot --headless --path . -- --uptris-smoke


func _ready() -> void:
	AppConfig.headless_smoke = true
	AppConfig.auto_quit_msec = 1500
	get_tree().change_scene_to_file("res://scenes/bootstrap/bootstrap.tscn")
