const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const bikeImg = new Image();
bikeImg.src = "bike.png";

let lastTime = 0;
let cameraX = 0;
let score = 0;
let coinsCollected = 0;
let crashed = false;
let timer = 0;
let nextMilestone = 500;

const keys = {};
const particles = [];

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (e.key.toLowerCase() === "r") resetGame();
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

const bike = {
  x: 200,
  y: 0,
  wheelBase: 140,
  wheelRadius: 35,
  speed: 0,
  velocityY: 0,
  rotation: 0,
  rotationSpeed: 0,
  groundedFront: false,
  groundedRear: false,
  suspension: 0,
  completedFlips: 0,
  currentFlipDirection: 0,
  currentAirRotation: 0
};

const boosts = [1500, 3200, 5600, 8200];
const hazards = [2400, 4100, 6900, 9100];
const coins = Array.from({ length: 30 }, (_, i) => ({
  x: 650 + i * 420,
  yOffset: (i % 3) * 70 + 90,
  collected: false
}));

function resetBike() {
  bike.x = 200;
  bike.y = 0;
  bike.speed = 0;
  bike.velocityY = 0;
  bike.rotation = 0;
  bike.rotationSpeed = 0;
  bike.groundedFront = false;
  bike.groundedRear = false;
  bike.suspension = 0;
  bike.completedFlips = 0;
  bike.currentFlipDirection = 0;
  bike.currentAirRotation = 0;
}

function resetGame() {
  resetBike();
  score = 0;
  coinsCollected = 0;
  crashed = false;
  timer = 0;
  cameraX = 0;
  nextMilestone = 500;
  particles.length = 0;
  coins.forEach((coin) => {
    coin.collected = false;
  });
}

function getGroundHeight(x) {
  return canvas.height - 320 +
    x * 0.05 +
    Math.sin(x * 0.002) * 140 +
    Math.sin(x * 0.01) * 45;
}

function createParticles(x, y, amount, color = "#6b4f2a") {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x,
      y,
      size: Math.random() * 5 + 2,
      speedX: (Math.random() - 0.5) * 300,
      speedY: Math.random() * -420,
      life: 1,
      color
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.speedX * dt;
    p.y += p.speedY * dt;
    p.speedY += 1000 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.globalAlpha = Math.max(p.life, 0.1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - cameraX, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function updateAirFlips() {
  if (bike.groundedRear && bike.groundedFront) {
    bike.currentFlipDirection = 0;
    bike.currentAirRotation = 0;
    return;
  }

  if (bike.rotationSpeed === 0) return;

  const direction = Math.sign(bike.rotationSpeed);

  if (bike.currentFlipDirection === 0 || direction !== bike.currentFlipDirection) {
    bike.currentFlipDirection = direction;
    bike.currentAirRotation = 0;
  }

  bike.currentAirRotation += Math.abs(bike.rotationSpeed);

  while (bike.currentAirRotation >= Math.PI * 2) {
    bike.currentAirRotation -= Math.PI * 2;
    bike.completedFlips += 1;
    score += 150;
    createParticles(bike.x, bike.y, 10, "#f5b700");
  }
}

function update(dt) {
  if (crashed) return;

  timer += dt;

  if (keys["ArrowRight"]) bike.speed += 2500 * dt;
  else if (keys["ArrowLeft"]) bike.speed -= 2500 * dt;
  else bike.speed *= 0.985;

  bike.speed = Math.max(-850, Math.min(900, bike.speed));
  bike.x += bike.speed * dt;

  if (keys["ArrowUp"] && bike.groundedRear && bike.groundedFront) {
    bike.velocityY = -1100;
    bike.groundedRear = false;
    bike.groundedFront = false;
  }

  bike.velocityY += 2100 * dt;
  bike.y += bike.velocityY * dt;

  if (!bike.groundedRear || !bike.groundedFront) {
    if (keys["ArrowRight"]) bike.rotationSpeed += 6 * dt;
    if (keys["ArrowLeft"]) bike.rotationSpeed -= 6 * dt;
  } else {
    bike.rotationSpeed *= 0.7;
  }

  bike.rotationSpeed = Math.max(-0.22, Math.min(0.22, bike.rotationSpeed));
  bike.rotation += bike.rotationSpeed;

  updateAirFlips();

  const rearWheel = {
    x: bike.x,
    y: bike.y + bike.wheelRadius
  };
  const frontWheel = {
    x: bike.x + Math.cos(bike.rotation) * bike.wheelBase,
    y: bike.y + Math.sin(bike.rotation) * bike.wheelBase + bike.wheelRadius
  };

  const rearGround = getGroundHeight(rearWheel.x);
  const frontGround = getGroundHeight(frontWheel.x);

  if (rearWheel.y >= rearGround) {
    if (!bike.groundedRear) {
      createParticles(rearWheel.x, rearGround, 20);
      if (Math.abs((bike.rotation % (Math.PI * 2))) > Math.PI * 0.62) {
        crashed = true;
        createParticles(bike.x, bike.y, 60, "#ff4d4d");
      } else {
        score += bike.completedFlips * 120;
        bike.completedFlips = 0;
      }
      bike.suspension = 25;
    }
    bike.y = rearGround - bike.wheelRadius;
    bike.velocityY = 0;
    bike.groundedRear = true;
  } else {
    bike.groundedRear = false;
  }

  bike.groundedFront = frontWheel.y >= frontGround;

  bike.suspension *= 0.8;

  boosts.forEach((boostX) => {
    if (Math.abs(bike.x - boostX) < 45) {
      bike.speed += 1800;
      score += 2;
      createParticles(bike.x, bike.y, 20, "#59d9ff");
    }
  });

  hazards.forEach((hazardX) => {
    const hazardY = getGroundHeight(hazardX);
    if (Math.abs(bike.x - hazardX) < 50 && bike.y + bike.wheelRadius > hazardY - 30) {
      crashed = true;
      createParticles(bike.x, bike.y, 70, "#ff4d4d");
    }
  });

  coins.forEach((coin) => {
    if (coin.collected) return;

    const coinY = getGroundHeight(coin.x) - coin.yOffset;
    const dx = bike.x - coin.x;
    const dy = bike.y - coinY;
    if (dx * dx + dy * dy < 3600) {
      coin.collected = true;
      coinsCollected += 1;
      score += 75;
      createParticles(coin.x, coinY, 16, "#ffd75f");
    }
  });

  if (bike.x > nextMilestone) {
    score += 50;
    nextMilestone += 500;
  }

  if ((bike.groundedRear || bike.groundedFront) && Math.abs(bike.speed) > 130) {
    createParticles(bike.x + 50, bike.y + bike.wheelRadius, 2);
  }

  updateParticles(dt);

  cameraX += ((bike.x - canvas.width / 2) - cameraX) * 0.08;
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#4fa0ff");
  gradient.addColorStop(1, "#b7e27c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGround() {
  ctx.fillStyle = "#3e8e41";
  ctx.beginPath();
  ctx.moveTo(-cameraX, canvas.height);
  for (let x = cameraX - 100; x < cameraX + canvas.width + 100; x += 20) {
    ctx.lineTo(x - cameraX, getGroundHeight(x));
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.fill();

  boosts.forEach((b) => {
    ctx.fillStyle = "#f7ff4a";
    ctx.fillRect(b - cameraX - 25, getGroundHeight(b) - 10, 50, 10);
  });

  hazards.forEach((h) => {
    const y = getGroundHeight(h);
    ctx.fillStyle = "#8b2c2c";
    ctx.beginPath();
    ctx.moveTo(h - cameraX - 25, y);
    ctx.lineTo(h - cameraX, y - 35);
    ctx.lineTo(h - cameraX + 25, y);
    ctx.closePath();
    ctx.fill();
  });
}

function drawCoins() {
  coins.forEach((coin) => {
    if (coin.collected) return;

    const coinY = getGroundHeight(coin.x) - coin.yOffset;
    ctx.fillStyle = "#ffd75f";
    ctx.beginPath();
    ctx.arc(coin.x - cameraX, coinY, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#fff5bf";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawBike() {
  ctx.save();
  ctx.translate(bike.x - cameraX + bike.wheelBase / 2, bike.y + bike.wheelRadius + bike.suspension);
  ctx.rotate(bike.rotation);
  ctx.drawImage(bikeImg, -bike.wheelBase / 2, -bike.wheelRadius, bike.wheelBase, bike.wheelRadius * 2);
  ctx.restore();
}

function drawUI() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(16, 16, 320, 132);

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.fillText(`Score: ${score}`, 30, 48);
  ctx.fillText(`Coins: ${coinsCollected}/${coins.length}`, 30, 78);
  ctx.fillText(`Distance: ${Math.max(0, Math.floor(bike.x / 10))}m`, 30, 108);
  ctx.fillText(`Time: ${timer.toFixed(1)}s`, 30, 138);

  if (crashed) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff5959";
    ctx.font = "64px Arial";
    ctx.fillText("CRASHED!", canvas.width / 2 - 160, canvas.height / 2 - 30);
    ctx.fillStyle = "#ffffff";
    ctx.font = "32px Arial";
    ctx.fillText("Press R to Restart", canvas.width / 2 - 145, canvas.height / 2 + 20);
  }
}

function gameLoop(timestamp) {
  const dt = Math.min(0.032, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;

  drawSky();
  update(dt);
  drawGround();
  drawCoins();
  drawParticles();
  drawBike();
  drawUI();

  requestAnimationFrame(gameLoop);
}

bikeImg.onload = () => {
  resetGame();
  requestAnimationFrame(gameLoop);
};
