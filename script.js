const gameArea = document.getElementById("gameArea");
const levelSpan = document.getElementById("level");
const scoreSpan = document.getElementById("score");
const bar = document.getElementById("bar");
const endScreen = document.getElementById("endScreen");
const finalScore = document.getElementById("finalScore");
const jumpSound = document.getElementById("jumpSound");
const finishSound = document.getElementById("finishSound");

let player, playerPos, velocityY, onGround;
let rotation = 0;
let tilt = 0;
let direction = 1;
let keys = {};
let score = 0;
let level = 1;
const MAX_LEVEL = 30;

let platforms = [];
let windForce = 0;
let lowGravityZone = false;

// ===== فيزياء ناعمة وبطيئة =====
let gravityUp = 0.7;
let gravityDown = 0.9;
const jumpPower = 7;
const moveSpeed = 2;

// إنشاء اللاعب
function createPlayer() {
  player = document.createElement("div");
  player.id = "player";
  gameArea.appendChild(player);
  playerPos = { x: 10, y: 0 };
  velocityY = 0;
  onGround = false;
  rotation = 0;
  tilt = 0;
  updatePlayer();
}

// تحديث موقع اللاعب
function updatePlayer() {
  player.style.left = playerPos.x + "px";
  player.style.bottom = playerPos.y + "px";
  player.style.transform = `rotate(${rotation}deg) skewX(${tilt}deg)`;
}

// ===== نظام المراحل الذكي =====
function createPlatforms() {
  platforms.forEach(p => p.el.remove());
  platforms = [];

  windForce = 0;
  lowGravityZone = false;

  const count = 4 + Math.floor(level / 2);

  for (let i = 0; i < count; i++) {
    const x = 40 + Math.random() * 480;
    const y = 50 + i * (260 / count);

    const moving = level >= 6 && Math.random() > 0.5;
    const disappearing = level >= 11 && Math.random() > 0.6;

    addPlatform(x, y, moving, disappearing);
  }

  // رياح
  if (level >= 16) {
    windForce = (Math.random() > 0.5 ? 1 : -1) * (0.4 + level * 0.03);
  }

  // جاذبية منخفضة
  if (level >= 21) {
    lowGravityZone = true;
  }
}

// إضافة منصة
function addPlatform(x, y, moving = false, disappearing = false) {
  const p = document.createElement("div");
  p.classList.add("platform");
  if (moving) p.classList.add("moving");

  p.style.left = x + "px";
  p.style.bottom = y + "px";

  gameArea.appendChild(p);

  platforms.push({
    el: p,
    x,
    y,
    moving,
    disappearing,
    active: true,
    dir: 1
  });
}

// التحكم المستمر
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  e.preventDefault();
});
document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// الحركة
function move(dx) {
  playerPos.x += dx;
  if (playerPos.x < 0) playerPos.x = 0;
  if (playerPos.x > 570) playerPos.x = 570;
}

// القفز
function jump() {
  if (onGround) {
    velocityY = jumpPower;
    onGround = false;
    rotation += 15 * direction;
    jumpSound.play();
  }
}

// تحديث المنصات المتحركة
function updatePlatforms() {
  platforms.forEach(p => {
    if (!p.moving || !p.active) return;

    p.x += p.dir * 1.5;
    if (p.x < 20 || p.x > 520) p.dir *= -1;

    p.el.style.left = p.x + "px";
  });
}

// ===== حلقة اللعبة =====
function gameLoop() {

  // حركة مستمرة
  if (keys["ArrowLeft"]) {
    direction = -1;
    move(-moveSpeed);
  }
  if (keys["ArrowRight"]) {
    direction = 1;
    move(moveSpeed);
  }
  if (keys["ArrowUp"]) {
    jump();
  }

  // تأثير الرياح
  if (windForce !== 0) {
    playerPos.x += windForce;
  }

  // جاذبية منخفضة
  if (lowGravityZone) {
    gravityUp = 0.4;
    gravityDown = 0.6;
  } else {
    gravityUp = 0.7;
    gravityDown = 0.9;
  }

  // فيزياء
  const gravity = velocityY > 0 ? gravityUp : gravityDown;
  velocityY -= gravity;
  playerPos.y += velocityY;

  // دوران سينمائي
  if (!onGround) {
    rotation += 5 * direction;
    tilt = Math.max(-10, Math.min(10, tilt + (3 * direction)));
  } else {
    rotation *= 0.8;
    tilt *= 0.7;
  }

  // الأرض
  if (playerPos.y < 0) {
    playerPos.y = 0;
    velocityY = 0;
    onGround = true;
  }

  // تحديث المنصات المتحركة
  updatePlatforms();

  // تصادم مع المنصات
  platforms.forEach(p => {
    if (!p.active) return;

    const platX = p.el.offsetLeft;
    const platY = p.el.offsetTop;
    const platBottom = gameArea.offsetHeight - platY - 10;

    if (
      playerPos.x + 30 > platX &&
      playerPos.x < platX + 100 &&
      playerPos.y <= platBottom &&
      playerPos.y >= platBottom - 15 &&
      velocityY < 0
    ) {
      playerPos.y = platBottom;
      velocityY = 0;
      onGround = true;

      score++;
      scoreSpan.innerText = score;
      bar.style.width = Math.min(score * 2, 100) + "%";

      // منصات تختفي
      if (p.disappearing) {
        p.active = false;
        p.el.style.opacity = "0.3";
        setTimeout(() => {
          p.el.remove();
        }, 300);
      }
    }
  });

  // نهاية المرحلة
  if (playerPos.x + 30 >= 580 && playerPos.y > 0) {
    finishStage();
  }

  updatePlayer();
  requestAnimationFrame(gameLoop);
}

// إنهاء المرحلة
function finishStage() {
  finishSound.play();
  if (level >= MAX_LEVEL) {
    endGame();
  } else {
    level++;
    levelSpan.innerText = level;
    playerPos = { x: 10, y: 0 };
    velocityY = 0;
    onGround = false;
    rotation = 0;
    tilt = 0;
    createPlatforms();
  }
}

// نهاية اللعبة
function endGame() {
  finalScore.innerText = score;
  endScreen.classList.remove("hidden");
  gameArea.innerHTML = "";
}

// إعادة اللعب
function restartGame() {
  score = 0;
  level = 1;
  scoreSpan.innerText = score;
  levelSpan.innerText = level;
  bar.style.width = "0%";
  endScreen.classList.add("hidden");
  createPlayer();
  createPlatforms();
}

// بدء اللعبة
createPlayer();
createPlatforms();
gameLoop();


