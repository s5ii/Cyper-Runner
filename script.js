// script.js النهائي – كل شيء أخضر، منصات أفقي فقط، تصادم مضبوط
const gameArea = document.getElementById("gameArea");
gameArea.style.width = "580px";
gameArea.style.height = "400px";
gameArea.style.overflow = "hidden";
gameArea.style.position = "relative";
gameArea.style.border = "2px solid #000";

const gameAreaInner = document.createElement("div");
gameAreaInner.id = "gameAreaInner";
gameAreaInner.style.position = "absolute";
gameAreaInner.style.left = "0px";
gameAreaInner.style.bottom = "0px";
gameArea.appendChild(gameAreaInner);

const levelSpan = document.getElementById("level");
const scoreSpan = document.getElementById("score");
const bar = document.getElementById("bar");
const endScreen = document.getElementById("endScreen");
const finalScore = document.getElementById("finalScore");
const jumpSound = document.getElementById("jumpSound");
const finishSound = document.getElementById("finishSound");

let player, playerPos, velocityY, onGround;
let rotation = 0, tilt = 0, direction = 1;
let keys = {}, score = 0, level = 1;
const MAX_LEVEL = 30;
const LEVEL_WIDTH = 2000;

let platforms = [], windForce = 0, lowGravityZone = false;

// فيزياء محسنة
let jumpPower = 12, moveSpeed = 3;
let gravityUp = 0.6, gravityDown = 1.2;

// إنشاء اللاعب – أخضر
function createPlayer() {
  player = document.createElement("div");
  player.id = "player";
  player.style.width = "30px";
  player.style.height = "30px";
  player.style.background = "green"; // شخصية أخضر
  player.style.position = "absolute";
  gameAreaInner.appendChild(player);
  playerPos = { x: 10, y: 0 };
  velocityY = 0;
  onGround = false;
  rotation = 0;
  tilt = 0;
  updatePlayer();
}

// تحديث اللاعب
function updatePlayer() {
  player.style.left = playerPos.x + "px";
  player.style.bottom = playerPos.y + "px";
  player.style.transform = `rotate(${rotation}deg) skewX(${tilt}deg)`;
}

// إضافة منصة – أخضر، لا تختفي
function addPlatform(x, y, moving=false){
  const p = document.createElement("div");
  p.classList.add("platform");
  p.style.position = "absolute";
  p.style.width = "100px";
  p.style.height = "15px";
  p.style.background = "green"; // كل المنصات أخضر
  p.style.left = x + "px";
  p.style.bottom = y + "px";
  gameAreaInner.appendChild(p);

  platforms.push({el:p, x, y, moving, active:true, dir:1});
}

// إنشاء منصات المرحل ممتعة وطويلة
function createPlatforms(){
  platforms.forEach(p => p.el.remove());
  platforms = [];
  windForce = 0; lowGravityZone = false;

  let yBase = 50;
  let x = 0;

  for(let i=0; i<50; i++){
    const gap = 80 + Math.random()*50; 
    x += gap;
    const y = yBase + (Math.random()*80 - 40); 
    const moving = Math.random()>0.7; // بعض المنصات تتحرك أفقي
    addPlatform(x, Math.max(10, Math.min(350,y)), moving);
  }

  if(level>=16) windForce = (Math.random()>0.5?1:-1)*(0.4+level*0.03);
  if(level>=21) lowGravityZone = true;
}

// تحكم
document.addEventListener("keydown",(e)=>{keys[e.key]=true;e.preventDefault();});
document.addEventListener("keyup",(e)=>{keys[e.key]=false;});

// الحركة والقفز
function move(dx){playerPos.x+=dx; if(playerPos.x<0)playerPos.x=0; if(playerPos.x>LEVEL_WIDTH-30)playerPos.x=LEVEL_WIDTH-30;}
function jump(){if(onGround){velocityY=jumpPower;onGround=false;rotation+=15*direction;jumpSound.play();}}

// تحديث المنصات المتحركة أفقياً
function updatePlatforms(){
  platforms.forEach(p=>{
    if(!p.moving || !p.active) return;
    p.x += p.dir * 1.5; // حركة أفقي
    if(p.x < 20 || p.x > LEVEL_WIDTH - 120) p.dir *= -1;
    p.el.style.left = p.x+"px";
  });
}

// حلقة اللعبة
function gameLoop(){
  if(keys["ArrowLeft"]){direction=-1;move(-moveSpeed);}
  if(keys["ArrowRight"]){direction=1;move(moveSpeed);}
  if(keys["ArrowUp"]){jump();}

  if(windForce!==0) playerPos.x += windForce;

  if(lowGravityZone){gravityUp=0.4;gravityDown=0.6;}else{gravityUp=0.6;gravityDown=1.2;}

  const gravity = velocityY>0 ? gravityUp : gravityDown;
  velocityY -= gravity;
  playerPos.y += velocityY;

  if(!onGround){rotation+=5*direction; tilt=Math.max(-10, Math.min(10, tilt+3*direction));} else {rotation*=0.8; tilt*=0.7;}
  if(playerPos.y<0){playerPos.y=0; velocityY=0; onGround=true;}

  updatePlatforms();

  // تصادم مضبوط: اللاعب يقف على المنصة ولا يخترقها
  platforms.forEach(p=>{
    if(!p.active) return;
    const platX = p.x;
    const platY = p.y;
    if(
      playerPos.x + 30 > platX &&
      playerPos.x < platX + 100 &&
      playerPos.y <= platY + 15 &&
      playerPos.y >= platY &&
      velocityY < 0
    ){
      playerPos.y = platY + 15;
      velocityY = 0;
      onGround = true;
      score++;
      scoreSpan.innerText = score;
      bar.style.width = Math.min(score*2,100)+"%";
    }
  });

  // كاميرا تتحرك يمين فقط
  const cameraLeft = Math.min(Math.max(playerPos.x - 200,0), LEVEL_WIDTH-580);
  gameAreaInner.style.left = -cameraLeft + "px";
  gameAreaInner.style.bottom = "0px";

  // نهاية المرحلة
  if(playerPos.x + 30 >= LEVEL_WIDTH){
    finishStage();
  }

  updatePlayer();
  requestAnimationFrame(gameLoop);
}

// إنهاء المرحلة
function finishStage(){
  finishSound.play();
  if(level>=MAX_LEVEL){endGame(); return;}
  level++; levelSpan.innerText = level;
  playerPos = {x:10, y:0}; velocityY=0; onGround=false; rotation=0; tilt=0;
  createPlatforms();
}

// نهاية اللعبة
function endGame(){
  finalScore.innerText = score; endScreen.classList.remove("hidden"); gameAreaInner.innerHTML="";
}

// إعادة اللعب
function restartGame(){
  score=0; level=1; scoreSpan.innerText = score; levelSpan.innerText = level; bar.style.width="0%";
  endScreen.classList.add("hidden"); createPlayer(); createPlatforms();
}

// بدء اللعبة
createPlayer();
createPlatforms();
gameLoop();
