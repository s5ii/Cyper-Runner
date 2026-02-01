const gameArea = document.getElementById("gameArea");
const levelSpan = document.getElementById("level");
const scoreSpan = document.getElementById("score");
const endScreen = document.getElementById("endScreen");
const finalScore = document.getElementById("finalScore");

let player, playerPos, velocityY, onGround;
let score = 0;
let level = 1;
let platforms = [];
const gravity = 0.5;

// إنشاء اللاعب
function createPlayer(){
  player = document.createElement("div");
  player.id="player";
  gameArea.appendChild(player);
  playerPos={x:10,y:0};
  velocityY=0;
  onGround=false;
  updatePlayer();
}

// تحديث موقع اللاعب
function updatePlayer(){
  player.style.left = playerPos.x + "px";
  player.style.bottom = playerPos.y + "px";
}

// إنشاء المنصات القصيرة للمرحلة
function createPlatforms(){
  platforms.forEach(p=>gameArea.removeChild(p.el));
  platforms = [];
  addPlatform(50,0);
  addPlatform(200,50);
  addPlatform(400,100);
  addPlatform(550,0);
}

// إضافة منصة
function addPlatform(x,y){
  const p=document.createElement("div");
  p.classList.add("platform");
  p.style.left=x+"px";
  p.style.bottom=y+"px";
  gameArea.appendChild(p);
  platforms.push({el:p,x:x,y:y});
}

// التحكم
const keys={A:false,D:false,W:false};
document.addEventListener("keydown", e=>{
  if(e.key.toUpperCase()==="A") keys.A=true;
  if(e.key.toUpperCase()==="D") keys.D=true;
  if(e.key.toUpperCase()==="W") keys.W=true;
});
document.addEventListener("keyup", e=>{
  if(e.key.toUpperCase()==="A") keys.A=false;
  if(e.key.toUpperCase()==="D") keys.D=false;
  if(e.key.toUpperCase()==="W") keys.W=false;
});

function movePlayer(){
  if(keys.A) playerPos.x -=5;
  if(keys.D) playerPos.x +=5;
  if(playerPos.x<0) playerPos.x=0;
  if(playerPos.x>570) playerPos.x=570;
  if(keys.W && onGround){
    velocityY=10;
    onGround=false;
  }
}

// اللعبة
function gameLoop(){
  movePlayer();
  velocityY -= gravity;
  playerPos.y += velocityY;
  if(playerPos.y <0){
    playerPos.y=0;
    velocityY=0;
    onGround=true;
  }

  // تصادم المنصات
  platforms.forEach(p=>{
    const platX=p.el.offsetLeft;
    const platY=p.el.offsetTop;
    const platBottom=gameArea.offsetHeight - platY -10;
    if(playerPos.x+30>platX && playerPos.x<platX+100 &&
       playerPos.y<=platBottom && playerPos.y>=platBottom-15 &&
       velocityY<=0){
      playerPos.y=platBottom;
      velocityY=0;
      onGround=true;
      score++;
      scoreSpan.innerText=score;
    }
  });

  // الوصول لنهاية المرحلة
  if(playerPos.x+30>=580){
    finishStage();
  }

  updatePlayer();
  requestAnimationFrame(gameLoop);
}

// إنهاء المرحلة
function finishStage(){
  level++;
  levelSpan.innerText=level;
  if(level>3){
    endGame();
  }else{
    playerPos={x:10,y:0};
    createPlatforms();
  }
}

// نهاية اللعبة
function endGame(){
  finalScore.innerText=score;
  endScreen.classList.remove("hidden");
  gameArea.innerHTML="";
}

// إعادة اللعب
function restartGame(){
  score=0;
  level=1;
  scoreSpan.innerText=score;
  levelSpan.innerText=level;
  endScreen.classList.add("hidden");
  createPlayer();
  createPlatforms();
}

// بدء اللعبة
createPlayer();
createPlatforms();
gameLoop();
