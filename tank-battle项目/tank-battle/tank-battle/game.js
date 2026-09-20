const canvas = document.querySelector('#battlefield');
const context = canvas.getContext('2d');
const scoreElement = document.querySelector('#score');
const livesElement = document.querySelector('#lives');
const enemiesElement = document.querySelector('#enemies');
const waveElement = document.querySelector('#wave');
const versionElement = document.querySelector('#version');
const mapNameElement = document.querySelector('#mapName');
const difficultyElement = document.querySelector('#difficulty');
const weaponElement = document.querySelector('#weapon');
const shieldElement = document.querySelector('#shield');
const chargeElement = document.querySelector('#charge');
const missionState = document.querySelector('#missionState');
const overlay = document.querySelector('#overlay');
const overlayTitle = document.querySelector('#overlayTitle');
const overlayCopy = document.querySelector('#overlayCopy');
const restartButton = document.querySelector('#restartButton');
const overlayButton = document.querySelector('#overlayButton');
const world = { width: canvas.width, height: canvas.height };
const keys = new Set();
const maps = [
	{ name: '荒原', accent: '#f26f3d', bg: '#0d1211', wall: '#2e3831', grid: 'rgba(151,167,143,.08)' },
	{ name: '要塞', accent: '#86d5ff', bg: '#101820', wall: '#243647', grid: 'rgba(134,213,255,.12)' },
	{ name: '废墟', accent: '#f0b7a5', bg: '#120e0d', wall: '#382f2c', grid: 'rgba(240,183,165,.1)' }
];
const walls = [
	{ x: 180, y: 90, width: 190, height: 28 }, { x: 590, y: 90, width: 190, height: 28 },
	{ x: 180, y: 482, width: 190, height: 28 }, { x: 590, y: 482, width: 190, height: 28 },
	{ x: 90, y: 250, width: 180, height: 28 }, { x: 690, y: 250, width: 180, height: 28 },
	{ x: 420, y: 190, width: 120, height: 28 }, { x: 420, y: 382, width: 120, height: 28 }
];
const hazardSeeds = [
	{ x: 305, y: 240 }, { x: 645, y: 240 }, { x: 360, y: 360 }, { x: 600, y: 360 },
	{ x: 480, y: 300 }, { x: 260, y: 470 }, { x: 700, y: 470 }
];
let mapIndex = 0;
let player; let enemies; let bullets; let particles; let pickups; let hazards; let score; let gameState; let wave; let waveTransition; let lastTime = 0;

function resetGame() {
	player = { x: 480, y: 545, angle: -Math.PI / 2, speed: 3.4, cooldown: 0, lives: 3, invulnerable: 0, weaponLevel: 1, radius: 22, shield: 100, charge: 100, blastCooldown: 0 };
	enemies = [];
	bullets = [];
	particles = [];
	pickups = [];
	hazards = [];
	score = 0;
	wave = 1;
	waveTransition = 0;
	gameState = 'playing';
	overlay.hidden = true;
	missionState.textContent = '作战中';
	spawnWave(wave);
	updateHud();
}
function cycleMap() {
	mapIndex = (mapIndex + 1) % maps.length;
	missionState.textContent = `地图切换：${maps[mapIndex].name}`;
	updateHud();
}
function getDifficultyLabel() {
	if (wave >= 5) return 'HELL';
	if (wave >= 3) return 'HARD';
	return 'NORMAL';
}
function spawnWave(currentWave) {
	const count = Math.min(4 + currentWave, 12);
	const spawnPoints = [
		{ x: 110, y: 90 }, { x: 850, y: 90 }, { x: 100, y: 400 }, { x: 860, y: 400 },
		{ x: 180, y: 160 }, { x: 780, y: 160 }, { x: 150, y: 500 }, { x: 810, y: 500 }
	];
	hazards = currentWave >= 3 ? hazardSeeds.map((seed, index) => ({
		x: seed.x + (index % 2 === 0 ? 10 : -10),
		y: seed.y + (index % 3 === 0 ? 8 : -8),
		radius: 13,
		life: 1
	})) : [];
	enemies = Array.from({ length: count }, (_, index) => {
		const base = spawnPoints[index % spawnPoints.length];
		const jitter = { x: (Math.random() - 0.5) * 32, y: (Math.random() - 0.5) * 32 };
		const health = 1 + Math.floor((currentWave - 1) / 2);
		const elite = currentWave >= 4 && Math.random() < 0.22;
		return {
			x: base.x + jitter.x,
			y: base.y + jitter.y,
			angle: Math.random() * Math.PI * 2,
			speed: 0.82 + currentWave * 0.09 + (elite ? 0.25 : 0),
			cooldown: 800 + Math.random() * 700,
			turnTimer: 500 + Math.random() * 800,
			color: elite ? '#ffc857' : currentWave >= 4 ? '#c0564c' : '#bc4c3b',
			radius: elite ? 24 : 20,
			health: elite ? health + 2 : health,
			maxHealth: elite ? health + 2 : health,
			reward: elite ? 450 + currentWave * 80 : 250 + currentWave * 60,
			isBoss: false,
			isElite: elite
		};
	});
	if (currentWave >= 6) {
		enemies.push({
			x: 480,
			y: 120,
			angle: 0,
			speed: 1.2,
			cooldown: 500,
			turnTimer: 400,
			color: '#d9d1ff',
			radius: 36,
			health: 22,
			maxHealth: 22,
			reward: 2400,
			isBoss: true,
			isElite: false
		});
	}
	missionState.textContent = currentWave >= 6 ? '最终 BOSS' : `第 ${currentWave} 波`;
	updateHud();
}
function updateHud() {
	scoreElement.textContent = String(score).padStart(4, '0');
	livesElement.textContent = String(player.lives).padStart(2, '0');
	enemiesElement.textContent = String(enemies.length).padStart(2, '0');
	waveElement.textContent = String(wave).padStart(2, '0');
	versionElement.textContent = '4.0';
	mapNameElement.textContent = maps[mapIndex].name;
	difficultyElement.textContent = getDifficultyLabel();
	weaponElement.textContent = `L${player.weaponLevel}`;
	shieldElement.textContent = `${Math.max(0, Math.round(player.shield))}%`;
	chargeElement.textContent = `${Math.max(0, Math.round(player.charge))}%`;
}
function update(delta) {
	if (gameState !== 'playing') return;
	player.invulnerable = Math.max(0, player.invulnerable - delta);
	player.cooldown = Math.max(0, player.cooldown - delta);
	player.charge = Math.min(100, player.charge + delta * 0.03);
	player.blastCooldown = Math.max(0, player.blastCooldown - delta);
	const boosting = keys.has('Shift');
	player.speed = boosting ? 4.8 : 3.4;

	if (waveTransition > 0) {
		waveTransition -= delta;
		if (waveTransition <= 0) {
			wave += 1;
			spawnWave(wave);
		}
	}

	let horizontal = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
	let vertical = (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0);
	if (horizontal || vertical) {
		const length = Math.hypot(horizontal, vertical) || 1;
		horizontal /= length;
		vertical /= length;
		const next = { x: player.x + horizontal * player.speed * delta / 16, y: player.y + vertical * player.speed * delta / 16 };
		if (canMove(next.x, next.y)) {
			player.x = next.x;
			player.y = next.y;
		}
	}

	if (keys.has('ArrowLeft')) player.angle -= 0.08 * delta / 16;
	if (keys.has('ArrowRight')) player.angle += 0.08 * delta / 16;
	if (keys.has(' ') && player.cooldown <= 0) fire(player, true);
	if ((keys.has('e') || keys.has('q')) && player.blastCooldown <= 0 && player.charge >= 100) activateBurst();
	if (keys.has('m')) { cycleMap(); keys.delete('m'); }
	checkHazards();

	enemies.forEach((enemy) => updateEnemy(enemy, delta));
	bullets.forEach((bullet) => {
		bullet.x += Math.cos(bullet.angle) * bullet.speed * delta / 16;
		bullet.y += Math.sin(bullet.angle) * bullet.speed * delta / 16;
		bullet.life -= delta;
	});
	bullets = bullets.filter((bullet) => bullet.life > 0 && bullet.x > -20 && bullet.x < world.width + 20 && bullet.y > -20 && bullet.y < world.height + 20 && !hitsWall(bullet.x, bullet.y, 4));

	particles.forEach((particle) => {
		particle.x += particle.vx * delta / 16;
		particle.y += particle.vy * delta / 16;
		particle.life -= delta;
	});
	particles = particles.filter((particle) => particle.life > 0);

	pickups.forEach((pickup) => {
		pickup.life -= delta;
		pickup.pulse += delta * 0.006;
	});
	pickups = pickups.filter((pickup) => pickup.life > 0);

	checkBulletHits();
	checkPickups();
	updateHud();

	if (enemies.length === 0 && waveTransition <= 0) {
		if (wave >= 7) {
			endGame(true);
			return;
		}
		waveTransition = 1100;
		missionState.textContent = `第 ${wave + 1} 波 集结中`;
	}
}
function updateEnemy(enemy, delta) {
	enemy.cooldown -= delta;
	enemy.turnTimer -= delta;
	const targetAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
	const diff = normalizeAngle(targetAngle - enemy.angle);
	if (enemy.turnTimer <= 0) {
		enemy.angle += Math.sign(diff) * Math.min(Math.abs(diff), enemy.isBoss ? 0.7 : enemy.isElite ? 1.1 : 0.9);
		enemy.turnTimer = enemy.isBoss ? 230 + Math.random() * 420 : 420 + Math.random() * 900;
	} else {
		enemy.angle += diff * (enemy.isBoss ? 0.24 : enemy.isElite ? 0.18 : 0.14);
	}

	const next = {
		x: enemy.x + Math.cos(enemy.angle) * enemy.speed * delta / 16,
		y: enemy.y + Math.sin(enemy.angle) * enemy.speed * delta / 16
	};
	if (canMove(next.x, next.y, enemy) && Math.hypot(player.x - enemy.x, player.y - enemy.y) > (enemy.isBoss ? 100 : enemy.isElite ? 110 : 120)) {
		enemy.x = next.x;
		enemy.y = next.y;
	} else {
		enemy.angle += (Math.random() - 0.5) * (enemy.isBoss ? 2.8 : enemy.isElite ? 2.2 : 1.7);
	}

	if (enemy.cooldown <= 0) {
		enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
		fire(enemy, false, enemy.isBoss ? 5 : enemy.isElite ? 2 : 1);
		enemy.cooldown = enemy.isBoss ? 700 : enemy.isElite ? 850 : Math.max(650, 1100 - wave * 60 + Math.random() * 700);
	}
}
function normalizeAngle(angle) {
	while (angle > Math.PI) angle -= Math.PI * 2;
	while (angle < -Math.PI) angle += Math.PI * 2;
	return angle;
}
function canMove(x, y, ignore = null) {
	if (x < 24 || x > world.width - 24 || y < 24 || y > world.height - 24 || hitsWall(x, y, 18)) return false;
	return !enemies.some((enemy) => enemy !== ignore && Math.hypot(enemy.x - x, enemy.y - y) < enemy.radius + 24);
}
function hitsWall(x, y, padding = 18) {
	return walls.some((wall) => x + padding > wall.x && x - padding < wall.x + wall.width && y + padding > wall.y && y - padding < wall.y + wall.height);
}
function fire(tank, isPlayer, shotCountOverride = null) {
	const shotCount = shotCountOverride ?? (isPlayer ? Math.min(3, player.weaponLevel) : 1);
	const spread = shotCount > 1 ? 0.23 : 0;
	const extraBurst = isPlayer && player.weaponLevel >= 3 && player.charge > 60;
	const totalShots = shotCount + (extraBurst ? 1 : 0);
	for (let index = 0; index < totalShots; index += 1) {
		const angle = tank.angle + (totalShots === 1 ? 0 : (index - (totalShots - 1) / 2) * spread);
		bullets.push({
			x: tank.x + Math.cos(angle) * (tank.isBoss ? 35 : 28),
			y: tank.y + Math.sin(angle) * (tank.isBoss ? 35 : 28),
			angle,
			speed: isPlayer ? 8.4 : (tank.isBoss ? 7.3 : 6.2),
			life: isPlayer ? 1700 : (tank.isBoss ? 1800 : 1500),
			isPlayer,
			radius: tank.isBoss ? 5 : 4
		});
	}
	tank.cooldown = isPlayer ? (player.weaponLevel >= 3 ? 150 : 260) : (tank.isBoss ? 700 : 900);
}
function activateBurst() {
	player.charge = 0;
	player.blastCooldown = 3000;
	explode(player.x, player.y, '#81d2c3');
	for (const enemy of enemies) {
		if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < 170) {
			enemy.health -= 2;
			enemy.x += Math.cos(Math.atan2(enemy.y - player.y, enemy.x - player.x)) * 18;
			enemy.y += Math.sin(Math.atan2(enemy.y - player.y, enemy.x - player.x)) * 18;
			if (enemy.health <= 0) {
				score += enemy.reward;
				explode(enemy.x, enemy.y, '#81d2c3');
				enemies.splice(enemies.indexOf(enemy), 1);
				maybeDropPickup(enemy.x, enemy.y);
			}
		}
	}
	bullets = bullets.filter((bullet) => {
		const near = Math.hypot(player.x - bullet.x, player.y - bullet.y) < 170;
		return !near || bullet.isPlayer;
	});
}
function checkBulletHits() {
	bullets = bullets.filter((bullet) => {
		if (bullet.isPlayer) {
			const targetIndex = enemies.findIndex((enemy) => Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.radius + bullet.radius);
			if (targetIndex > -1) {
				const target = enemies[targetIndex];
				target.health -= 1 + (player.weaponLevel >= 3 ? 1 : 0);
				explode(bullet.x, bullet.y, '#ffd18c');
				if (target.health <= 0) {
					explode(target.x, target.y, '#f26f3d');
					score += target.reward;
					enemies.splice(targetIndex, 1);
					maybeDropPickup(target.x, target.y);
				}
				return false;
			}
		} else if (player.invulnerable <= 0 && Math.hypot(player.x - bullet.x, player.y - bullet.y) < player.radius + bullet.radius) {
			const dmg = bullet.radius >= 5 ? 2 : 1;
			explode(player.x, player.y, '#ffad58');
			if (player.shield > 0) {
				player.shield = Math.max(0, player.shield - dmg * 18);
				missionState.textContent = '护盾受损';
			} else {
				player.lives -= 1;
				missionState.textContent = '受创严重';
			}
			player.invulnerable = 1600;
			player.x = 480;
			player.y = 545;
			if (player.lives <= 0) {
				endGame(false);
				return false;
			}
			return false;
		}
		return true;
	});
}
function checkHazards() {
	for (const hazard of hazards) {
		if (Math.hypot(player.x - hazard.x, player.y - hazard.y) < hazard.radius + player.radius + 6) {
			explode(hazard.x, hazard.y, '#ffb15a');
			hazard.life = 0;
			if (player.shield > 0) {
				player.shield = Math.max(0, player.shield - 30);
			} else {
				player.lives -= 1;
			}
			player.x = 480;
			player.y = 545;
			player.invulnerable = 1200;
			if (player.lives <= 0) {
				endGame(false);
				return;
			}
		}
	}
	hazards = hazards.filter((hazard) => hazard.life > 0);
}
function maybeDropPickup(x, y) {
	if (Math.random() > 0.28) return;
	const roll = Math.random();
	const kind = roll < 0.34 ? 'power' : roll < 0.68 ? 'repair' : 'shield';
	pickups.push({ x, y, radius: 10, kind, life: 12000, pulse: Math.random() * Math.PI * 2 });
}
function checkPickups() {
	pickups = pickups.filter((pickup) => {
		if (Math.hypot(player.x - pickup.x, player.y - pickup.y) < player.radius + pickup.radius + 6) {
			if (pickup.kind === 'power') {
				player.weaponLevel = Math.min(3, player.weaponLevel + 1);
				missionState.textContent = '武器升级';
			} else if (pickup.kind === 'repair') {
				player.lives = Math.min(5, player.lives + 1);
				missionState.textContent = '修理完成';
			} else {
				player.shield = Math.min(100, player.shield + 30);
				missionState.textContent = '护盾修复';
			}
			explode(pickup.x, pickup.y, pickup.kind === 'power' ? '#86d5ff' : pickup.kind === 'repair' ? '#7fe7a6' : '#8fe9ff');
			return false;
		}
		return pickup.life > 0;
	});
}
function explode(x, y, color) {
	for (let i = 0; i < 16; i += 1) {
		const angle = Math.random() * Math.PI * 2;
		particles.push({
			x,
			y,
			vx: Math.cos(angle) * (1 + Math.random() * 3),
			vy: Math.sin(angle) * (1 + Math.random() * 3),
			life: 320 + Math.random() * 360,
			color
		});
	}
}
function draw() {
	const stage = maps[mapIndex];
	context.fillStyle = stage.bg;
	context.fillRect(0, 0, world.width, world.height);
	context.strokeStyle = stage.grid;
	context.lineWidth = 1;
	for (let x = 0; x < world.width; x += 32) {
		context.beginPath();
		context.moveTo(x, 0);
		context.lineTo(x, world.height);
		context.stroke();
	}
	for (let y = 0; y < world.height; y += 32) {
		context.beginPath();
		context.moveTo(0, y);
		context.lineTo(world.width, y);
		context.stroke();
	}
	walls.forEach((wall) => drawWall(wall, stage.wall));
	hazards.forEach(drawHazard);
	enemies.forEach((enemy) => drawTank(enemy, false));
	if (player.invulnerable <= 0 || Math.floor(player.invulnerable / 100) % 2 === 0) drawTank(player, true);
	pickups.forEach(drawPickup);
	bullets.forEach(drawBullet);
	particles.forEach(drawParticle);
}
function drawWall(wall, wallColor) {
	context.fillStyle = wallColor;
	context.fillRect(wall.x, wall.y, wall.width, wall.height);
	context.strokeStyle = 'rgba(255,255,255,.18)';
	context.strokeRect(wall.x + 3, wall.y + 3, wall.width - 6, wall.height - 6);
	context.fillStyle = 'rgba(242,111,61,.13)';
	context.fillRect(wall.x, wall.y, 8, wall.height);
}
function drawHazard(hazard) {
	context.save();
	context.translate(hazard.x, hazard.y);
	context.fillStyle = '#ffb15a';
	context.beginPath();
	context.moveTo(0, -10);
	context.lineTo(9, 8);
	context.lineTo(-9, 8);
	context.closePath();
	context.fill();
	context.restore();
}
function drawTank(tank, isPlayer) {
	context.save();
	context.translate(tank.x, tank.y);
	context.rotate(tank.angle);
	context.fillStyle = '#080b0a';
	context.fillRect(-21, -20, 42, 40);
	context.fillStyle = isPlayer ? '#d27a43' : tank.color;
	context.fillRect(-16, -16, 32, 32);
	context.fillStyle = isPlayer ? '#e5a15b' : '#e06a4b';
	context.fillRect(-9, -10, 18, 20);
	context.fillStyle = '#0b0e0c';
	context.fillRect(7, -4, 25, 8);
	context.strokeStyle = 'rgba(255,255,255,.28)';
	context.strokeRect(-16, -16, 32, 32);
	if (!isPlayer) {
		context.fillStyle = 'rgba(255,255,255,0.32)';
		context.fillRect(-16, -22, 32 * (tank.health / tank.maxHealth), 5);
	}
	context.restore();
}
function drawPickup(pickup) {
	const color = pickup.kind === 'power' ? '#86d5ff' : pickup.kind === 'repair' ? '#7fe7a6' : '#8fe9ff';
	const pulse = 1 + Math.sin(pickup.pulse) * 0.18;
	context.save();
	context.translate(pickup.x, pickup.y);
	context.scale(pulse, pulse);
	context.fillStyle = color;
	context.beginPath();
	context.moveTo(0, -10);
	context.lineTo(10, 0);
	context.lineTo(0, 10);
	context.lineTo(-10, 0);
	context.closePath();
	context.fill();
	context.restore();
}
function drawBullet(bullet) {
	context.fillStyle = bullet.isPlayer ? '#ffd18c' : '#f26f3d';
	context.beginPath();
	context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
	context.fill();
}
function drawParticle(particle) {
	context.globalAlpha = Math.max(0, particle.life / 650);
	context.fillStyle = particle.color;
	context.fillRect(particle.x, particle.y, 4, 4);
	context.globalAlpha = 1;
}
function endGame(won) {
	gameState = won ? 'won' : 'lost';
	missionState.textContent = won ? '任务完成' : '信号中断';
	overlayTitle.textContent = won ? '边境守住了' : '防线失守';
	overlayCopy.textContent = won ? `最终得分 ${score}，你已成功击退 ${wave} 波敌人并守住了 ${maps[mapIndex].name}。` : `最终得分 ${score}，请再试一次守住边境。`;
	overlay.hidden = false;
}
function frame(time) {
	const delta = Math.min(40, time - lastTime || 16);
	lastTime = time;
	update(delta);
	draw();
	requestAnimationFrame(frame);
}
window.addEventListener('keydown', (event) => {
	if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'e', 'm'].includes(event.key)) event.preventDefault();
	keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
});
window.addEventListener('keyup', (event) => {
	keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
});
restartButton.addEventListener('click', resetGame);
overlayButton.addEventListener('click', resetGame);
resetGame();
requestAnimationFrame(frame);
