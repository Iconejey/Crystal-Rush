class Entity {
	// Get the case where the entity is
	get case() {
		return game.grid[this.y][this.x];
	}

	// Get the nearest ore
	get nearest_ore() {
		return this.nearest(game.ores);
	}

	// Get the nearest marked case
	get nearest_marked() {
		return this.nearest(game.marked_cases);
	}

	constructor(id, type, x, y) {
		this.id = id;
		this.type = ['ALLY', 'ENEMY', 'RADAR', 'TRAP'][type];
		this.x = x;
		this.y = y;
		this.item = null;
		this.homing_start = null;
		this.target = null;
	}

	nearest(list) {
		let nearest = null;
		let nearest_distance = Infinity;

		// Loop through the list
		for (let item of list) {
			// If the item is targeted, ignore it
			if (item.targeted) continue;

			// Calculate the distance
			const distance = (item.x - this.x) ** 2 + (item.y - this.y) ** 2;

			// If the distance is less than the nearest distance
			if (distance < nearest_distance) {
				// Update the nearest item
				nearest = item;
				nearest_distance = distance;
			}
		}

		return nearest;
	}

	// Set the entity position and item
	update(x, y, item) {
		// Save the old case
		const old_case = this.case;

		// Update the entity attributes
		this.x = x;
		this.y = y;

		this.item = {
			'-1': null,
			2: 'RADAR',
			3: 'TRAP',
			4: 'CRYSTAL'
		}[item];

		// Get the new case
		const new_case = this.case;

		// Add the entity to the new case
		new_case.entities.push(this);

		// Get the movement
		const dx = this.x - old_case.x;
		const dy = this.y - old_case.y;

		// Detect if the entity is homing
		const homing = dx < -2 && dy === 0;
		if (homing && !this.homing_start) {
			// Save the homing start
			this.homing_start = old_case;

			// Check the neighbors of the homing start
			for (let neighbor of this.homing_start.neighbors) {
				// If the neighbor was just dug
				if (neighbor.hole && neighbor.turns_since_dug < 3) {
					// Set the neighbor ore amount as zero if not known
					neighbor.ore ||= 0;

					// Mark its neighbors as potential ores
					for (let n_neighbor of neighbor.neighbors) n_neighbor.mark();
				}
			}
		}

		// Detect if the entity stopped homing
		if (!homing) this.homing_start = null;

		// If the entity has a target, remove it
		if (this.target) {
			this.target.targeted = false;
			this.target = null;
		}
	}

	// Move the bot to a specified position
	move(x, y) {
		console.log(`MOVE ${x} ${y}`);
	}

	// Dig at a specified position
	dig(x, y) {
		const c = game.grid[y][x];
		this.target = c;
		c.targeted = true;
		console.log(`DIG ${x} ${y} ${c.char}`);
	}

	// Request an item
	request(item) {
		console.log(`REQUEST ${item}`);
	}

	// Wait action
	wait() {
		console.log('WAIT');
	}

	// Homing action
	homing() {
		this.move(0, this.y);
	}

	// Do the bot action
	doAction() {
		console.error(this.type, this.x, this.y, this.item);

		// If the bot carries a crystal, return to base
		if (this.item === 'CRYSTAL') return this.homing();

		// Get the nearest ore or marked case
		const nearest = this.nearest_ore || this.nearest_marked;
		if (nearest) return this.dig(nearest.x, nearest.y);

		// If no nearest, move towards the furthest hole
		const furthest = game.furthest_hole;
		if (furthest) return this.move(furthest.x, this.y);

		// If no furthest, wait
		this.wait();
	}
}

class Case {
	// Get the neighbors
	get neighbors() {
		let neighbors = [];

		if (this.x > 0) neighbors.push(game.grid[this.y][this.x - 1]);
		if (this.x < game.map_width - 1) neighbors.push(game.grid[this.y][this.x + 1]);
		if (this.y > 0) neighbors.push(game.grid[this.y - 1][this.x]);
		if (this.y < game.map_height - 1) neighbors.push(game.grid[this.y + 1][this.x]);

		return neighbors;
	}

	// Get the turns since the hole was marked as potential ore
	get turns_since_marked() {
		return this.marked ? game.turn - this.marked : Infinity;
	}

	// Get the turns since the hole was dug
	get turns_since_dug() {
		return this.hole ? game.turn - this.hole : Infinity;
	}

	// Get the case char
	get char() {
		// Show dot by default
		let str = '.';

		// If marked, show 'x'
		if (this.marked) str = 'x';

		// If hole, replace by '#'
		if (this.hole) str = '#';

		// If ore is known, show it
		if (this.ore !== null) str = this.ore;

		// If entities, show radars and traps
		for (let entity of this.entities) {
			if (entity.type === 'RADAR') str = 'R';
			if (entity.type === 'TRAP') str = 'T';
		}

		// Return case string
		return str;
	}

	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.targeted = false;

		// int = the turn the hole was dug
		this.hole = null;

		// int = ore amount
		this.ore = null;

		// int = the turn the hole was marked as potential ore
		this.marked = null;

		// Entities on the case
		this.entities = [];
	}

	// Set the ore value
	readOre(value) {
		// Ignore if value is '?'
		if (value === '?') return;

		// Parse the ore value
		this.ore = parseInt(value);

		// Add the case to the ores list
		game.ores.push(this);

		// Remove the mark
		this.marked = null;
	}

	// Set the hole value
	readHole(value) {
		// If not a hole, ignore
		if (value !== '1') return;

		// Save turn if hole is dug
		this.hole ||= game.turn;

		// Remove the mark
		this.marked = null;
	}

	// Mark the case as potential ore
	mark() {
		// Ignore if already known
		if (this.ore || this.hole) return;

		// If not already marked, add it to the list
		if (!this.marked) game.marked_cases.push(this);

		// Update the turn
		this.marked = game.turn;
	}
}

class Game {
	// Get allies
	get allies() {
		return this.entities.filter(e => e.type === 'ALLY');
	}

	// Get the furthest hole
	get furthest_hole() {
		let furthest = null;

		// Loop through the holes
		for (let hole of this.holes) {
			// If no furthest or hole is further
			if (!furthest || hole.x > furthest.x) furthest = hole;
		}

		return furthest;
	}

	constructor() {
		this.map_width = 0;
		this.map_height = 0;
		this.my_score = 0;
		this.opponent_score = 0;
		this.radar_cooldown = 0;
		this.trap_cooldown = 0;
		this.turn = 0;

		this.entities = [];
		this.ores = [];
		this.holes = [];
		this.marked_cases = [];

		this.grid = [];
	}

	// Init grid
	initGrid() {
		for (let i = 0; i < this.map_height; i++) {
			this.grid.push([]);
			for (let j = 0; j < this.map_width; j++) {
				this.grid[i].push(new Case(j, i));
			}
		}
	}

	// Show grid
	showGrid() {
		for (let i = 0; i < this.map_height; i++) {
			let row = '';
			for (let j = 0; j < this.map_width; j++) {
				row += this.grid[i][j].char + ' ';
			}

			console.error(row);
		}
	}

	// Read initial input for map dimensions
	readInitialInput() {
		let inputs = readline().split(' ');
		this.map_width = parseInt(inputs[0]);
		this.map_height = parseInt(inputs[1]);
		this.initGrid();
	}

	// Read input for each turn
	readTurnInput() {
		let inputs = readline().split(' ');
		this.my_score = parseInt(inputs[0]);
		this.opponent_score = parseInt(inputs[1]);

		// Reset lists
		this.ores = [];
		this.holes = [];

		// Read grid
		for (let i = 0; i < this.map_height; i++) {
			inputs = readline().split(' ');
			for (let j = 0; j < this.map_width; j++) {
				// Update case
				const c = this.grid[i][j];
				c.readOre(inputs[2 * j]);
				c.readHole(inputs[2 * j + 1], this.turn);
				c.entities = [];

				if (c.ore) this.ores.push(c);
				if (c.hole) this.holes.push(c);
			}
		}

		// Filter marked cases to remove old ones
		this.marked_cases = this.marked_cases.filter(c => {
			if (c.turns_since_marked > 20) c.marked = null;
			return c.marked;
		});

		// Read entities
		inputs = readline().split(' ');
		const entity_count = parseInt(inputs[0]);
		this.radar_cooldown = parseInt(inputs[1]);
		this.trap_cooldown = parseInt(inputs[2]);

		for (let i = 0; i < entity_count; i++) {
			inputs = readline().split(' ');
			const [id, type, x, y, item] = inputs.map(x => parseInt(x));

			// If entity does not exist, create it
			if (!this.entities[id]) {
				this.entities[id] = new Entity(id, type, x, y);
				continue;
			}

			// Else update the entity
			const entity = this.entities[id];
			entity.update(x, y, item);
		}
	}
}

// Initialize game
const game = new Game();
game.readInitialInput();

// Game loop
while (true) {
	game.turn++;

	// Read the turn input
	game.readTurnInput();

	// Show grid
	game.showGrid();

	// Example bot actions
	for (let ally of game.allies) {
		ally.doAction();
	}
}
