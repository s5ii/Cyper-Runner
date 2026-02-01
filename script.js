const gameArea = document.getElementById("gameArea");

// اللاعب
const playerEl = document.createElement("div");
playerEl.id="player";
gameArea.appendChild(playerEl);

let player = {x:10, y:0, w:30, h:30};
let velocityY = 0;
let onGround = false;
const gravity = 0.5;
const speed = 5;

// المنصات
const platforms = [
  {x:50,y:0,w:100,h:10},
  {x:200,y:50,w:100,h:10},
  {x:400,y:100,w:100,h:10},
  {x:600,y:50,w:100,h:10},
  {x:750,y:0,w:100,h:10}
];

// إنشاء HTML للمنصات
platforms.forEach(p=>{
  const el = document.createElement("div");
  el.className="platform";
  el.style.left = p.x+"px";
  el.style.bottom = p.y+"px";
  el.style.width = p.w+"px";
  el.style.height = p.h+"px";
  p.el = el;
  gameArea.appendChild(el);
});

// التحكم
const keys = {A:false,D:false,W:false};
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
  playerEl.style.left = player.x+"px";
  playerEl.style.bottom = player.y+"px";
}

// اللعبة
function gameLoop(){
  // الحركة الجانبية يدوياً
  if(keys.A) player.x -= speed;
  if(keys.D) player.x += speed;
  if(player.x <0) player.x=0;
  if(player.x + player.w > 800) player.x = 800 - player.w;

  // القفز
  if(keys.W && onGround){
    velocityY = 10;
    onGround=false;
  }

  // الجاذبية
  velocityY -= gravity;
  player.y += velocityY;

  // الأرض
  if(player.y <0){
    player.y = 0;
    velocityY=0;
    onGround=true;
  }

  // تصادم المنصات
  onGround=false;
  platforms.forEach(p=>{
    const top = p.y + p.h;
    if(player.x + player.w > p.x && player.x < p.x + p.w &&
       player.y >= top - 5 && player.y <= top + 5 &&
       velocityY <=0){
      player.y = top;
      velocityY=0;
      onGround=true;
    }
  });

  updatePlayer();
  requestAnimationFrame(gameLoop);
}

gameLoop();
