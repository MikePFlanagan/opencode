extends Node
## Headless unit-test runner for deterministic Milestone 0 logic.
## Usage: godot --headless --path . res://tests/unit/test_runner.tscn

var _passed: int = 0
var _failed: int = 0


func _ready() -> void:
	_run_all()
	var code := 0 if _failed == 0 else 1
	print("UPTRIS tests: %d passed, %d failed" % [_passed, _failed])
	await get_tree().process_frame
	get_tree().quit(code)


func _run_all() -> void:
	_test_actions_contract()
	_test_platform_kind()
	_test_save_roundtrip()
	_test_genre_module_contract()


func _assert(condition: bool, label: String) -> void:
	if condition:
		_passed += 1
		print("  PASS  ", label)
		return
	_failed += 1
	print("  FAIL  ", label)


func _test_actions_contract() -> void:
	print("suite: actions")
	_assert(Actions.ALL.has(Actions.MOVE_LEFT), "move_left present")
	_assert(Actions.ALL.has(Actions.PAUSE), "pause present")
	_assert(Actions.ALL.size() == 12, "expected 12 abstract actions")


func _test_platform_kind() -> void:
	print("suite: platform_kind")
	_assert(PlatformKind.detect_family("macOS") == PlatformKind.Family.DESKTOP, "macOS desktop")
	_assert(PlatformKind.detect_family("Windows") == PlatformKind.Family.DESKTOP, "Windows desktop")
	_assert(PlatformKind.detect_family("iOS") == PlatformKind.Family.MOBILE, "iOS mobile")
	_assert(PlatformKind.detect_family("Android") == PlatformKind.Family.MOBILE, "Android mobile")
	_assert(PlatformKind.physics_budget(false) > 0, "physics budget positive")
	_assert(PlatformKind.physics_budget(true) < PlatformKind.physics_budget(false), "mobile budget lower")


func _test_save_roundtrip() -> void:
	print("suite: save")
	var save := SaveService.new()
	var payload := {
		"version": 1,
		"milestone": "M0",
		"unlocks": {"genesis": true},
		"settings": {"shake": false},
	}
	_assert(save.save_game(payload), "save_game writes")
	var loaded := save.load_game()
	_assert(loaded.get("milestone") == "M0", "milestone persisted")
	_assert(loaded.get("unlocks", {}).get("genesis", false) == true, "unlock persisted")
	save.free()


func _test_genre_module_contract() -> void:
	print("suite: genre_module")
	var module := GenreModule.new()
	module.genre_id = "stub"
	module.initialize({})
	module.enter({})
	module.pause()
	module.resume()
	module.prepare_transition("next", {})
	module.complete({})
	module.exit()
	_assert(module.genre_id == "stub", "genre id retained")
	module.free()
