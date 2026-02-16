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

// نظام المستخدم
let currentUser = null;

// ========================================
// نظام التسجيل وتسجيل الدخول
// ========================================

// التحقق من تسجيل الدخول
function checkLogin() {
    const savedUser = localStorage.getItem('ninjaGameUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        return true;
    }
    return false;
}

// عرض شاشة التسجيل أو تسجيل الدخول
function initAuth() {
    const hasAccount = localStorage.getItem('ninjaGameAccount');
    if (hasAccount) {
        showScreen('loginScreen');
    } else {
        showScreen('registerScreen');
    }
}

// تحديث عرض اسم المستخدم
function updateUserDisplay() {
    if (currentUser) {
        document.getElementById('displayUsername').textContent = currentUser.username;
    }
}

// تسجيل حساب جديد
function registerUser(username, password, confirmPassword) {
    // التحقق من وجود حساب مسبق
    if (localStorage.getItem('ninjaGameAccount')) {
        return { success: false, message: 'يوجد حساب مسجل بالفعل!' };
    }
    
    // التحقق من البيانات
    if (!username || username.length < 3) {
        return { success: false, message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' };
    }
    
    if (!password || password.length < 4) {
        return { success: false, message: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' };
    }
    
    if (password !== confirmPassword) {
        return { success: false, message: 'كلمة المرور غير متطابقة' };
    }
    
    // حفظ الحساب
    const account = {
        username: username,
        password: password,
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('ninjaGameAccount', JSON.stringify(account));
    
    // تسجيل دخول تلقائي
    currentUser = { username: username };
    localStorage.setItem('ninjaGameUser', JSON.stringify(currentUser));
    
    return { success: true };
}

// تسجيل الدخول
function loginUser(username, password) {
    const savedAccount = localStorage.getItem('ninjaGameAccount');
    
    if (!savedAccount) {
        return { success: false, message: 'لا يوجد حساب مسجل! يرجى إنشاء حساب جديد' };
    }
    
    const account = JSON.parse(savedAccount);
    
    if (account.username !== username) {
        return { success: false, message: 'اسم المستخدم غير صحيح' };
    }
    
    if (account.password !== password) {
        return { success: false, message: 'كلمة المرور غير صحيحة' };
    }
    
    // تسجيل الدخول
    currentUser = { username: username };
    localStorage.setItem('ninjaGameUser', JSON.stringify(currentUser));
    
    return { success: true };
}

// تسجيل الخروج
function logoutUser() {
    localStorage.removeItem('ninjaGameUser');
    currentUser = null;
    
    // إيقاف اللعبة إذا كانت تعمل
    if (gameState === 'playing' || gameState === 'paused') {
        gameState = 'menu';
        clearInterval(gameInterval);
        clearInterval(timeInterval);
    }
    
    // العودة لشاشة تسجيل الدخول
    showScreen('loginScreen');
}

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
    constructor(x, y, platform, type = 'patrol') {
        this.x = x;
        this.y = y;
        this.width = CONFIG.enemy.width;
        this.height = CONFIG.enemy.height;
        this.type = type;
        this.speed = CONFIG.enemy.speed;
        this.direction = 1;
        this.platform = platform; // المنصة التي يمشي عليها
        this.velocityY = 0;
        this.gravity = 0.6;
    }

    update() {
        if (this.type === 'patrol' && this.platform) {
            // تحريك العدو
            this.x += this.speed * this.direction;
            
            // التحقق من حافة المنصة اليمنى
            if (this.x + this.width >= this.platform.x + this.platform.width) {
                this.x = this.platform.x + this.platform.width - this.width;
                this.direction = -1; // تغيير الاتجاه لليسار
            }
            
            // التحقق من حافة المنصة اليسرى
            if (this.x <= this.platform.x) {
                this.x = this.platform.x;
                this.direction = 1; // تغيير الاتجاه لليمين
            }
            
            // تحديث موقع Y ليبقى على المنصة
            this.y = this.platform.y - this.height;
        } else if (this.type === 'stationary' && this.platform) {
            // العدو الثابت يبقى في مكانه على المنصة
            this.y = this.platform.y - this.height;
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
        let p1 = new Platform(150, 480, 120, 'normal');
        platforms.push(p1);
        let p2 = new Platform(400, 420, 120, 'moving');
        platforms.push(p2);
        let p3 = new Platform(650, 350, 120, 'normal');
        platforms.push(p3);
        
        coins.push(new Coin(200, 440));
        coins.push(new Coin(450, 380));
        coins.push(new Coin(700, 310));
        coins.push(new Coin(400, 540));
        
    // ========== المرحلة 3: مواجهة أول عدو ===========
    } else if (levelNum === 3) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        let p1 = new Platform(150, 480, 150, 'normal');
        platforms.push(p1);
        let p2 = new Platform(400, 400, 250, 'normal');
        platforms.push(p2);
        let p3 = new Platform(700, 320, 150, 'normal');
        platforms.push(p3);
        
        coins.push(new Coin(200, 440));
        coins.push(new Coin(500, 360));
        coins.push(new Coin(750, 280));
        coins.push(new Coin(800, 540));
        
        enemies.push(new Enemy(420, p2.y - CONFIG.enemy.height, p2, 'patrol'));
        
    // ========== المرحلة 4: النار الأولى ===========
    } else if (levelNum === 4) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        let p1 = new Platform(180, 480, 140, 'normal');
        platforms.push(p1);
        let p2 = new Platform(420, 400, 140, 'normal');
        platforms.push(p2);
        let p3 = new Platform(660, 320, 140, 'normal');
        platforms.push(p3);
        
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
        let p1 = new Platform(120, 480, 120, 'normal');
        platforms.push(p1);
        let p2 = new Platform(300, 420, 120, 'moving');
        platforms.push(p2);
        let p3 = new Platform(500, 360, 150, 'normal');
        platforms.push(p3);
        let p4 = new Platform(680, 300, 120, 'moving');
        platforms.push(p4);
        let p5 = new Platform(350, 200, 150, 'normal');
        platforms.push(p5);
        
        coins.push(new Coin(160, 440));
        coins.push(new Coin(340, 380));
        coins.push(new Coin(540, 320));
        coins.push(new Coin(720, 260));
        coins.push(new Coin(390, 160));
        
        enemies.push(new Enemy(520, p3.y - CONFIG.enemy.height, p3, 'patrol'));
        
    // ========== المرحلة 6: السرعة ===========
    } else if (levelNum === 6) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        let p1 = new Platform(100, 500, 140, 'moving');
        platforms.push(p1);
        let p2 = new Platform(320, 440, 140, 'moving');
        platforms.push(p2);
        let p3 = new Platform(540, 380, 140, 'moving');
        platforms.push(p3);
        let p4 = new Platform(760, 320, 160, 'normal');
        platforms.push(p4);
        let p5 = new Platform(200, 220, 180, 'normal');
        platforms.push(p5);
        
        coins.push(new Coin(140, 460));
        coins.push(new Coin(360, 400));
        coins.push(new Coin(580, 340));
        coins.push(new Coin(800, 280));
        coins.push(new Coin(250, 180));
        coins.push(new Coin(50, 540));
        
        enemies.push(new Enemy(780, p4.y - CONFIG.enemy.height, p4, 'patrol'));
        fires.push(new Fire(450, 530));
        
    // ========== المرحلة 7: الممرات الضيقة ===========
    } else if (levelNum === 7) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        let p1 = new Platform(150, 480, 110, 'normal');
        platforms.push(p1);
        let p2 = new Platform(320, 420, 120, 'normal');
        platforms.push(p2);
        let p3 = new Platform(490, 360, 110, 'normal');
        platforms.push(p3);
        let p4 = new Platform(660, 300, 120, 'normal');
        platforms.push(p4);
        let p5 = new Platform(400, 200, 150, 'moving');
        platforms.push(p5);
        let p6 = new Platform(150, 140, 120, 'normal');
        platforms.push(p6);
        
        coins.push(new Coin(180, 440));
        coins.push(new Coin(350, 380));
        coins.push(new Coin(520, 320));
        coins.push(new Coin(690, 260));
        coins.push(new Coin(440, 160));
        coins.push(new Coin(180, 100));
        
        enemies.push(new Enemy(340, p2.y - CONFIG.enemy.height, p2, 'patrol'));
        enemies.push(new Enemy(680, p4.y - CONFIG.enemy.height, p4, 'patrol'));
        fires.push(new Fire(250, 530));
        fires.push(new Fire(580, 530));
        
    // ========== المرحلة 8: الأبراج ===========
    } else if (levelNum === 8) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        let p1 = new Platform(100, 480, 120, 'normal');
        platforms.push(p1);
        let p2 = new Platform(100, 380, 120, 'normal');
        platforms.push(p2);
        let p3 = new Platform(100, 280, 120, 'normal');
        platforms.push(p3);
        let p4 = new Platform(300, 400, 150, 'moving');
        platforms.push(p4);
        let p5 = new Platform(550, 320, 130, 'normal');
        platforms.push(p5);
        let p6 = new Platform(750, 240, 150, 'normal');
        platforms.push(p6);
        let p7 = new Platform(450, 160, 180, 'normal');
        platforms.push(p7);
        
        coins.push(new Coin(140, 440));
        coins.push(new Coin(140, 340));
        coins.push(new Coin(140, 240));
        coins.push(new Coin(340, 360));
        coins.push(new Coin(590, 280));
        coins.push(new Coin(790, 200));
        coins.push(new Coin(500, 120));
        
        enemies.push(new Enemy(570, p5.y - CONFIG.enemy.height, p5, 'patrol'));
        enemies.push(new Enemy(770, p6.y - CONFIG.enemy.height, p6, 'patrol'));
        fires.push(new Fire(220, 530));
        fires.push(new Fire(650, 530));
        
    // ========== المرحلة 9: متاهة المنصات ===========
    } else if (levelNum === 9) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        let p1 = new Platform(80, 500, 120, 'normal');
        platforms.push(p1);
        let p2 = new Platform(250, 450, 130, 'moving');
        platforms.push(p2);
        let p3 = new Platform(420, 400, 130, 'normal');
        platforms.push(p3);
        let p4 = new Platform(590, 350, 130, 'moving');
        platforms.push(p4);
        let p5 = new Platform(200, 300, 120, 'normal');
        platforms.push(p5);
        let p6 = new Platform(400, 250, 130, 'moving');
        platforms.push(p6);
        let p7 = new Platform(650, 200, 120, 'normal');
        platforms.push(p7);
        let p8 = new Platform(300, 150, 160, 'normal');
        platforms.push(p8);
        
        coins.push(new Coin(120, 460));
        coins.push(new Coin(290, 410));
        coins.push(new Coin(460, 360));
        coins.push(new Coin(630, 310));
        coins.push(new Coin(240, 260));
        coins.push(new Coin(440, 210));
        coins.push(new Coin(690, 160));
        coins.push(new Coin(340, 110));
        
        enemies.push(new Enemy(270, p2.y - CONFIG.enemy.height, p2, 'patrol'));
        enemies.push(new Enemy(440, p3.y - CONFIG.enemy.height, p3, 'patrol'));
        enemies.push(new Enemy(610, p4.y - CONFIG.enemy.height, p4, 'patrol'));
        fires.push(new Fire(150, 530));
        fires.push(new Fire(500, 530));
        fires.push(new Fire(750, 530));
        
    // ========== المرحلة 10: التحدي الكبير ===========
    } else if (levelNum === 10) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        let p1 = new Platform(90, 520, 100, 'moving');
        platforms.push(p1);
        let p2 = new Platform(240, 470, 110, 'moving');
        platforms.push(p2);
        let p3 = new Platform(390, 420, 110, 'moving');
        platforms.push(p3);
        let p4 = new Platform(540, 370, 110, 'moving');
        platforms.push(p4);
        let p5 = new Platform(690, 320, 120, 'normal');
        platforms.push(p5);
        let p6 = new Platform(150, 270, 110, 'moving');
        platforms.push(p6);
        let p7 = new Platform(350, 220, 120, 'normal');
        platforms.push(p7);
        let p8 = new Platform(550, 170, 110, 'moving');
        platforms.push(p8);
        let p9 = new Platform(250, 120, 140, 'normal');
        platforms.push(p9);
        
        coins.push(new Coin(120, 480));
        coins.push(new Coin(270, 430));
        coins.push(new Coin(420, 380));
        coins.push(new Coin(570, 330));
        coins.push(new Coin(720, 280));
        coins.push(new Coin(180, 230));
        coins.push(new Coin(380, 180));
        coins.push(new Coin(580, 130));
        coins.push(new Coin(290, 80));
        
        enemies.push(new Enemy(260, p2.y - CONFIG.enemy.height, p2, 'patrol'));
        enemies.push(new Enemy(410, p3.y - CONFIG.enemy.height, p3, 'patrol'));
        enemies.push(new Enemy(710, p5.y - CONFIG.enemy.height, p5, 'patrol'));
        enemies.push(new Enemy(370, p7.y - CONFIG.enemy.height, p7, 'patrol'));
        fires.push(new Fire(500, 530));
        fires.push(new Fire(800, 530));
        
    // ========== المرحلة 11: الجحيم الناري ===========
    } else if (levelNum === 11) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        let p1 = new Platform(120, 500, 120, 'normal');
        platforms.push(p1);
        let p2 = new Platform(320, 440, 130, 'moving');
        platforms.push(p2);
        let p3 = new Platform(520, 380, 130, 'normal');
        platforms.push(p3);
        let p4 = new Platform(720, 320, 130, 'moving');
        platforms.push(p4);
        let p5 = new Platform(200, 260, 120, 'normal');
        platforms.push(p5);
        let p6 = new Platform(450, 200, 130, 'moving');
        platforms.push(p6);
        let p7 = new Platform(650, 140, 120, 'normal');
        platforms.push(p7);
        
        coins.push(new Coin(160, 460));
        coins.push(new Coin(360, 400));
        coins.push(new Coin(560, 340));
        coins.push(new Coin(760, 280));
        coins.push(new Coin(240, 220));
        coins.push(new Coin(490, 160));
        coins.push(new Coin(690, 100));
        coins.push(new Coin(50, 540));
        coins.push(new Coin(950, 540));
        
        enemies.push(new Enemy(340, p2.y - CONFIG.enemy.height, p2, 'patrol'));
        enemies.push(new Enemy(540, p3.y - CONFIG.enemy.height, p3, 'patrol'));
        enemies.push(new Enemy(740, p4.y - CONFIG.enemy.height, p4, 'patrol'));
        fires.push(new Fire(80, 530));
        fires.push(new Fire(240, 530));
        fires.push(new Fire(400, 530));
        fires.push(new Fire(560, 530));
        fires.push(new Fire(720, 530));
        fires.push(new Fire(880, 530));
        
    // ========== المرحلة 12: القفزات المستحيلة ===========
    } else if (levelNum === 12) {
        platforms.push(new Platform(0, 580, 120, 'normal'));
        let p1 = new Platform(200, 520, 90, 'moving');
        platforms.push(p1);
        let p2 = new Platform(350, 470, 90, 'moving');
        platforms.push(p2);
        let p3 = new Platform(500, 420, 90, 'moving');
        platforms.push(p3);
        let p4 = new Platform(650, 370, 90, 'moving');
        platforms.push(p4);
        let p5 = new Platform(800, 320, 120, 'normal');
        platforms.push(p5);
        let p6 = new Platform(150, 270, 100, 'moving');
        platforms.push(p6);
        let p7 = new Platform(350, 220, 100, 'moving');
        platforms.push(p7);
        let p8 = new Platform(550, 170, 100, 'moving');
        platforms.push(p8);
        let p9 = new Platform(350, 100, 180, 'normal');
        platforms.push(p9);
        
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
        
        enemies.push(new Enemy(220, p1.y - CONFIG.enemy.height, p1, 'patrol'));
        enemies.push(new Enemy(370, p2.y - CONFIG.enemy.height, p2, 'patrol'));
        enemies.push(new Enemy(520, p3.y - CONFIG.enemy.height, p3, 'patrol'));
        enemies.push(new Enemy(820, p5.y - CONFIG.enemy.height, p5, 'patrol'));
        fires.push(new Fire(280, 530));
        fires.push(new Fire(430, 530));
        fires.push(new Fire(580, 530));
        fires.push(new Fire(730, 530));
        
    // ========== المرحلة 13: سباق الوقت ===========
    } else if (levelNum === 13) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        let p1 = new Platform(100, 510, 110, 'moving');
        platforms.push(p1);
        let p2 = new Platform(250, 460, 110, 'moving');
        platforms.push(p2);
        let p3 = new Platform(400, 410, 110, 'moving');
        platforms.push(p3);
        let p4 = new Platform(550, 360, 110, 'moving');
        platforms.push(p4);
        let p5 = new Platform(700, 310, 110, 'moving');
        platforms.push(p5);
        let p6 = new Platform(200, 240, 110, 'moving');
        platforms.push(p6);
        let p7 = new Platform(400, 180, 110, 'moving');
        platforms.push(p7);
        let p8 = new Platform(600, 120, 110, 'moving');
        platforms.push(p8);
        let p9 = new Platform(350, 60, 150, 'normal');
        platforms.push(p9);
        
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
        
        enemies.push(new Enemy(120, p1.y - CONFIG.enemy.height, p1, 'patrol'));
        enemies.push(new Enemy(270, p2.y - CONFIG.enemy.height, p2, 'patrol'));
        enemies.push(new Enemy(420, p3.y - CONFIG.enemy.height, p3, 'patrol'));
        enemies.push(new Enemy(570, p4.y - CONFIG.enemy.height, p4, 'patrol'));
        enemies.push(new Enemy(720, p5.y - CONFIG.enemy.height, p5, 'patrol'));
        fires.push(new Fire(350, 530));
        fires.push(new Fire(650, 530));
        
    // ========== المرحلة 14: الفوضى ===========
    } else if (levelNum === 14) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        let p1 = new Platform(80, 520, 100, 'moving');
        platforms.push(p1);
        let p2 = new Platform(220, 480, 90, 'moving');
        platforms.push(p2);
        let p3 = new Platform(350, 440, 100, 'moving');
        platforms.push(p3);
        let p4 = new Platform(490, 400, 90, 'moving');
        platforms.push(p4);
        let p5 = new Platform(630, 360, 100, 'moving');
        platforms.push(p5);
        let p6 = new Platform(770, 320, 110, 'normal');
        platforms.push(p6);
        let p7 = new Platform(150, 280, 100, 'moving');
        platforms.push(p7);
        let p8 = new Platform(320, 240, 90, 'moving');
        platforms.push(p8);
        let p9 = new Platform(500, 200, 100, 'moving');
        platforms.push(p9);
        let p10 = new Platform(680, 160, 90, 'moving');
        platforms.push(p10);
        let p11 = new Platform(300, 100, 140, 'normal');
        platforms.push(p11);
        
        for (let i = 0; i < 12; i++) {
            const x = 100 + i * 75;
            const y = 80 + Math.random() * 400;
            coins.push(new Coin(x, y));
        }
        
        enemies.push(new Enemy(100, p1.y - CONFIG.enemy.height, p1, 'patrol'));
        enemies.push(new Enemy(240, p2.y - CONFIG.enemy.height, p2, 'patrol'));
        enemies.push(new Enemy(370, p3.y - CONFIG.enemy.height, p3, 'patrol'));
        enemies.push(new Enemy(510, p4.y - CONFIG.enemy.height, p4, 'patrol'));
        enemies.push(new Enemy(650, p5.y - CONFIG.enemy.height, p5, 'patrol'));
        enemies.push(new Enemy(790, p6.y - CONFIG.enemy.height, p6, 'patrol'));
        
        fires.push(new Fire(140, 530));
        fires.push(new Fire(280, 530));
        fires.push(new Fire(420, 530));
        fires.push(new Fire(560, 530));
        fires.push(new Fire(700, 530));
        fires.push(new Fire(840, 530));
        
    // ========== المرحلة 15: النهائي الأسطوري ===========
    } else if (levelNum === 15) {
        platforms.push(new Platform(0, 580, 1000, 'normal'));
        let p1 = new Platform(70, 530, 80, 'moving');
        platforms.push(p1);
        let p2 = new Platform(190, 490, 80, 'moving');
        platforms.push(p2);
        let p3 = new Platform(310, 450, 80, 'moving');
        platforms.push(p3);
        let p4 = new Platform(430, 410, 80, 'moving');
        platforms.push(p4);
        let p5 = new Platform(550, 370, 80, 'moving');
        platforms.push(p5);
        let p6 = new Platform(670, 330, 80, 'moving');
        platforms.push(p6);
        let p7 = new Platform(790, 290, 100, 'normal');
        platforms.push(p7);
        let p8 = new Platform(120, 250, 90, 'moving');
        platforms.push(p8);
        let p9 = new Platform(270, 210, 90, 'moving');
        platforms.push(p9);
        let p10 = new Platform(420, 170, 90, 'moving');
        platforms.push(p10);
        let p11 = new Platform(570, 130, 90, 'moving');
        platforms.push(p11);
        let p12 = new Platform(720, 90, 90, 'moving');
        platforms.push(p12);
        let p13 = new Platform(350, 40, 180, 'normal');
        platforms.push(p13);
        
        for (let i = 0; i < 15; i++) {
            const x = 80 + i * 60;
            const y = 50 + (i % 3) * 150;
            coins.push(new Coin(x, y));
        }
        
        enemies.push(new Enemy(90, p1.y - CONFIG.enemy.height, p1, 'patrol'));
        enemies.push(new Enemy(210, p2.y - CONFIG.enemy.height, p2, 'patrol'));
        enemies.push(new Enemy(330, p3.y - CONFIG.enemy.height, p3, 'patrol'));
        enemies.push(new Enemy(450, p4.y - CONFIG.enemy.height, p4, 'patrol'));
        enemies.push(new Enemy(570, p5.y - CONFIG.enemy.height, p5, 'patrol'));
        enemies.push(new Enemy(690, p6.y - CONFIG.enemy.height, p6, 'patrol'));
        enemies.push(new Enemy(810, p7.y - CONFIG.enemy.height, p7, 'patrol'));
        
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
    console.log('🖥️ عرض الشاشة:', screenId);
    // إخفاء جميع الشاشات
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    // عرض الشاشة المطلوبة
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.style.display = 'flex';
        console.log('✅ تم عرض الشاشة:', screenId);
    } else {
        console.error('❌ الشاشة غير موجودة:', screenId);
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
    
    console.log('🎮 تحميل اللعبة...');
    console.log('📦 البيانات المحفوظة:', {
        user: localStorage.getItem('ninjaGameUser'),
        account: localStorage.getItem('ninjaGameAccount')
    });
    
    // التحقق من تسجيل الدخول
    if (checkLogin()) {
        // المستخدم مسجل دخول بالفعل
        console.log('✅ المستخدم مسجل دخول:', currentUser);
        updateUserDisplay();
        showScreen('startScreen');
    } else {
        // المستخدم غير مسجل
        console.log('❌ المستخدم غير مسجل، عرض شاشة التسجيل');
        initAuth();
    }
    
    // معالجات نموذج التسجيل
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
        const result = registerUser(username, password, confirmPassword);
        
        if (result.success) {
            updateUserDisplay();
            showScreen('startScreen');
        } else {
            document.getElementById('registerError').textContent = result.message;
        }
    });
    
    // معالجات نموذج تسجيل الدخول
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        const result = loginUser(username, password);
        
        if (result.success) {
            updateUserDisplay();
            showScreen('startScreen');
        } else {
            document.getElementById('loginError').textContent = result.message;
        }
    });
    
    // التبديل بين شاشات التسجيل
    document.getElementById('showLoginFromRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerError').textContent = '';
        document.getElementById('registerForm').reset();
        showScreen('loginScreen');
    });
    
    document.getElementById('showRegisterFromLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginError').textContent = '';
        document.getElementById('loginForm').reset();
        showScreen('registerScreen');
    });
    
    // زر تسجيل الخروج
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
            logoutUser();
        }
    });
    
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
