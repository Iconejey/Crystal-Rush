class Entity {
	constructor(id, type, x, y, item) {
		this.id = id;
		this.type = ['ALLY', 'ENEMY', 'RADAR', 'TRAP'][type];
		this.x = x;
		this.y = y;
		this.item = item;
	}

	// Move the bot to a specified position
	move(x, y) {
		console.log(`MOVE ${x} ${y}`);
	}

	// Dig at a specified position
	dig(x, y) {
		console.log(`DIG ${x} ${y}`);
	}

	// Request an item
	request(item) {
		console.log(`REQUEST ${item}`);
	}

	// Wait action
	wait() {
		console.log('WAIT');
	}
}

class Case {
	// Get the case char
	get char() {
		// Show hole by default
		let str = this.hole;

		// If hole is a number, replace by '#'
		if (this.hole !== '.' && this.hole !== 'x') str = '#';

		// If ore, show ore
		if (this.ore && this.ore !== '.') str = this.ore;

		// If entities, show radars and traps
		for (let entity of this.entities) {
			if (entity.type === 'RADAR') str = 'R';
			if (entity.type === 'TRAP') str = 'T';
		}

		// Return case string
		return str;
	}

	// Set the ore value
	readOre(value) {
		// Ignore if value is '?'
		if (value === '?') return;

		// If value is an integer, set ore value
		if (!isNaN(value)) this.ore = parseInt(value);
	}

	// Set the hole value
	readHole(value, turn) {
		if (value === '1' && this.hole === '.') this.hole = turn;
	}

	constructor(x, y) {
		this.x = x;
		this.y = y;

		// '.' = unknown, '?' = maybe, int = ore
		this.ore = '.';

		// '.' = unknown, int = the turn the hole was dug
		this.hole = '.';

		// Entities on the case
		this.entities = [];
	}
}

class Game {
	// Get allies
	get allies() {
		return this.entities.filter(e => e.type === 'ALLY');
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
			}
		}

		// Read entities
		inputs = readline().split(' ');
		const entity_count = parseInt(inputs[0]);
		this.radar_cooldown = parseInt(inputs[1]);
		this.trap_cooldown = parseInt(inputs[2]);

		this.entities = [];

		for (let i = 0; i < entity_count; i++) {
			inputs = readline().split(' ');
			const entity = new Entity(parseInt(inputs[0]), parseInt(inputs[1]), parseInt(inputs[2]), parseInt(inputs[3]), parseInt(inputs[4]));
			this.entities.push(entity);
			this.grid[entity.y][entity.x].entities.push(entity);
		}
	}
}

// Initialize game
const game = new Game();
game.readInitialInput();

// Game loop
while (true) {
	this.turn++;

	// Read the turn input
	game.readTurnInput();

	// Show grid
	game.showGrid();

	// Example bot actions
	for (let ally of game.allies) {
		ally.wait();
		console.error(ally);
	}
}
