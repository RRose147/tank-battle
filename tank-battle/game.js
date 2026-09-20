const canvas = document.querySelector('#battlefield');
const context = canvas.getContext('2d');
const scoreElement = document.querySelector('#score');
const livesElement = document.querySelector('#lives');
const enemiesElement = document.querySelector('#enemies');
const missionState = document.querySelector('#missionState');
const overlay = document.querySelector('#overlay');
const overlayTitle = document.querySelector('#overlayTitle');
const overlayCopy = document.querySelector('#overlayCopy');
const restartButton = document.querySelector('#restartButton');
const overlayButton = document.querySelector('#overlayButton');
const world = { width: canvas.width, height: canvas.height };
const keys = new Set();
const walls = [
	{ x: 180, y: 90, width: 190, height: 28 }, { x: 590, y: 90, width: 190, height: 28 },
	{ x: 180, y: 482, width: 190, height: 28 }, { x: 590, y: 482, width: 190, height: 28 },
	{ x: 90, y: 250, width: 180, height: 28 }, { x: 690, y: 250, width: 180, height: 28 },
	{ x: 420, y: 190, width: 120, height: 28 }, { x: 420, y: 382, width: 120, height: 28 }
];
let player; let enemies; let bullets; let particles; let score; let gameState; let lastTime = 0;

function resetGame() {
	player = { x: 480, y: 545, angle: -Math.PI / 2, speed: 2.7, cooldown: 0, lives: 3, invulnerable: 0 };
	enemies = [createEnemy(110, 90, .35), createEnemy(850, 90, .9), createEnemy(100, 400, -.5), createEnemy(860, 400, -1.1)];
	bullets = []; particles = []; score = 0; gameState = 'playing'; overlay.hidden = true; missionState.textContent = '作战中'; updateHud();
}
function createEnemy(x, y, angle) { return { x, y, angle, speed: .75, cooldown: 800 + Math.random() * 700, turnTimer: 600 + Math.random() * 1000, color: '#bc4c3b' }; }
function updateHud() { scoreElement.textContent = String(score).padStart(4, '0'); livesElement.textContent = String(player.lives).padStart(2, '0'); enemiesElement.textContent = String(enemies.length).padStart(2, '0'); }
function update(delta) {
	if (gameState !== 'playing') return;
	player.invulnerable = Math.max(0, player.invulnerable - delta); player.cooldown = Math.max(0, player.cooldown - delta);
	let horizontal = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0); let vertical = (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0);
	if (horizontal || vertical) { const length = Math.hypot(horizontal, vertical); horizontal /= length; vertical /= length; const next = { x: player.x + horizontal * player.speed * delta / 16, y: player.y + vertical * player.speed * delta / 16 }; if (canMove(next.x, next.y)) { player.x = next.x; player.y = next.y; } }
	if (keys.has('ArrowLeft')) player.angle -= .07 * delta / 16; if (keys.has('ArrowRight')) player.angle += .07 * delta / 16; if (keys.has(' ') && player.cooldown <= 0) fire(player, true);
	enemies.forEach((enemy) => updateEnemy(enemy, delta)); bullets.forEach((bullet) => { bullet.x += Math.cos(bullet.angle) * bullet.speed * delta / 16; bullet.y += Math.sin(bullet.angle) * bullet.speed * delta / 16; bullet.life -= delta; });
	bullets = bullets.filter((bullet) => bullet.life > 0 && bullet.x > -20 && bullet.x < world.width + 20 && bullet.y > -20 && bullet.y < world.height + 20 && !hitsWall(bullet.x, bullet.y)); checkBulletHits();
	particles.forEach((particle) => { particle.x += particle.vx * delta / 16; particle.y += particle.vy * delta / 16; particle.life -= delta; }); particles = particles.filter((particle) => particle.life > 0); updateHud(); if (enemies.length === 0) endGame(true);
}
function updateEnemy(enemy, delta) {
	enemy.cooldown -= delta; enemy.turnTimer -= delta; if (enemy.turnTimer <= 0) { enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x) + (Math.random() - .5) * 1.2; enemy.turnTimer = 700 + Math.random() * 1000; }
	const next = { x: enemy.x + Math.cos(enemy.angle) * enemy.speed * delta / 16, y: enemy.y + Math.sin(enemy.angle) * enemy.speed * delta / 16 }; if (canMove(next.x, next.y) && Math.hypot(player.x - enemy.x, player.y - enemy.y) > 170) { enemy.x = next.x; enemy.y = next.y; } else if (!canMove(next.x, next.y)) enemy.angle += Math.PI / 2;
	if (enemy.cooldown <= 0) { enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x); fire(enemy, false); enemy.cooldown = 1100 + Math.random() * 900; }
}
function canMove(x, y) { if (x < 24 || x > world.width - 24 || y < 24 || y > world.height - 24 || hitsWall(x, y)) return false; return !enemies.some((enemy) => Math.hypot(enemy.x - x, enemy.y - y) < 37 && enemy.x !== x); }
function hitsWall(x, y) { return walls.some((wall) => x > wall.x - 19 && x < wall.x + wall.width + 19 && y > wall.y - 19 && y < wall.y + wall.height + 19); }
function fire(tank, isPlayer) { bullets.push({ x: tank.x + Math.cos(tank.angle) * 27, y: tank.y + Math.sin(tank.angle) * 27, angle: tank.angle, speed: 7, life: 1500, isPlayer }); tank.cooldown = isPlayer ? 280 : 900; }
function checkBulletHits() {
	bullets = bullets.filter((bullet) => {
		if (bullet.isPlayer) { const targetIndex = enemies.findIndex((enemy) => Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < 23); if (targetIndex > -1) { explode(enemies[targetIndex].x, enemies[targetIndex].y, '#f26f3d'); enemies.splice(targetIndex, 1); score += 250; return false; } }
		else if (player.invulnerable <= 0 && Math.hypot(player.x - bullet.x, player.y - bullet.y) < 22) { explode(player.x, player.y, '#ffad58'); player.lives -= 1; player.invulnerable = 1600; player.x = 480; player.y = 545; if (player.lives <= 0) endGame(false); return false; } return true;
	});
}
function explode(x, y, color) { for (let i = 0; i < 16; i += 1) { const angle = Math.random() * Math.PI * 2; particles.push({ x, y, vx: Math.cos(angle) * (1 + Math.random() * 3), vy: Math.sin(angle) * (1 + Math.random() * 3), life: 300 + Math.random() * 350, color }); } }
function draw() {
	context.fillStyle = '#0d1211'; context.fillRect(0, 0, world.width, world.height); context.strokeStyle = 'rgba(151,167,143,.08)'; context.lineWidth = 1;
	for (let x = 0; x < world.width; x += 32) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, world.height); context.stroke(); } for (let y = 0; y < world.height; y += 32) { context.beginPath(); context.moveTo(0, y); context.lineTo(world.width, y); context.stroke(); }
	walls.forEach(drawWall); enemies.forEach((enemy) => drawTank(enemy, false)); if (player.invulnerable <= 0 || Math.floor(player.invulnerable / 100) % 2 === 0) drawTank(player, true); bullets.forEach(drawBullet); particles.forEach(drawParticle);
}
function drawWall(wall) { context.fillStyle = '#2e3831'; context.fillRect(wall.x, wall.y, wall.width, wall.height); context.strokeStyle = '#596653'; context.strokeRect(wall.x + 3, wall.y + 3, wall.width - 6, wall.height - 6); context.fillStyle = 'rgba(242,111,61,.13)'; context.fillRect(wall.x, wall.y, 8, wall.height); }
function drawTank(tank, isPlayer) { context.save(); context.translate(tank.x, tank.y); context.rotate(tank.angle); context.fillStyle = '#080b0a'; context.fillRect(-21, -20, 42, 40); context.fillStyle = isPlayer ? '#d27a43' : tank.color; context.fillRect(-16, -16, 32, 32); context.fillStyle = isPlayer ? '#e5a15b' : '#e06a4b'; context.fillRect(-9, -10, 18, 20); context.fillStyle = '#0b0e0c'; context.fillRect(7, -4, 25, 8); context.strokeStyle = 'rgba(255,255,255,.28)'; context.strokeRect(-16, -16, 32, 32); context.restore(); }
function drawBullet(bullet) { context.fillStyle = bullet.isPlayer ? '#ffd18c' : '#f26f3d'; context.beginPath(); context.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2); context.fill(); }
function drawParticle(particle) { context.globalAlpha = Math.max(0, particle.life / 650); context.fillStyle = particle.color; context.fillRect(particle.x, particle.y, 4, 4); context.globalAlpha = 1; }
function endGame(won) { gameState = won ? 'won' : 'lost'; missionState.textContent = won ? '任务完成' : '信号中断'; overlayTitle.textContent = won ? '边境守住了' : '防线失守'; overlayCopy.textContent = won ? `最终得分 ${score}，所有敌方坦克已被清除。` : '你的坦克已无法继续作战。'; overlay.hidden = false; }
function frame(time) { const delta = Math.min(40, time - lastTime || 16); lastTime = time; update(delta); draw(); requestAnimationFrame(frame); }
window.addEventListener('keydown', (event) => { if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault(); keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key); });
window.addEventListener('keyup', (event) => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key)); restartButton.addEventListener('click', resetGame); overlayButton.addEventListener('click', resetGame); resetGame(); requestAnimationFrame(frame);
