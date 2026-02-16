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
        let standingPlatform = null;
        
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
                standingPlatform = platform;
            }
        });
        
        // تحريك اللاعب مع المنصة المتحركة
        if (standingPlatform && standingPlatform.type === 'moving') {
            this.x += standingPlatform.moveSpeed * standingPlatform.moveDirection;
        }
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
    constructor(x, y, platformY, type = 'patrol') {
        this.x = x;
        this.y = y;
        this.width = CONFIG.enemy.width;
        this.height = CONFIG.enemy.height;
        this.type = type;
        this.speed = CONFIG.enemy.speed;
        this.direction = 1;
        this.patrolRange = 150;
        this.originalX = x;
        this.platformY = platformY; // المنصة التي يقف عليها
        this.velocityY = 0;
        this.gravity = 0.6;
    }

    update() {
        if (this.type === 'patrol') {
            this.x += this.speed * this.direction;
            
            if (Math.abs(this.x - this.originalX) > this.patrolRange) {
                this.direction *= -1;
            }
        }
        
        // تطبيق الجاذبية للعدو
        this.velocityY += this.gravity;
        this.y += this.velocityY;
        
        // التحقق من المنصات
        platforms.forEach(platform => {
            if (this.x < platform.x + platform.width &&
                this.x + this.width > platform.x &&
                this.y + this.height <= platform.y &&
                this.y + this.height + this.velocityY >= platform.y &&
                this.velocityY >= 0) {
                
                this.y = platform.y - this.height;
                this.velocityY = 0;
            }
        });
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
    
    // ========== المرحلة 1: تعليمية - تعلم القفز ===========
    if (levelNum === 1) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(200, 480, 150, 'normal'));
        platforms.push(new Platform(450, 400, 150, 'normal'));
        platforms.push(new Platform(700, 320, 150, 'normal'));
        
        coins.push(new Coin(250, 440));
        coins.push(new Coin(500, 360));
        coins.push(new Coin(750, 280));
        
    // ========== المرحلة 2: تعليمية - المنصات المتحركة ===========
    } else if (levelNum === 2) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(150, 480, 120, 'normal'));
        platforms.push(new Platform(400, 420, 120, 'moving'));
        platforms.push(new Platform(650, 350, 120, 'normal'));
        
        coins.push(new Coin(200, 440));
        coins.push(new Coin(450, 380));
        coins.push(new Coin(700, 310));
        coins.push(new Coin(400, 540));
        
    // ========== المرحلة 3: مواجهة أول عدو ===========
    } else if (levelNum === 3) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(150, 480, 150, 'normal'));
        platforms.push(new Platform(400, 400, 200, 'normal'));
        platforms.push(new Platform(700, 320, 150, 'normal'));
        
        coins.push(new Coin(200, 440));
        coins.push(new Coin(500, 360));
        coins.push(new Coin(750, 280));
        coins.push(new Coin(800, 540));
        
        enemies.push(new Enemy(420, 360, 400, 'patrol'));
        
    // ========== المرحلة 4: النار الأولى ===========
    } else if (levelNum === 4) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(180, 480, 140, 'normal'));
        platforms.push(new Platform(420, 400, 140, 'normal'));
        platforms.push(new Platform(660, 320, 140, 'normal'));
        
        coins.push(new Coin(230, 440));
        coins.push(new Coin(470, 360));
        coins.push(new Coin(710, 280));
        coins.push(new Coin(150, 540));
        coins.push(new Coin(900, 540));
        
        fires.push(new Fire(350, 530));
        fires.push(new Fire(590, 530));
        
    // ========== المرحلة 5: التوازن والدقة ===========
    } else if (levelNum === 5) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(120, 480, 100, 'normal'));
        platforms.push(new Platform(300, 420, 100, 'moving'));
        platforms.push(new Platform(500, 360, 100, 'normal'));
        platforms.push(new Platform(680, 300, 100, 'moving'));
        platforms.push(new Platform(350, 200, 120, 'normal'));
        
        coins.push(new Coin(160, 440));
        coins.push(new Coin(340, 380));
        coins.push(new Coin(540, 320));
        coins.push(new Coin(720, 260));
        coins.push(new Coin(390, 160));
        
        enemies.push(new Enemy(510, 320, 360, 'stationary'));
        
    // ========== المرحلة 6: السرعة ===========
    } else if (levelNum === 6) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(100, 500, 120, 'moving'));
        platforms.push(new Platform(320, 440, 120, 'moving'));
        platforms.push(new Platform(540, 380, 120, 'moving'));
        platforms.push(new Platform(760, 320, 120, 'normal'));
        platforms.push(new Platform(200, 220, 150, 'normal'));
        
        coins.push(new Coin(140, 460));
        coins.push(new Coin(360, 400));
        coins.push(new Coin(580, 340));
        coins.push(new Coin(800, 280));
        coins.push(new Coin(250, 180));
        coins.push(new Coin(50, 540));
        
        enemies.push(new Enemy(770, 280, 320, 'patrol'));
        fires.push(new Fire(450, 530));
        
    // ========== المرحلة 7: الممرات الضيقة ===========
    } else if (levelNum === 7) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(150, 480, 90, 'normal'));
        platforms.push(new Platform(320, 420, 90, 'normal'));
        platforms.push(new Platform(490, 360, 90, 'normal'));
        platforms.push(new Platform(660, 300, 90, 'normal'));
        platforms.push(new Platform(400, 200, 120, 'moving'));
        platforms.push(new Platform(150, 140, 100, 'normal'));
        
        coins.push(new Coin(180, 440));
        coins.push(new Coin(350, 380));
        coins.push(new Coin(520, 320));
        coins.push(new Coin(690, 260));
        coins.push(new Coin(440, 160));
        coins.push(new Coin(180, 100));
        
        enemies.push(new Enemy(330, 380, 420, 'patrol'));
        enemies.push(new Enemy(670, 260, 300, 'stationary'));
        fires.push(new Fire(250, 530));
        fires.push(new Fire(580, 530));
        
    // ========== المرحلة 8: الأبراج ===========
    } else if (levelNum === 8) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(100, 480, 100, 'normal'));
        platforms.push(new Platform(100, 380, 100, 'normal'));
        platforms.push(new Platform(100, 280, 100, 'normal'));
        platforms.push(new Platform(300, 400, 120, 'moving'));
        platforms.push(new Platform(550, 320, 100, 'normal'));
        platforms.push(new Platform(750, 240, 120, 'normal'));
        platforms.push(new Platform(450, 160, 150, 'normal'));
        
        coins.push(new Coin(140, 440));
        coins.push(new Coin(140, 340));
        coins.push(new Coin(140, 240));
        coins.push(new Coin(340, 360));
        coins.push(new Coin(590, 280));
        coins.push(new Coin(790, 200));
        coins.push(new Coin(500, 120));
        
        enemies.push(new Enemy(560, 280, 320, 'patrol'));
        enemies.push(new Enemy(760, 200, 240, 'patrol'));
        fires.push(new Fire(220, 530));
        fires.push(new Fire(650, 530));
        
    // ========== المرحلة 9: متاهة المنصات ===========
    } else if (levelNum === 9) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(80, 500, 100, 'normal'));
        platforms.push(new Platform(250, 450, 100, 'moving'));
        platforms.push(new Platform(420, 400, 100, 'normal'));
        platforms.push(new Platform(590, 350, 100, 'moving'));
        platforms.push(new Platform(200, 300, 100, 'normal'));
        platforms.push(new Platform(400, 250, 100, 'moving'));
        platforms.push(new Platform(650, 200, 100, 'normal'));
        platforms.push(new Platform(300, 150, 140, 'normal'));
        
        coins.push(new Coin(120, 460));
        coins.push(new Coin(290, 410));
        coins.push(new Coin(460, 360));
        coins.push(new Coin(630, 310));
        coins.push(new Coin(240, 260));
        coins.push(new Coin(440, 210));
        coins.push(new Coin(690, 160));
        coins.push(new Coin(340, 110));
        
        enemies.push(new Enemy(260, 410, 450, 'patrol'));
        enemies.push(new Enemy(430, 360, 400, 'stationary'));
        enemies.push(new Enemy(600, 310, 350, 'patrol'));
        fires.push(new Fire(150, 530));
        fires.push(new Fire(500, 530));
        fires.push(new Fire(750, 530));
        
    // ========== المرحلة 10: التحدي الكبير ===========
    } else if (levelNum === 10) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(90, 520, 80, 'moving'));
        platforms.push(new Platform(240, 470, 80, 'moving'));
        platforms.push(new Platform(390, 420, 80, 'moving'));
        platforms.push(new Platform(540, 370, 80, 'moving'));
        platforms.push(new Platform(690, 320, 90, 'normal'));
        platforms.push(new Platform(150, 270, 90, 'moving'));
        platforms.push(new Platform(350, 220, 90, 'normal'));
        platforms.push(new Platform(550, 170, 90, 'moving'));
        platforms.push(new Platform(250, 120, 120, 'normal'));
        
        coins.push(new Coin(120, 480));
        coins.push(new Coin(270, 430));
        coins.push(new Coin(420, 380));
        coins.push(new Coin(570, 330));
        coins.push(new Coin(720, 280));
        coins.push(new Coin(180, 230));
        coins.push(new Coin(380, 180));
        coins.push(new Coin(580, 130));
        coins.push(new Coin(290, 80));
        
        enemies.push(new Enemy(250, 430, 470, 'patrol'));
        enemies.push(new Enemy(400, 380, 420, 'patrol'));
        enemies.push(new Enemy(700, 280, 320, 'stationary'));
        enemies.push(new Enemy(360, 180, 220, 'patrol'));
        fires.push(new Fire(500, 530));
        fires.push(new Fire(800, 530));
        
    // ========== المرحلة 11: الجحيم الناري ===========
    } else if (levelNum === 11) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(120, 500, 100, 'normal'));
        platforms.push(new Platform(320, 440, 100, 'moving'));
        platforms.push(new Platform(520, 380, 100, 'normal'));
        platforms.push(new Platform(720, 320, 100, 'moving'));
        platforms.push(new Platform(200, 260, 100, 'normal'));
        platforms.push(new Platform(450, 200, 100, 'moving'));
        platforms.push(new Platform(650, 140, 100, 'normal'));
        
        coins.push(new Coin(160, 460));
        coins.push(new Coin(360, 400));
        coins.push(new Coin(560, 340));
        coins.push(new Coin(760, 280));
        coins.push(new Coin(240, 220));
        coins.push(new Coin(490, 160));
        coins.push(new Coin(690, 100));
        coins.push(new Coin(50, 540));
        coins.push(new Coin(950, 540));
        
        enemies.push(new Enemy(330, 400, 440, 'patrol'));
        enemies.push(new Enemy(530, 340, 380, 'patrol'));
        enemies.push(new Enemy(730, 280, 320, 'patrol'));
        fires.push(new Fire(80, 530));
        fires.push(new Fire(240, 530));
        fires.push(new Fire(400, 530));
        fires.push(new Fire(560, 530));
        fires.push(new Fire(720, 530));
        fires.push(new Fire(880, 530));
        
    // ========== المرحلة 12: القفزات المستحيلة ===========
    } else if (levelNum === 12) {
        platforms.push(new Platform(0, 580, 120, 'normal'));
        platforms.push(new Platform(200, 520, 70, 'moving'));
        platforms.push(new Platform(350, 470, 70, 'moving'));
        platforms.push(new Platform(500, 420, 70, 'moving'));
        platforms.push(new Platform(650, 370, 70, 'moving'));
        platforms.push(new Platform(800, 320, 100, 'normal'));
        platforms.push(new Platform(150, 270, 80, 'moving'));
        platforms.push(new Platform(350, 220, 80, 'moving'));
        platforms.push(new Platform(550, 170, 80, 'moving'));
        platforms.push(new Platform(350, 100, 150, 'normal'));
        
        coins.push(new Coin(220, 480));
        coins.push(new Coin(370, 430));
        coins.push(new Coin(520, 380));
        coins.push(new Coin(670, 330));
        coins.push(new Coin(830, 280));
        coins.push(new Coin(180, 230));
        coins.push(new Coin(380, 180));
        coins.push(new Coin(580, 130));
        coins.push(new Coin(400, 60));
        coins.push(new Coin(60, 540));
        
        enemies.push(new Enemy(210, 480, 520, 'patrol'));
        enemies.push(new Enemy(360, 430, 470, 'patrol'));
        enemies.push(new Enemy(510, 380, 420, 'patrol'));
        enemies.push(new Enemy(810, 280, 320, 'stationary'));
        fires.push(new Fire(280, 530));
        fires.push(new Fire(430, 530));
        fires.push(new Fire(580, 530));
        fires.push(new Fire(730, 530));
        
    // ========== المرحلة 13: سباق الوقت ===========
    } else if (levelNum === 13) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(100, 510, 90, 'moving'));
        platforms.push(new Platform(250, 460, 90, 'moving'));
        platforms.push(new Platform(400, 410, 90, 'moving'));
        platforms.push(new Platform(550, 360, 90, 'moving'));
        platforms.push(new Platform(700, 310, 90, 'moving'));
        platforms.push(new Platform(200, 240, 90, 'moving'));
        platforms.push(new Platform(400, 180, 90, 'moving'));
        platforms.push(new Platform(600, 120, 90, 'moving'));
        platforms.push(new Platform(350, 60, 130, 'normal'));
        
        coins.push(new Coin(130, 470));
        coins.push(new Coin(280, 420));
        coins.push(new Coin(430, 370));
        coins.push(new Coin(580, 320));
        coins.push(new Coin(730, 270));
        coins.push(new Coin(230, 200));
        coins.push(new Coin(430, 140));
        coins.push(new Coin(630, 80));
        coins.push(new Coin(390, 20));
        coins.push(new Coin(900, 540));
        
        enemies.push(new Enemy(110, 470, 510, 'patrol'));
        enemies.push(new Enemy(260, 420, 460, 'patrol'));
        enemies.push(new Enemy(410, 370, 410, 'patrol'));
        enemies.push(new Enemy(560, 320, 360, 'patrol'));
        enemies.push(new Enemy(710, 270, 310, 'patrol'));
        fires.push(new Fire(350, 530));
        fires.push(new Fire(650, 530));
        
    // ========== المرحلة 14: الفوضى ===========
    } else if (levelNum === 14) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(80, 520, 80, 'moving'));
        platforms.push(new Platform(220, 480, 70, 'moving'));
        platforms.push(new Platform(350, 440, 80, 'moving'));
        platforms.push(new Platform(490, 400, 70, 'moving'));
        platforms.push(new Platform(630, 360, 80, 'moving'));
        platforms.push(new Platform(770, 320, 90, 'normal'));
        platforms.push(new Platform(150, 280, 80, 'moving'));
        platforms.push(new Platform(320, 240, 70, 'moving'));
        platforms.push(new Platform(500, 200, 80, 'moving'));
        platforms.push(new Platform(680, 160, 70, 'moving'));
        platforms.push(new Platform(300, 100, 120, 'normal'));
        
        for (let i = 0; i < 12; i++) {
            const x = 100 + i * 75;
            const y = 80 + Math.random() * 400;
            coins.push(new Coin(x, y));
        }
        
        enemies.push(new Enemy(90, 480, 520, 'patrol'));
        enemies.push(new Enemy(230, 440, 480, 'patrol'));
        enemies.push(new Enemy(360, 400, 440, 'patrol'));
        enemies.push(new Enemy(500, 360, 400, 'patrol'));
        enemies.push(new Enemy(640, 320, 360, 'patrol'));
        enemies.push(new Enemy(780, 280, 320, 'stationary'));
        
        fires.push(new Fire(140, 530));
        fires.push(new Fire(280, 530));
        fires.push(new Fire(420, 530));
        fires.push(new Fire(560, 530));
        fires.push(new Fire(700, 530));
        fires.push(new Fire(840, 530));
        
    // ========== المرحلة 15: النهائي الأسطوري ===========
    } else if (levelNum === 15) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        platforms.push(new Platform(70, 530, 60, 'moving'));
        platforms.push(new Platform(190, 490, 60, 'moving'));
        platforms.push(new Platform(310, 450, 60, 'moving'));
        platforms.push(new Platform(430, 410, 60, 'moving'));
        platforms.push(new Platform(550, 370, 60, 'moving'));
        platforms.push(new Platform(670, 330, 60, 'moving'));
        platforms.push(new Platform(790, 290, 80, 'normal'));
        platforms.push(new Platform(120, 250, 70, 'moving'));
        platforms.push(new Platform(270, 210, 70, 'moving'));
        platforms.push(new Platform(420, 170, 70, 'moving'));
        platforms.push(new Platform(570, 130, 70, 'moving'));
        platforms.push(new Platform(720, 90, 70, 'moving'));
        platforms.push(new Platform(350, 40, 150, 'normal'));
        
        for (let i = 0; i < 15; i++) {
            const x = 80 + i * 60;
            const y = 50 + (i % 3) * 150;
            coins.push(new Coin(x, y));
        }
        
        enemies.push(new Enemy(80, 490, 530, 'patrol'));
        enemies.push(new Enemy(200, 450, 490, 'patrol'));
        enemies.push(new Enemy(320, 410, 450, 'patrol'));
        enemies.push(new Enemy(440, 370, 410, 'patrol'));
        enemies.push(new Enemy(560, 330, 370, 'patrol'));
        enemies.push(new Enemy(680, 290, 330, 'patrol'));
        enemies.push(new Enemy(800, 250, 290, 'stationary'));
        
        for (let i = 0; i < 10; i++) {
            fires.push(new Fire(i * 100 + 30, 530));
        }
    } else {
        // إعادة للمرحلة الأولى
        loadLevel(1);
        return;
    }
    
    // إنشاء اللاعب في موقع آمن
    player = new Player(50, 400);
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
    // إخفاء جميع الشاشات
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    // عرض الشاشة المطلوبة
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.style.display = 'flex';
    }
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
    if (currentLevel > 15) {
        // مبروك! أنهيت جميع المراحل
        currentLevel = 1;
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
