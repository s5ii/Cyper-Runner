const gameArea = document.getElementById("gameArea");
const levelSpan = document.getElementById("level");
const scoreSpan = document.getElementById("score");
const bar = document.getElementById("bar");
const endScreen = document.getElementById("endScreen");
const finalScore = document.getElementById("finalScore");
const jumpSound = document.getElementById("jumpSound");
const finishSound = document.getElementById("finishSound");

let player, playerPos, velocityY, onGround;
let score = 0;
let level = 1;
let platforms = [];
const gravity = 0.8;

// إنشاء اللاعب
function createPlayer() {
  player = document.createElement("div");
  player.id = "player";
  gameArea.appendChild(player);
  playerPos = { x: 10, y: 0 };
  velocityY = 0;
  onGround = false;
  updatePlayer();
}

// تحديث موقع اللاعب
function updatePlayer() {
  player.style.left = playerPos.x + "px";
  player.style.bottom = playerPos.y + "px";
}

// إنشاء المنصات
function createPlatforms() {
  // تنظيف المنصات القديمة
  platforms.forEach(p => gameArea.removeChild(p.el));
  platforms = [];

  if(level === 1){
    addPlatform(50, 50);
    addPlatform(200, 150);
    addPlatform(350, 250);
    addPlatform(500, 100);
  } else if(level === 2){
    addPlatform(30, 80);
    addPlatform(150, 180, true); // متحركة
    addPlatform(300, 250);
    addPlatform(450, 150, true);
  } else if(level === 3){
    addPlatform(20, 70);
    addPlatform(140, 180, true);
    addPlatform(280, 220, true);
    addPlatform(420, 150, true);
  }
}

// إضافة منصة
function addPlatform(x, y, moving=false){
  const p = document.createElement("div");
  p.classList.add("platform");
  if(moving) p.classList.add("moving");
  p.style.left = x + "px";
  p.style.bottom = y + "px";
  gameArea.appendChild(p);
  platforms.push({el: p, x: x, y: y, moving});
}

// التحكم
document.addEventListener("keydown", (e) => {
  if(e.key==="ArrowLeft") move(-10);
  if(e.key==="ArrowRight") move(10);
  if(e.key==="ArrowUp") jump();
});

function move(dx){
  playerPos.x += dx;
  if(playerPos.x <0) playerPos.x=0;
  if(playerPos.x>570) playerPos.x=570;
  updatePlayer();
}

function jump(){
  if(onGround){
    velocityY = 15;
    onGround = false;
    jumpSound.play();
  }
}

// اللعبة
function gameLoop(){
  velocityY -= gravity;
  playerPos.y += velocityY;
  if(playerPos.y < 0){
    playerPos.y = 0;
    velocityY = 0;
    onGround = true;
  }

  // تصادم مع المنصات
  platforms.forEach(p => {
    const platX = p.el.offsetLeft;
    const platY = p.el.offsetTop; // from top
    const platBottom = gameArea.offsetHeight - platY - 10;

    if(playerPos.x + 30 > platX && playerPos.x < platX + 100 &&
       playerPos.y <= platBottom && playerPos.y >= platBottom - 15 &&
       velocityY < 0){
      playerPos.y = platBottom;
      velocityY = 0;
      onGround = true;
      score += 1;
      scoreSpan.innerText = score;
      bar.style.width = Math.min(score*2,100) + "%";
    }
  });

  // الوصول لنهاية المرحلة
  if(playerPos.x + 30 >= 580 && playerPos.y > 0){
    finishStage();
  }

  updatePlayer();
  requestAnimationFrame(gameLoop);
}

// إنهاء المرحلة
function finishStage(){
  finishSound.play();
  if(level>=3){
    endGame();
  } else{
    level++;
    levelSpan.innerText = level;
    playerPos = {x:10,y:0};
    createPlatforms();
  }
}

// نهاية اللعبة
function endGame(){
  finalScore.innerText = score;
  endScreen.classList.remove("hidden");
  gameArea.innerHTML = "";
}

// إعادة اللعب
function restartGame(){
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
