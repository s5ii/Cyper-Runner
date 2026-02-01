const gameArea = document.getElementById("gameArea");
const levelSpan = document.getElementById("level");
const scoreSpan = document.getElementById("score");

let player = {x: 10, y: 0, w:30, h:30};
let velocity = {x:0, y:0};
let onGround = false;
const gravity = 0.5;
let keys = {A:false,D:false,W:false};
let platforms = [
  {x:50,y:0,w:100,h:10},
  {x:150,y:50,w:100,h:10},
  {x:300,y:100,w:100,h:10},
  {x:450,y:50,w:100,h:10},
  {x:600,y:120,w:100,h:10},
  {x:750,y:80,w:100,h:10},
  {x:800,y:0,w:100,h:10},
];

// إنشاء عناصر HTML
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

// تحديث موقع اللاعب
function updatePlayer(){
  playerEl.style.left = player.x + "px";
  playerEl.style.bottom = player.y + "px";
}

// اللعبة
function gameLoop(){
  // الحركة الجانبية مستقلة تماما
  if(keys.A) player.x -=5;
  if(keys.D) player.x +=5;

  // القفز
  if(keys.W && onGround){
    velocity.y = 10;
    onGround=false;
  }

  // الجاذبية
  velocity.y -= gravity;
  player.y += velocity.y;

  if(player.y <0){
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
    }
  });

  updatePlayer();
  requestAnimationFrame(gameLoop);
}

gameLoop();
