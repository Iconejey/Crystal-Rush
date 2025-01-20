// Size of the map
let inputs = readline().split(' ');
const map_width = parseInt(inputs[0]);
const map_height = parseInt(inputs[1]);

// Game loop
while (true) {
	// Amount of ore delivered
	inputs = readline().split(' ');
	const my_score = parseInt(inputs[0]);
	const opponent_score = parseInt(inputs[1]);

	for (let i = 0; i < map_height; i++) {
		inputs = readline().split(' ');

		for (let j = 0; j < map_width; j++) {
			// Amount of ore or "?" if unknown
			const ore = inputs[2 * j];

			// 1 if cell has a hole
			const hole = parseInt(inputs[2 * j + 1]);
		}
	}

	inputs = readline().split(' ');

	// Number of entities visible to you
	const entity_count = parseInt(inputs[0]);

	// Turns left until a new radar can be requested
	const radar_cooldown = parseInt(inputs[1]);

	// Turns left until a new trap can be requested
	const trap_cooldown = parseInt(inputs[2]);

	for (let i = 0; i < entity_count; i++) {
		inputs = readline().split(' ');

		// Unique id of the entity
		const entity_id = parseInt(inputs[0]);

		// 0 for your robot, 1 for other robot, 2 for radar, 3 for trap
		const entity_type = parseInt(inputs[1]);

		// Position of the entity
		const pos_x = parseInt(inputs[2]);
		const pos_y = parseInt(inputs[3]);

		// If this entity is a robot, the item it is carrying (-1 for NONE, 2 for RADAR, 3 for TRAP, 4 for ORE)
		const item = parseInt(inputs[4]);
	}

	for (let i = 0; i < 5; i++) {
		// Write an action using console.log()
		// To debug: console.error('Debug messages...');

		// WAIT|MOVE x y|DIG x y|REQUEST item
		console.log('WAIT');
	}
}
