class_name GenreModule
extends Node
## Contract every gameplay mode must implement.
## Genres talk to GameDirector and shared services only — never to other genres.

@export var genre_id: String = ""


func initialize(_context: Dictionary = {}) -> void:
	pass


func enter(_payload: Dictionary = {}) -> void:
	pass


func resume() -> void:
	pass


func pause() -> void:
	pass


func complete(_result: Dictionary = {}) -> void:
	pass


func prepare_transition(_next_genre_id: String, _payload: Dictionary = {}) -> void:
	pass


func exit() -> void:
	pass
