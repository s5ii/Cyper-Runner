const gameArea = document.getElementById("gameArea");
const levelSpan = document.getElementById("level");
const scoreSpan = document.getElementById("score");
const endScreen = document.getElementById("endScreen");
const finalScore = document.getElementById("finalScore");
const bar = document.getElementById("bar");
const jumpSound = document.getElementById("jumpSound");

let player = {x:10,y:0,w:30,h:30};
let velocity = {x:0,y:0};
let onGround = false;
let score = 0;
let level = 1;
let progress = 0;

const gravity = 0.5;
const keys = {A:false,D:false,W:false};

// منصات ثابتة ومتحركة
let platforms = [
  {x:50,y:0,w:100,h:10,dir:1}, 
  {x:150,y:50,w:100,h:10,dir:1},
  {x:300,y:100,w:100,h:10,dir:1},
  {x:450,y:50,w:100,h:10,dir:1},
  {x:600,y:120,w:100,h:10,dir:1},
  {x:750,y:80,w:100,h:10,dir:1},
  {x:800,y:0,w:100,h:10,dir:1}
];

// إنشاء اللاعب ومنصات HTML
const playerEl = document.createElement("div");
playerEl.id="player";
gameArea.appendChild(playerEl);

platforms.forEach(p=>{
  const e=document.createElement("div");
  e.className="platform";
  e.style.left=p.x+"px";
  e.style.bottom=p.y+"px";
  e.style.width=p.w+"px";
  e.style.height=p.h+"px";
  p.el=e;
  gameArea.appendChild(e);
});

// التحكم
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

// الحركة
function movePlayer(){
  if(keys.A) player.x -=5;
  if(keys.D) player.x +=5;
  if(player.x<0) player.x=0;
  if(player.x>770) player.x=770;

  if(keys.W && onGround){
    velocity.y = 10;
    onGround=false;
    jumpSound.play();
  }
}

// تحديث اللاعب
function updatePlayer(){
  playerEl.style.left = player.x+"px";
  playerEl.style.bottom = player.y+"px";
}

// تحريك المنصات البسيطة (صعود ونزول)
function movePlatforms(){
  platforms.forEach(p=>{
    p.y += p.dir*0.5;
    if(p.y>150 || p.y<50) p.dir*=-1;
    p.el.style.bottom = p.y+"px";
  });
}

// اللعبة
function gameLoop(){
  movePlayer();

  // الجاذبية
  velocity.y -= gravity;
  player.y += velocity.y;

  if(player.y<0){
    player.y=0;
    velocity.y=0;
    onGround=true;
  }

  // تصادم المنصات
  onGround=false;
  platforms.forEach(p=>{
    if(player.x + player.w > p.x && player.x < p.x + p.w &&
       player.y >= p.y && player.y <= p.y + 20 &&
       velocity.y <=0){
      player.y = p.y;
      velocity.y=0;
      onGround=true;
      score++;
      scoreSpan.innerText=score;
      progress = Math.min(score/50*100,100);
      bar.style.width = progress+"%";
    }
  });

  // وصول النهاية
  if(player.x+player.w>=800){
    finishStage();
  }

  movePlatforms();
  updatePlayer();
  requestAnimationFrame(gameLoop);
}

// إنهاء المرحلة
function finishStage(){
  level++;
  levelSpan.innerText=level;
  if(level>3){
    finalScore.innerText=score;
    endScreen.classList.remove("hidden");
  }else{
    player.x=10;
    player.y=0;
  }
}

// إعادة اللعب
function restartGame(){
  score=0;
  progress=0;
  level=1;
  scoreSpan.innerText=score;
  levelSpan.innerText=level;
  bar.style.width="0%";
  endScreen.classList.add("hidden");
  player.x=10;
  player.y=0;
}

gameLoop();
