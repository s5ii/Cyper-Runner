// ========================================
// إعدادات اللعبة الأساسية
// ========================================
const CONFIG = {
    canvas: {
        width: 1000,
        height: 600
    },
    player: {
        width: 40,
        height: 50,
        speed: 5,
        jumpPower: 15,
        gravity: 0.6,
        maxFallSpeed: 15
    },
    enemy: {
        width: 40,
        height: 40,
        speed: 2
    },
    coin: {
        width: 30,
        height: 30,
        points: 10
    },
    platform: {
        height: 20
    }
};

// ========================================
// متغيرات اللعبة العامة
// ========================================
let canvas, ctx;
let gameState = 'menu'; // menu, playing, paused, gameover, levelComplete
let currentLevel = 1;
let score = 0;
let lives = 3;
let gameTime = 0;
let gameInterval;
let timeInterval;

// كائنات اللعبة
let player;
let platforms = [];
let coins = [];
let enemies = [];
let fires = [];
let keys = {};

// ========================================
// فئة اللاعب
// ========================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.player.width;
        this.height = CONFIG.player.height;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.isOnGround = false;
        this.direction = 1; // 1 = يمين, -1 = يسار
        this.invincible = false;
        this.invincibleTimer = 0;
    }

    update() {
        // الحركة الأفقية
        if (keys['ArrowRight']) {
            this.velocityX = CONFIG.player.speed;
            this.direction = 1;
        } else if (keys['ArrowLeft']) {
            this.velocityX = -CONFIG.player.speed;
            this.direction = -1;
        } else {
            this.velocityX = 0;
        }

        // القفز
        if (keys[' '] && this.isOnGround) {
            this.velocityY = -CONFIG.player.jumpPower;
            this.isJumping = true;
            this.isOnGround = false;
        }

        // الجاذبية
        if (!this.isOnGround) {
            this.velocityY += CONFIG.player.gravity;
            if (this.velocityY > CONFIG.player.maxFallSpeed) {
                this.velocityY = CONFIG.player.maxFallSpeed;
            }
        }

        // تحديث الموقع
        this.x += this.velocityX;
        this.y += this.velocityY;

        // حدود الشاشة
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CONFIG.canvas.width) {
            this.x = CONFIG.canvas.width - this.width;
        }

        // السقوط من الخريطة
        if (this.y > CONFIG.canvas.height) {
            this.hit();
        }

        // تحديث المناعة
        if (this.invincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

        // التحقق من التصادم مع المنصات
        this.checkPlatformCollision();
    }

    checkPlatformCollision() {
        this.isOnGround = false;
        
        platforms.forEach(platform => {
            if (this.x < platform.x + platform.width &&
                this.x + this.width > platform.x &&
                this.y + this.height <= platform.y &&
                this.y + this.height + this.velocityY >= platform.y &&
                this.velocityY >= 0) {
                
                this.y = platform.y - this.height;
                this.velocityY = 0;
                this.isOnGround = true;
                this.isJumping = false;
            }
        });
    }

    draw() {
        // تأثير الوميض عند المناعة
        if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
            return;
        }

        // رسم اللاعب (نينجا)
        ctx.save();
        
        // الجسم
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(this.x + 5, this.y + 10, this.width - 10, this.height - 10);
        
        // الرأس
        ctx.fillStyle = '#34495e';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + 10, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // العيون
        ctx.fillStyle = '#ff2e63';
        const eyeY = this.y + 8;
        const eyeOffset = 5;
        ctx.fillRect(this.x + this.width/2 - eyeOffset - 3, eyeY, 6, 3);
        ctx.fillRect(this.x + this.width/2 + eyeOffset - 3, eyeY, 6, 3);
        
        // السيف
        ctx.strokeStyle = '#08d9d6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (this.direction === 1) {
            ctx.moveTo(this.x + this.width, this.y + 25);
            ctx.lineTo(this.x + this.width + 15, this.y + 15);
        } else {
            ctx.moveTo(this.x, this.y + 25);
            ctx.lineTo(this.x - 15, this.y + 15);
        }
        ctx.stroke();
        
        ctx.restore();
    }

    hit() {
        if (!this.invincible) {
            lives--;
            updateHUD();
            this.invincible = true;
            this.invincibleTimer = 60; // ثانيتان من المناعة
            
            // إعادة تعيين الموقع
            this.x = 50;
            this.y = 100;
            this.velocityX = 0;
            this.velocityY = 0;
            
            // اهتزاز الشاشة
            canvas.classList.add('shake');
            setTimeout(() => canvas.classList.remove('shake'), 500);
            
            if (lives <= 0) {
                endGame();
            }
        }
    }
}

// ========================================
// فئة المنصة
// ========================================
class Platform {
    constructor(x, y, width, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = CONFIG.platform.height;
        this.type = type; // normal, moving, breakable
        this.moveDirection = 1;
        this.moveSpeed = 2;
        this.originalX = x;
        this.moveRange = 100;
    }

    update() {
        if (this.type === 'moving') {
            this.x += this.moveSpeed * this.moveDirection;
            if (Math.abs(this.x - this.originalX) > this.moveRange) {
                this.moveDirection *= -1;
            }
        }
    }

    draw() {
        ctx.save();
        
        // ظل المنصة
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(this.x + 3, this.y + 3, this.width, this.height);
        
        // المنصة
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        
        if (this.type === 'moving') {
            gradient.addColorStop(0, '#08d9d6');
            gradient.addColorStop(1, '#0a8f8a');
        } else {
            gradient.addColorStop(0, '#ff6b35');
            gradient.addColorStop(1, '#cc4a1f');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // حواف مضيئة
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        ctx.restore();
    }
}

// ========================================
// فئة العملة
// ========================================
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.coin.width;
        this.height = CONFIG.coin.height;
        this.collected = false;
        this.rotation = 0;
        this.floatOffset = 0;
        this.floatSpeed = 0.1;
    }

    update() {
        this.rotation += 0.05;
        this.floatOffset = Math.sin(Date.now() * 0.003) * 5;
    }

    draw() {
        if (this.collected) return;
        
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2 + this.floatOffset);
        ctx.rotate(this.rotation);
        
        // توهج
        ctx.shadowColor = '#ffbb00';
        ctx.shadowBlur = 15;
        
        // العملة
        ctx.fillStyle = '#ffbb00';
        ctx.beginPath();
        ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // التفاصيل
        ctx.fillStyle = '#ffd93d';
        ctx.beginPath();
        ctx.arc(0, 0, this.width/3, 0, Math.PI * 2);
        ctx.fill();
        
        // رمز الألماس
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💎', 0, 0);
        
        ctx.restore();
    }

    checkCollision(player) {
        if (this.collected) return false;
        
        if (player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y) {
            this.collected = true;
            score += CONFIG.coin.points;
            updateHUD();
            return true;
        }
        return false;
    }
}

// ========================================
// فئة العدو
// ========================================
class Enemy {
    constructor(x, y, type = 'patrol') {
        this.x = x;
        this.y = y;
        this.width = CONFIG.enemy.width;
        this.height = CONFIG.enemy.height;
        this.type = type; // patrol, stationary
        this.speed = CONFIG.enemy.speed;
        this.direction = 1;
        this.patrolRange = 150;
        this.originalX = x;
    }

    update() {
        if (this.type === 'patrol') {
            this.x += this.speed * this.direction;
            
            if (Math.abs(this.x - this.originalX) > this.patrolRange) {
                this.direction *= -1;
            }
        }
    }

    draw() {
        ctx.save();
        
        // ظل العدو
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, this.y + this.height + 5, this.width/2, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // جسم العدو
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x + 5, this.y + 15, this.width - 10, this.height - 15);
        
        // رأس العدو
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + 12, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // العيون الشريرة
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2 - 5, this.y + 10, 3, 0, Math.PI * 2);
        ctx.arc(this.x + this.width/2 + 5, this.y + 10, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2 - 5, this.y + 10, 1.5, 0, Math.PI * 2);
        ctx.arc(this.x + this.width/2 + 5, this.y + 10, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // قرون صغيرة
        ctx.fillStyle = '#8e2020';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2 - 10, this.y + 5);
        ctx.lineTo(this.x + this.width/2 - 12, this.y);
        ctx.lineTo(this.x + this.width/2 - 8, this.y + 5);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2 + 10, this.y + 5);
        ctx.lineTo(this.x + this.width/2 + 12, this.y);
        ctx.lineTo(this.x + this.width/2 + 8, this.y + 5);
        ctx.fill();
        
        ctx.restore();
    }

    checkCollision(player) {
        if (player.invincible) return false;
        
        if (player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y) {
            player.hit();
            return true;
        }
        return false;
    }
}

// ========================================
// فئة النار
// ========================================
class Fire {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 50;
        this.flameOffset = 0;
    }

    update() {
        this.flameOffset = Math.sin(Date.now() * 0.01) * 5;
    }

    draw() {
        ctx.save();
        
        // توهج النار
        ctx.shadowColor = '#ff2e63';
        ctx.shadowBlur = 20;
        
        // اللهب الأحمر
        ctx.fillStyle = '#ff2e63';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y + this.flameOffset);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // اللهب البرتقالي
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y + 10 + this.flameOffset);
        ctx.lineTo(this.x + 8, this.y + this.height);
        ctx.lineTo(this.x + this.width - 8, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // اللهب الأصفر
        ctx.fillStyle = '#ffbb00';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y + 20 + this.flameOffset);
        ctx.lineTo(this.x + 15, this.y + this.height);
        ctx.lineTo(this.x + this.width - 15, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    checkCollision(player) {
        if (player.invincible) return false;
        
        if (player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y) {
            player.hit();
            return true;
        }
        return false;
    }
}

// ========================================
// بناء المستويات
// ========================================
function loadLevel(levelNum) {
    platforms = [];
    coins = [];
    enemies = [];
    fires = [];
    
    if (levelNum === 1) {
        // الأرضية
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        
        // منصات أساسية
        platforms.push(new Platform(150, 480, 150, 'normal'));
        platforms.push(new Platform(400, 400, 150, 'normal'));
        platforms.push(new Platform(650, 320, 150, 'normal'));
        platforms.push(new Platform(200, 250, 120, 'moving'));
        platforms.push(new Platform(500, 180, 120, 'moving'));
        
        // عملات
        coins.push(new Coin(200, 440));
        coins.push(new Coin(450, 360));
        coins.push(new Coin(700, 280));
        coins.push(new Coin(250, 210));
        coins.push(new Coin(550, 140));
        coins.push(new Coin(800, 500));
        
        // أعداء
        enemies.push(new Enemy(400, 360, 'patrol'));
        enemies.push(new Enemy(650, 280, 'stationary'));
        
        // نار
        fires.push(new Fire(300, 530));
        fires.push(new Fire(600, 530));
        
    } else if (levelNum === 2) {
        // الأرضية
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        
        // منصات أكثر تعقيداً
        platforms.push(new Platform(100, 500, 120, 'normal'));
        platforms.push(new Platform(300, 450, 100, 'moving'));
        platforms.push(new Platform(500, 400, 100, 'moving'));
        platforms.push(new Platform(700, 350, 120, 'normal'));
        platforms.push(new Platform(150, 300, 100, 'normal'));
        platforms.push(new Platform(400, 250, 100, 'moving'));
        platforms.push(new Platform(650, 200, 100, 'normal'));
        platforms.push(new Platform(300, 150, 120, 'moving'));
        
        // عملات أكثر
        coins.push(new Coin(150, 460));
        coins.push(new Coin(350, 410));
        coins.push(new Coin(550, 360));
        coins.push(new Coin(750, 310));
        coins.push(new Coin(200, 260));
        coins.push(new Coin(450, 210));
        coins.push(new Coin(700, 160));
        coins.push(new Coin(350, 110));
        coins.push(new Coin(100, 540));
        coins.push(new Coin(900, 540));
        
        // أعداء أكثر
        enemies.push(new Enemy(300, 410, 'patrol'));
        enemies.push(new Enemy(500, 360, 'patrol'));
        enemies.push(new Enemy(150, 260, 'stationary'));
        enemies.push(new Enemy(650, 160, 'stationary'));
        
        // نار أكثر
        fires.push(new Fire(200, 530));
        fires.push(new Fire(400, 530));
        fires.push(new Fire(600, 530));
        fires.push(new Fire(800, 530));
        
    } else if (levelNum === 3) {
        // الأرضية
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        
        // مستوى صعب جداً
        platforms.push(new Platform(80, 520, 80, 'moving'));
        platforms.push(new Platform(250, 470, 80, 'moving'));
        platforms.push(new Platform(420, 420, 80, 'moving'));
        platforms.push(new Platform(590, 370, 80, 'moving'));
        platforms.push(new Platform(760, 320, 80, 'normal'));
        platforms.push(new Platform(200, 270, 80, 'moving'));
        platforms.push(new Platform(400, 220, 80, 'moving'));
        platforms.push(new Platform(600, 170, 80, 'moving'));
        platforms.push(new Platform(300, 120, 150, 'normal'));
        
        // عملات كثيرة
        for (let i = 0; i < 15; i++) {
            const x = 100 + Math.random() * 800;
            const y = 100 + Math.random() * 400;
            coins.push(new Coin(x, y));
        }
        
        // أعداء كثيرة
        enemies.push(new Enemy(250, 430, 'patrol'));
        enemies.push(new Enemy(420, 380, 'patrol'));
        enemies.push(new Enemy(590, 330, 'patrol'));
        enemies.push(new Enemy(200, 230, 'patrol'));
        enemies.push(new Enemy(400, 180, 'patrol'));
        
        // نار في كل مكان
        for (let i = 0; i < 8; i++) {
            fires.push(new Fire(i * 120 + 50, 530));
        }
    }
    
    // إنشاء اللاعب
    player = new Player(50, 100);
}

// ========================================
// تحديث واجهة المستخدم
// ========================================
function updateHUD() {
    document.getElementById('scoreDisplay').textContent = score;
    document.getElementById('livesDisplay').textContent = lives;
    document.getElementById('levelDisplay').textContent = currentLevel;
}

function updateTime() {
    gameTime++;
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    document.getElementById('timeDisplay').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ========================================
// حلقة اللعبة الرئيسية
// ========================================
function gameLoop() {
    if (gameState !== 'playing') return;
    
    // مسح الشاشة
    ctx.clearRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    
    // رسم الخلفية
    drawBackground();
    
    // تحديث ورسم المنصات
    platforms.forEach(platform => {
        platform.update();
        platform.draw();
    });
    
    // تحديث ورسم العملات
    coins.forEach(coin => {
        coin.update();
        coin.draw();
        coin.checkCollision(player);
    });
    
    // تحديث ورسم النار
    fires.forEach(fire => {
        fire.update();
        fire.draw();
        fire.checkCollision(player);
    });
    
    // تحديث ورسم الأعداء
    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
        enemy.checkCollision(player);
    });
    
    // تحديث ورسم اللاعب
    player.update();
    player.draw();
    
    // التحقق من اكتمال المستوى
    const allCoinsCollected = coins.every(coin => coin.collected);
    if (allCoinsCollected) {
        completeLevel();
    }
}

function drawBackground() {
    // سماء متدرجة
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvas.height);
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(1, '#0f0f2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    
    // نجوم صغيرة في الخلفية
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 50; i++) {
        const x = (i * 123) % CONFIG.canvas.width;
        const y = (i * 456) % CONFIG.canvas.height;
        ctx.fillRect(x, y, 2, 2);
    }
}

// ========================================
// إدارة الشاشات
// ========================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function startGame() {
    currentLevel = 1;
    score = 0;
    lives = 3;
    gameTime = 0;
    
    // التأكد من أن Canvas جاهز
    if (!canvas) {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
    }
    
    canvas.width = CONFIG.canvas.width;
    canvas.height = CONFIG.canvas.height;
    
    loadLevel(currentLevel);
    updateHUD();
    
    gameState = 'playing';
    showScreen('gameScreen');
    
    clearInterval(gameInterval);
    clearInterval(timeInterval);
    
    // رسم فوري للإطار الأول
    gameLoop();
    
    gameInterval = setInterval(gameLoop, 1000 / 60); // 60 FPS
    timeInterval = setInterval(updateTime, 1000);
}

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        showScreen('pauseScreen');
        clearInterval(gameInterval);
        clearInterval(timeInterval);
    }
}

function resumeGame() {
    if (gameState === 'paused') {
        gameState = 'playing';
        showScreen('gameScreen');
        gameInterval = setInterval(gameLoop, 1000 / 60);
        timeInterval = setInterval(updateTime, 1000);
    }
}

function endGame() {
    gameState = 'gameover';
    clearInterval(gameInterval);
    clearInterval(timeInterval);
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLevel').textContent = currentLevel;
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    document.getElementById('finalTime').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // حساب النجوم
    const stars = calculateStars(score);
    document.getElementById('starsEarned').textContent = '⭐'.repeat(stars);
    
    showScreen('gameOverScreen');
}

function completeLevel() {
    gameState = 'levelComplete';
    clearInterval(gameInterval);
    clearInterval(timeInterval);
    
    const levelScore = score;
    document.getElementById('levelScore').textContent = levelScore;
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    document.getElementById('levelTime').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // حساب النجوم
    const stars = calculateStars(levelScore);
    document.getElementById('levelStars').textContent = '⭐'.repeat(stars);
    
    showScreen('levelCompleteScreen');
}

function calculateStars(finalScore) {
    if (finalScore >= 100) return 3;
    if (finalScore >= 60) return 2;
    if (finalScore >= 30) return 1;
    return 0;
}

function nextLevel() {
    currentLevel++;
    if (currentLevel > 3) {
        currentLevel = 1; // إعادة البدء من المستوى الأول
    }
    gameTime = 0;
    
    loadLevel(currentLevel);
    updateHUD();
    
    gameState = 'playing';
    showScreen('gameScreen');
    
    gameInterval = setInterval(gameLoop, 1000 / 60);
    timeInterval = setInterval(updateTime, 1000);
}

// ========================================
// معالجات الأحداث
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = CONFIG.canvas.width;
    canvas.height = CONFIG.canvas.height;
    
    // أزرار الشاشة الرئيسية
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('instructionsBtn').addEventListener('click', () => {
        showScreen('instructionsScreen');
    });
    document.getElementById('backBtn').addEventListener('click', () => {
        showScreen('startScreen');
    });
    
    // أزرار الإيقاف المؤقت
    document.getElementById('pauseBtn').addEventListener('click', pauseGame);
    document.getElementById('resumeBtn').addEventListener('click', resumeGame);
    document.getElementById('restartBtn').addEventListener('click', startGame);
    document.getElementById('quitBtn').addEventListener('click', () => {
        gameState = 'menu';
        clearInterval(gameInterval);
        clearInterval(timeInterval);
        showScreen('startScreen');
    });
    
    // أزرار نهاية اللعبة
    document.getElementById('playAgainBtn').addEventListener('click', startGame);
    document.getElementById('nextLevelBtn').addEventListener('click', nextLevel);
    
    // التحكم بلوحة المفاتيح
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        // منع التمرير بالمسافة والأسهم
        if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
        
        // الإيقاف المؤقت بمفتاح Escape
        if (e.key === 'Escape' && gameState === 'playing') {
            pauseGame();
        } else if (e.key === 'Escape' && gameState === 'paused') {
            resumeGame();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    // عرض شاشة البداية
    showScreen('startScreen');
});

// ========================================
// منع فقدان التركيز
// ========================================
window.addEventListener('blur', () => {
    if (gameState === 'playing') {
        pauseGame();
    }
});

console.log('🎮 لعبة مغامرات النينجا جاهزة!');
console.log('💡 استخدم الأسهم للتحرك والمسافة للقفز');
console.log('🎯 اجمع كل العملات لإكمال المستوى!');
