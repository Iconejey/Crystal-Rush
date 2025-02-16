class Entity {
	// Get the case where the entity is
	get case() {
		return game.grid[this.y][this.x];
	}

	// Get the nearest ore
	get nearest_ore() {
		return this.nearest(game.ores.filter(c => c.ore > 0));
	}

	// Get the nearest marked case
	get nearest_marked() {
		return this.nearest(game.marked_cases);
	}

	// Get the nearest unknown case
	get nearest_unknown() {
		// Only use the pair coordinates
		const unknown_cases = game.unknown_cases.filter(c => c.x % 2 === 0 && c.y % 2 === 0);

		// Return the nearest unknown case
		return this.nearest(unknown_cases);
	}

	// Get the next radar position (nearest strategic case to the last found crystal)
	get next_radar() {
		let list = [];

		// Loop through the grid
		for (let i = 0; i < game.map_height; i++) {
			for (let j = 4; j < game.map_width; j++) {
				const mod1 = i % 6 === 1 && j % 8 === 4;
				const mod2 = i % 6 === 4 && j % 8 === 0;

				if (mod1 || mod2) {
					// Get the case
					const c = game.grid[i][j];

					// Check if the case has a radar or trap
					if (['R', 'T'].includes(c.char)) continue;

					// Add the case to the list
					list.push(c);
				}
			}
		}

		// Return the nearest case
		return this.nearest(list, Case.last_found || this.case);
	}

	constructor(id, type, x, y) {
		this.id = id;
		this.type = ['ALLY', 'ENEMY', 'RADAR', 'TRAP'][type];
		this.x = x;
		this.y = y;
		this.item = null;
		this.homing_start = null;
		this.target = null;
		this.radar_target = null;
	}

	// Check if given case is a neighbor
	isNeighbor(c) {
		return this.case.neighbors.includes(c);
	}

	// Check if given case is reachable
	isReachable(c) {
		return c === this.case || this.isNeighbor(c);
	}

	nearest(list, from = this.case) {
		let nearest = null;
		let nearest_distance = Infinity;

		// Loop through the list
		for (let item of list) {
			// If the item is targeted, ignore it
			if (item.targeted) continue;

			// Calculate the distance
			const distance = (item.x - from.x) ** 2 + (item.y - from.y) ** 2;

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

		// Remove radar target if the radar is placed
		if (this.item !== 'RADAR') this.radar_target = null;

		// Get the new case
		const new_case = this.case;

		// Add the entity to the new case
		new_case.entities.push(this);

		// Get the movement
		const dx = this.x - old_case.x;
		const dy = this.y - old_case.y;

		// Detect if the entity is a homing enemy
		const homing = dx < -2 && dy === 0 && this.type === 'ENEMY';

		// Detect if the entity started homing
		if (homing && !this.homing_start) {
			// Save the homing start
			this.homing_start = old_case;

			// Check the neighbors of the homing start
			for (let neighbor of this.homing_start.neighbors) {
				// If the neighbor was just dug
				if (neighbor.hole && neighbor.turns_since_dug < 3) {
					// The enemy found a crystal
					neighbor.found();
				}
			}
		}

		// Detect if the entity stopped homing
		if (!homing) this.homing_start = null;

		// If the entity has a target
		if (this.target) {
			// Check if entity dug the target (did not move)
			if (dx === 0 && dy === 0) {
				// Decrease the ore amount if the entity now carries a crystal
				if (this.item === 'CRYSTAL') this.target.found();
				// Set the ore amount to 0 if the entity did not find a crystal
				else this.target.ore = 0;
			}

			// Remove the target if it is not reachable
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
		// Get the case
		const c = game.grid[y][x];

		// Target the case
		this.target = c;
		c.targeted = true;

		// Dig the case
		console.log(`DIG ${x} ${y} ${c.char}`);
		this.last_dig = c;
	}

	// Request an item
	request(item) {
		console.log(`REQUEST ${item}`);
		if (item === 'RADAR') game.radar_ready = false;
		if (item === 'TRAP') game.trap_ready = false;
	}

	// Wait action
	wait() {
		console.log('WAIT');
	}

	// Homing action
	homing() {
		this.move(0, this.y);
	}

	// Place a radar
	place_radar() {
		// If no radar target, get the next radar position
		if (!this.radar_target) this.radar_target = this.next_radar || this.nearest_unknown;

		// Place the radar
		this.dig(this.radar_target.x, this.radar_target.y);
	}

	// Do the bot action
	doAction() {
		// If the bot is at the base, a radar is available and ores list is small, request a radar
		if (this.x === 0 && this.item === null && game.radar_ready && game.ores.length < 10) return this.request('RADAR');

		// If the bot carries a radar, place it
		if (this.item === 'RADAR') return this.place_radar();

		// If the bot carries a crystal, return to base
		if (this.item === 'CRYSTAL') return this.homing();

		// Get the nearest ore or marked case or unknown case
		const nearest = this.nearest_ore || this.nearest_marked || this.nearest_unknown;
		if (nearest) return this.dig(nearest.x, nearest.y);

		// If no furthest, wait
		this.wait();
	}
}

class Case {
	// The last sucessful dig
	static last_found = null;

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
		// Parse the ore value
		if (value !== '?') this.ore = parseInt(value);

		// Make sure the ore value is not negative
		if (this.ore < 0) this.ore = 0;

		// Add the case to the ores list if not 0
		if (this.ore) game.ores.push(this);

		// Remove the mark
		if (this.ore !== null) this.marked = null;
	}

	// Set the hole value
	readHole(value) {
		// If not a hole, ignore
		if (value !== '1') return;

		// Save turn if hole is dug
		this.hole ||= game.turn;

		// Add hole to the list
		game.holes.push(this);

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

	// A crystal was found
	found() {
		// If the case is unknown, set the ore amount to 2
		if (this.ore === null) this.ore = 2;
		// Otherwise decrease the ore amount
		else if (this.ore > 0) this.ore--;

		// Mark neighbors as potential ores
		for (const neighbor of this.neighbors) neighbor.mark();

		// Save the last found case
		Case.last_found = this;
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
		this.radar_ready = false;
		this.trap_cooldown = 0;
		this.trap_ready = false;
		this.turn = 0;

		this.entities = [];
		this.ores = [];
		this.holes = [];
		this.marked_cases = [];
		this.unknown_cases = [];

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
		this.unknown_cases = [];

		// Read grid
		for (let i = 0; i < this.map_height; i++) {
			inputs = readline().split(' ');
			for (let j = 0; j < this.map_width; j++) {
				// Update case
				const c = this.grid[i][j];
				c.readOre(inputs[2 * j]);
				c.readHole(inputs[2 * j + 1], this.turn);
				c.entities = [];

				if (c.x > 3 && !c.ore && !c.hole) this.unknown_cases.push(c);
			}
		}

		// Filter marked cases to remove old ones
		this.marked_cases = this.marked_cases.filter(c => {
			if (c.turns_since_marked > 40) c.marked = null;
			return c.marked;
		});

		console.error('ORES', this.ores.length);
		console.error('MARKED', this.marked_cases.length);

		// Read entities
		inputs = readline().split(' ');
		const entity_count = parseInt(inputs[0]);

		// Radar cooldown
		this.radar_cooldown = parseInt(inputs[1]);
		this.radar_ready = this.radar_cooldown === 0;

		// Trap cooldown
		this.trap_cooldown = parseInt(inputs[2]);
		this.trap_ready = this.trap_cooldown === 0;

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
