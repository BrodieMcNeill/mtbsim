const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const bikeImg = new Image();
bikeImg.src = "bike.png";

let lastTime = 0;
let cameraX = 0;
let score = 0;
let combo = 0;
let comboTimer = 0;
let flipCount = 0;
let crashed = false;
let timer = 0;

let keys = {};
let particles = [];

document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

let bike = {
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
  suspension: 0
};

// Boost pad positions
let boosts = [1500, 3000, 4500];

function getGroundHeight(x) {
  // Downhill with bumps
  return canvas.height - 300 +
    x * 0.05 +
    Math.sin(x * 0.002) * 150 +
    Math.sin(x * 0.01) * 40;
}

function createParticles(x, y, amount) {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x,
      y,
      size: Math.random() * 5 + 2,
      speedX: (Math.random() - 0.5) * 300,
      speedY: Math.random() * -400,
      life: 1
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.speedX * dt;
    p.y += p.speedY * dt;
    p.speedY += 1000 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  ctx.fillStyle = "#6b4f2a";
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x - cameraX, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function update(dt) {
  if (crashed) return;

  // Timer
  timer += dt;

  // Horizontal movement
  if (keys["ArrowRight"]) bike.speed += 2500 * dt;
  else if (keys["ArrowLeft"]) bike.speed -= 2500 * dt;
  else bike.speed *= 0.98;

  bike.speed = Math.max(-800, Math.min(800, bike.speed));
  bike.x += bike.speed * dt;

  // Jump
  if (keys["ArrowUp"] && bike.groundedRear && bike.groundedFront) {
    bike.velocityY = -1000;
    bike.groundedRear = false;
    bike.groundedFront = false;
  }

  // Gravity
  bike.velocityY += 2000 * dt;
  bike.y += bike.velocityY * dt;

  // Air rotation
  if (!bike.groundedRear || !bike.groundedFront) {
    if (keys["ArrowRight"]) bike.rotationSpeed += 6 * dt;
    if (keys["ArrowLeft"]) bike.rotationSpeed -= 6 * dt;
  } else {
    bike.rotationSpeed *= 0.7;
  }

  bike.rotation += bike.rotationSpeed;

  // Flip detection
  if (!bike.groundedRear && !bike.groundedFront) {
    if (Math.abs(bike.rotation) > Math.PI * 2) {
      flipCount++;
      bike.rotation = bike.rotation % (Math.PI * 2);
    }
  }

  // Wheel positions
  let rearWheel = {
    x: bike.x,
    y: bike.y + bike.wheelRadius
  };
  let frontWheel = {
    x: bike.x + Math.cos(bike.rotation) * bike.wheelBase,
    y: bike.y + Math.sin(bike.rotation) * bike.wheelBase + bike.wheelRadius
  };

  // Ground heights
  let rearGround = getGroundHeight(rearWheel.x);
  let frontGround = getGroundHeight(frontWheel.x);

  // Rear wheel collision
  if (rearWheel.y >= rearGround) {
    if (!bike.groundedRear) {
      createParticles(rearWheel.x, rearGround, 20);

      // Crash if upside down
      if (Math.abs(bike.rotation % (Math.PI * 2)) > Math.PI / 2) crashed = true;
      else {
        score += flipCount * 100;
        flipCount = 0;
      }

      bike.suspension = 25;
    }
    bike.y = rearGround - bike.wheelRadius;
    bike.velocityY = 0;
    bike.groundedRear = true;
  } else bike.groundedRear = false;

  // Front wheel collision
  if (frontWheel.y >= frontGround) {
    bike.groundedFront = true;
  } else bike.groundedFront = false;

  // Suspension bounce
  bike.suspension *= 0.8;

  // Boost pads
  boosts.forEach(boostX => {
    if (Math.abs(bike.x - boostX) < 50) {
      bike.speed += 2000;
      createParticles(bike.x, bike.y, 30);
    }
  });

  // Combo system
  if (comboTimer > 0) comboTimer -= dt;
  else if (combo > 0) {
    score += combo * 200;
    combo = 0;
  }

  // Dirt while riding
  if ((bike.groundedRear || bike.groundedFront) && Math.abs(bike.speed) > 100) {
    createParticles(bike.x + 50, bike.y + bike.wheelRadius, 2);
  }

  updateParticles(dt);

  // Camera follow
  cameraX += ((bike.x - canvas.width / 2) - cameraX) * 0.08;
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

  // Draw boost pads
  boosts.forEach(b => {
    ctx.fillStyle = "yellow";
    ctx.fillRect(b - cameraX - 25, getGroundHeight(b) - 10, 50, 10);
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
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.fillText("Score: " + score, 30, 50);
  ctx.fillText("Time: " + timer.toFixed(2), 30, 80);
  if (crashed) {
    ctx.fillStyle = "red";
    ctx.font = "60px Arial";
    ctx.fillText("CRASHED!", canvas.width / 2 - 150, canvas.height / 2);
  }
}

function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  update(dt);
  drawGround();
  drawParticles();
  drawBike();
  drawUI();

  requestAnimationFrame(gameLoop);
}

bikeImg.onload = () => {
  requestAnimationFrame(gameLoop);
};
