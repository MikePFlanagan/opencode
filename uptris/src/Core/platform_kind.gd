class_name PlatformKind
## Pure platform classification helpers with no autoload dependencies.
## Safe for headless unit tests and shared by PlatformService.

enum Family { DESKTOP, MOBILE, WEB, UNKNOWN }


static func detect_family(os_name: String) -> Family:
	match os_name:
		"Windows", "macOS", "Linux", "FreeBSD", "NetBSD", "OpenBSD":
			return Family.DESKTOP
		"Android", "iOS":
			return Family.MOBILE
		"Web":
			return Family.WEB
		_:
			return Family.UNKNOWN


static func family_name(family: Family) -> String:
	return str(Family.find_key(family))


static func physics_budget(low_power: bool) -> int:
	if low_power:
		return 256
	return 1024


static func particle_budget(low_power: bool) -> int:
	if low_power:
		return 512
	return 4096
