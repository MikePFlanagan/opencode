extends Node
## Platform-aware helpers for desktop and mobile targets.
## Milestone 0 establishes the contract; genre modules must stay platform-agnostic.

var family: PlatformKind.Family = PlatformKind.Family.UNKNOWN
var os_name: String = ""
var is_touch: bool = false
var is_low_power: bool = false


func _ready() -> void:
	os_name = OS.get_name()
	family = PlatformKind.detect_family(os_name)
	is_touch = DisplayServer.is_touchscreen_available()
	is_low_power = family == PlatformKind.Family.MOBILE
	UptrisLog.info("PlatformService", "os=%s family=%s touch=%s low_power=%s" % [
		os_name,
		PlatformKind.family_name(family),
		str(is_touch),
		str(is_low_power),
	])


func is_desktop() -> bool:
	return family == PlatformKind.Family.DESKTOP


func is_mobile() -> bool:
	return family == PlatformKind.Family.MOBILE


func recommended_physics_budget() -> int:
	return PlatformKind.physics_budget(is_low_power)


func recommended_particle_budget() -> int:
	return PlatformKind.particle_budget(is_low_power)
