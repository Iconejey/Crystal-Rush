import sys
from random import choice

error = lambda *args, **kwargs: print(*args, file = sys.stderr, **kwargs)

class Bot:
	def __init__(self, _id: int, item: int, coords: tuple):
		self.id = _id
		self.setPos(*coords)
		self.item = item
		self.target = NONE

	def setPos(self, x: int, y: int):
		self.pos = Position(x, y)

	def __str__(self):
		return f'Bot({self.id}, {self.pos})'

	def isDead(self) -> bool:
		return -1 in self.pos

	def dig(self, x: int, y: int) -> str:
		return f'DIG {x} {y}'

	def move(self, x: int, y: int) -> str:
		return f'MOVE {x} {y}'

	def nearest(self, coords: list, home = False) -> tuple:
		if len(coords):
			l = [(dist(*self.pos, *c, home = home), c) for c in coords]
			return sorted(l)[0][1]

	def mine(self, ores: dict, holes: set, traps: set, bots: dict, enemies: dict, radar_cooldown: int, trap_cooldown: int) -> str:
		if self.isDead():
			self.item = NONE
			return 'WAIT'
		
		# kamikaze code
		for case in getAdjacents(*self.pos):
			if case in traps:
				explosive_terrain = getExplosiveTerrain(case, traps)
				va, ve = [len([e for _id, e in entities.items() if tuple(e.pos) in explosive_terrain]) for entities in (bots, enemies)]

				explode = ve > va and ve > 0
				error('explode:', self.pos, va, ve, explode)

				if explode:
					return self.dig(*case)

		if self.item == NONE:
			self.target = NONE
			# request code
			targets = [b.target for c, b in bots.items() if b is not self]
			
			if len(radar_spots) > 0 and RADAR not in targets and radar_cooldown < 2 and sum(a for c, a in ores.items()) < 16 and nearestBase(bots) is self:
				self.target = RADAR
				return 'REQUEST RADAR'

			if len(trap_spots) > 0 and TRAP not in targets and trap_cooldown == 0 and self.pos.x == 0:
				self.target = TRAP
				return 'REQUEST TRAP'

			# target mining code
			if len(ores) > 0:
				return self.dig(*self.nearest(ores, home = True))

			# random mining
			adjacents = [case for case in getAdjacents(*self.pos) if case not in holes]

			if len(adjacents) > 0 and self.pos.x > 4 and 0 < self.pos.y < 14:
				return self.dig(*choice(adjacents))
			
			xlimit = max(5, self.pos.x-4), max(8, min(self.pos.x+4, 28))
			ylimit = max(1, self.pos.y-4), max(8, min(self.pos.y+4, 13))
			climit = [(x, y) for x in range(*xlimit) for y in range(*ylimit)]
			free = [c for c in climit if c not in holes]

			if len(free) > 4:
				n = choice(free)
			elif len(free) == 0:
				n = choice(climit)
			else:
				n = self.nearest(free)
				
			return self.move(*n)

		# get ore home code
		if self.item == ORE:
			self.target = NONE
			return self.move(0, self.pos.y)

		# placing radar/trap code
		if self.item == RADAR:
			error(self, 'has radar')
			spot = self.nearest(radar_spots, home = True)
			return self.dig(*spot if spot is not None else (15, 17))

		if self.item == TRAP:
			error(self, 'has trap')
			spot = self.nearest(trap_spots, home = True)
			return self.dig(*spot if spot is not None else (15, 17))

class Ore:
	def __init__(self, pos: tuple, amount: int):
		self.pos = pos
		self.amount = amount

class Position:
	def __init__(self, x: int, y: int):
		self.x, self.y = x, y

	def __iter__(self):
		return iter([self.x, self.y])

	def __str__(self):
		x, y = self
		return f'Pos({x}, {y})'

def getAdjacents(x, y):
	return [(x, y), (x-1, y), (x, y-1), (x+1, y), (x, y+1)]

def getExplosiveTerrain(base: tuple, traps: set):
	terrain = {base}
	l = 0
	while len(terrain) > l:
		l = len(terrain)
		terrain |= {case for trap in terrain for case in getAdjacents(*trap) if case in traps}

	return terrain | {case for trap in terrain for case in getAdjacents(*trap)}

def nearestBase(bots) -> Bot:
	m = min(bot.pos.x for _id, bot in bots.items())
	return choice([bot for _id, bot in bots.items() if bot.pos.x == m])

def dist(xa: int, ya: int, xb: int, yb: int, home = False) -> float:
	d = ((xb-xa)**2 + (yb-ya)**2)**.5
	return d + xb if home else d

def updateGround(W: int, H: int, holes: set, ores: dict):
	for i in range(H):
		inputs = input().split()
		for j in range(W):
			ore = inputs[2*j]
			hole = int(inputs[2*j+1])

			coords = (j, i)

			ores[coords] = ore

			if hole:
				holes.add(coords)

if __name__ == "__main__":
	SIZE = HEIGHT, WIDTH = [int(i) for i in input().split()]
	NONE, RADAR, TRAP, ORE = -1, 2, 3, 4

	bots, enemies, ores = {}, {}, {}
	holes, enemyholes, traps, radars = set(), set(), set(), set()

	loop = 0
	while True:
		radar_spots = {(10, 7), (5, 3), (5, 11), (14, 2), (14, 12), (18, 7), (20, 0), (20, 14), (24, 4), (24, 10), (29, 0), (29, 7), (29, 14)}
		trap_spots = {(1, y) for y in range(HEIGHT)} | {(x, y) for x in range(2, WIDTH-1) for y in range(1, 14, 3)}

		radar_spots -= radars
		trap_spots -= traps

		requests = [False, False]

		my_score, opponent_score = [int(i) for i in input().split()]

		updateGround(*SIZE, holes, ores)

		entity_count, radar_cooldown, trap_cooldown = [int(i) for i in input().split()]
		for i in range(entity_count):
			_id, _type, x, y, item = [int(j) for j in input().split()]
			coords = x, y

			if _type in (1, 0):
				dic = enemies if _type == 1 else bots
				if not loop:
					dic[_id%5] = Bot(_id, item, coords)

				elif _type == 1 and dic[_id%5].pos == coords and coords[0] > 0:
					error(dic[_id%5], 'stayed')
					for case in getAdjacents(*coords):
						if case in holes and case[0] > 0:
							enemyholes.add(case)
			
				dic[_id%5].setPos(*coords)
				dic[_id%5].item = item

			if _type == 2:
				radars.add(coords)

			if _type == 3:
				traps.add(coords)

		todel = []
		for coords, amount in ores.items():
			if amount in ('?', '0') or any(coords in enum for enum in [enemyholes, traps, radars]):
				todel.append(coords)
			else:
				ores[coords] = int(amount)
		
		for td in todel:
			del ores[td]

		error(sum(a for c, a in ores.items()), *ores)

		error(*[{NONE: 'NONE', ORE: 'ORE', RADAR: 'RADAR', TRAP: 'TRAP'}[b.target] for c, b in bots.items()])

		for _id, bot in bots.items():
			print(bot.mine(ores, holes, traps, bots, enemies, radar_cooldown, trap_cooldown))

		loop += 1