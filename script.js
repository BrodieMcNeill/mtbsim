const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const bikeImg = new Image();
bikeImg.src = "bike.png";

let lastTime = 0;

let bike = {
  x: 200,
  y: 300,
  width: 300,
  height: 150,
  speed: 0,
  velocityY: 0,
  grounded: false,
  rotation: 0,
  rotationSpeed: 0
};

const gravity = 2000;
const groundLevel = canvas.height - 150;

let keys = {};
let particles = [];

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

function createParticles(x, y, amount) {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x: x,
      y: y,
      size: Math.random() * 6 + 2,
      speedX: (Math.random() - 0.5) * 200,
      speedY: Math.random() * -300,
      life: 1
    });
  }
}

function updateParticles(deltaTime) {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];

    p.x += p.speedX * deltaTime;
    p.y += p.speedY * deltaTime;
    p.speedY += 800 * deltaTime;
    p.life -= deltaTime;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  ctx.fillStyle = "#6b4f2a";
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function update(deltaTime) {

  // Horizontal movement (smoother acceleration)
  if (keys["ArrowRight"]) {
    bike.speed += 2000 * deltaTime;
  } else if (keys["ArrowLeft"]) {
    bike.speed -= 2000 * deltaTime;
  } else {
    bike.speed *= 0.95;
  }

  bike.speed = Math.max(-600, Math.min(600, bike.speed));
  bike.x += bike.speed * deltaTime;

  // Jump
  if (keys["ArrowUp"] && bike.grounded) {
    bike.velocityY = -900;
    bike.grounded = false;
  }

  // Gravity
  bike.velocityY += gravity * deltaTime;
  bike.y += bike.velocityY * deltaTime;

  // Air rotation
  if (!bike.grounded) {
    if (keys["ArrowRight"]) {
      bike.rotationSpeed += 5 * deltaTime;
    }
    if (keys["ArrowLeft"]) {
      bike.rotationSpeed -= 5 * deltaTime;
    }
  } else {
    // Auto straighten when on ground
    bike.rotation *= 0.8;
    bike.rotationSpeed *= 0.8;
  }

  bike.rotation += bike.rotationSpeed;

  // Landing
  if (bike.y >= groundLevel) {
    if (!bike.grounded) {
      createParticles(
        bike.x + bike.width / 2,
        groundLevel + bike.height - 20,
        30
      );
    }

    bike.y = groundLevel;
    bike.velocityY = 0;
    bike.grounded = true;
  }

  // Dirt trail
  if (bike.grounded && Math.abs(bike.speed) > 100) {
    createParticles(
      bike.x + bike.width / 2,
      groundLevel + bike.height - 10,
      2
    );
  }

  updateParticles(deltaTime);
}

function drawGround() {
  ctx.fillStyle = "#3e8e41";
  ctx.fillRect(0, groundLevel + bike.height - 30, canvas.width, 200);
}

function drawBike() {
  ctx.save();

  ctx.translate(bike.x + bike.width / 2, bike.y + bike.height / 2);
  ctx.rotate(bike.rotation);

  ctx.drawImage(
    bikeImg,
    -bike.width / 2,
    -bike.height / 2,
    bike.width,
    bike.height
  );

  ctx.restore();
}

function gameLoop(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  update(deltaTime);
  drawGround();
  drawParticles();
  drawBike();

  requestAnimationFrame(gameLoop);
}

bikeImg.onload = () => {
  requestAnimationFrame(gameLoop);
};
