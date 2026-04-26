const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');
const healthFill = document.getElementById('health-fill');
const currentOperationElement = document.getElementById('current-operation-display');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreElement = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const gameContainer = document.getElementById('game-container');

// Visual flashes
const damageFlash = document.createElement('div');
damageFlash.className = 'damage-flash';
gameContainer.appendChild(damageFlash);

const bonusFlash = document.createElement('div');
bonusFlash.className = 'bonus-flash';
gameContainer.appendChild(bonusFlash);

let width, height;
let gameLoopId;
let isPlaying = false;

// Game State
let score = 0;
let health = 100;
let currentQuestion = {};
let currentQuestionString = "";
let baseSpeed = 2; // Velocità base di caduta, aumenta man mano
let timePassed = 0;
let correctAnswersCount = 0;
let consecutiveCorrect = 0;
let consecutiveErrors = 0;
let activeTables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const tableTogglesContainer = document.getElementById('table-toggles');

let totalCorrect = parseInt(localStorage.getItem('mwars_totalCorrect')) || 0; 
const ALL_ALIENS = ["👽", "👾", "🤖", "👻", "😺", "🐶", "🦊", "🐼", "🐙", "🦖"];
let unlockedAliens = JSON.parse(localStorage.getItem('unlockedAliens')) || ["👽"];
let selectedAlien = localStorage.getItem('selectedAlien') || "👽";
let leaderboard = JSON.parse(localStorage.getItem('mwars_leaderboard')) || [];

// Entities
let player;
let bullets = [];
let enemies = [];
let particles = [];
let stars = [];

// Input handler
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space') {
        if (isPlaying && !keys.Space) {
            player.shoot();
        }
        keys.Space = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'Space') keys.Space = false;
});

// Touch controls for mobile
let currentTouchX = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let hasMoved = false;

canvas.addEventListener('touchstart', (e) => {
    currentTouchX = e.touches[0].clientX;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    hasMoved = false;
}, {passive: true});

canvas.addEventListener('touchmove', (e) => {
    if (!isPlaying) return;
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    
    // Se ci si muove più di 10 pixel, è un trascinamento e non un tap
    const dist = Math.hypot(touchX - touchStartX, touchY - touchStartY);
    if (dist > 10) {
        hasMoved = true;
    }
    
    const diff = touchX - currentTouchX;
    player.x += diff * 1.5; // Sensitivity
    currentTouchX = touchX;
    
    // Bounds check
    if (player.x < player.width/2) player.x = player.width/2;
    if (player.x > width - player.width/2) player.x = width - player.width/2;
}, {passive: true});

canvas.addEventListener('touchend', (e) => {
    if (!isPlaying) return;
    const touchDuration = Date.now() - touchStartTime;
    // Se è un tap veloce e senza movimento significativo, spara
    if (!hasMoved && touchDuration < 300) {
        player.shoot();
    }
}, {passive: true});

function resize() {
    width = gameContainer.clientWidth;
    height = gameContainer.clientHeight;
    canvas.width = width;
    canvas.height = height;
    
    if (stars.length === 0) {
        for (let i = 0; i < 150; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 1.5 + 0.2
            });
        }
    }
    
    if (player && player.y > height - player.height - 80) {
        player.y = height - player.height - 80;
    }
}

window.addEventListener('resize', resize);

class Player {
    constructor() {
        this.width = 50;
        this.height = 60;
        this.x = width / 2;
        this.y = height - this.height - 80;
        this.speed = 8;
        this.color = '#00f3ff';
        this.cooldown = 0;
    }

    update() {
        if (keys.ArrowLeft) this.x -= this.speed;
        if (keys.ArrowRight) this.x += this.speed;

        if (this.x < this.width/2) this.x = this.width/2;
        if (this.x > width - this.width/2) this.x = width - this.width/2;
        
        if (this.cooldown > 0) this.cooldown--;
        
        if (health <= 30 && Math.random() < 0.2) {
            createParticles(this.x + (Math.random() * 20 - 10), this.y, '#555555', 1, 0.2);
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const w = this.width;
        const h = this.height;

        let currentGlow = this.color;
        let wingColor = '#005588';
        let bodyColor1 = '#ffffff';
        let bodyColor2 = this.color;
        let bodyColor3 = '#004466';

        if (consecutiveCorrect >= 30) {
            // Diamante
            currentGlow = '#b9f2ff';
            wingColor = '#7ab8c9';
            bodyColor2 = '#b9f2ff';
            bodyColor3 = '#4f8594';
        } else if (consecutiveCorrect >= 10) {
            // Oro
            currentGlow = '#ffd700';
            wingColor = '#a88813';
            bodyColor2 = '#ffd700';
            bodyColor3 = '#806600';
        }

        // Ombra principale/Glow
        ctx.shadowBlur = (consecutiveCorrect >= 10) ? 25 : 15;
        ctx.shadowColor = currentGlow;

        // Ali laterali (spazzate all'indietro)
        ctx.fillStyle = wingColor;
        ctx.beginPath();
        ctx.moveTo(0, -h/4);
        ctx.lineTo(w/2, h/2);
        ctx.lineTo(w/2 - 10, h/2);
        ctx.lineTo(0, h/6);
        ctx.lineTo(-w/2 + 10, h/2);
        ctx.lineTo(-w/2, h/2);
        ctx.closePath();
        ctx.fill();

        // Cannoni laser sulle punte delle ali
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 5;
        ctx.fillRect(-w/2, 0, 4, h/2);
        ctx.fillRect(w/2 - 4, 0, 4, h/2);

        // Fusoliera centrale (corpo principale con gradiente)
        let grad = ctx.createLinearGradient(0, -h/2, 0, h/2);
        grad.addColorStop(0, bodyColor1);
        grad.addColorStop(0.2, bodyColor2);
        grad.addColorStop(1, bodyColor3);

        ctx.fillStyle = grad;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -h/2); // Punta
        ctx.lineTo(14, -h/6);
        ctx.lineTo(12, h/2);
        ctx.lineTo(-12, h/2);
        ctx.lineTo(-14, -h/6);
        ctx.closePath();
        ctx.fill();

        // Segni di danno (se la salute si abbassa)
        if (health < 100) {
            ctx.save();
            ctx.shadowBlur = 0;
            // Danni leggeri
            if (health <= 80) {
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.beginPath();
                ctx.arc(-5, 5, 3, 0, Math.PI*2);
                ctx.arc(6, -5, 2, 0, Math.PI*2);
                ctx.fill();
            }
            // Danni medi (crepe)
            if (health <= 50) {
                ctx.strokeStyle = 'rgba(20,20,20,0.8)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-7, 8);
                ctx.lineTo(-4, 12);
                ctx.moveTo(5, -2);
                ctx.lineTo(10, 5);
                ctx.stroke();
                
                ctx.fillStyle = 'rgba(50,0,0,0.5)';
                ctx.beginPath();
                ctx.arc(0, 10, 4, 0, Math.PI*2);
                ctx.fill();
            }
            // Danni gravi (buchi bruciati)
            if (health <= 30) {
                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                ctx.beginPath();
                ctx.arc(8, 12, 4, 0, Math.PI*2);
                ctx.arc(-8, 15, 3, 0, Math.PI*2);
                ctx.fill();
                
                ctx.strokeStyle = '#ff3300';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(6, 10);
                ctx.lineTo(10, 14);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Cabina di pilotaggio (Vetro)
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#050510';
        ctx.beginPath();
        ctx.moveTo(0, -h/3);
        ctx.lineTo(8, -h/8);
        ctx.lineTo(6, h/6);
        ctx.lineTo(-6, h/6);
        ctx.lineTo(-8, -h/8);
        ctx.closePath();
        ctx.fill();
        
        // Disegna l'alieno pilota
        if (selectedAlien) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(selectedAlien, 0, 5);
        }

        // Riflesso sul vetro
        ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(0, -h/3 + 2);
        ctx.lineTo(6, -h/8 + 2);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();

        // Doppio Propulsore Animato
        ctx.shadowBlur = 15;
        const flameLength = 10 + Math.random() * 20;
        const flameColor = Math.random() > 0.5 ? '#ff003c' : '#ff9900';
        ctx.shadowColor = flameColor;
        ctx.fillStyle = flameColor;

        // Propulsore Sinistro
        ctx.beginPath();
        ctx.moveTo(-10, h/2);
        ctx.lineTo(-4, h/2);
        ctx.lineTo(-7, h/2 + flameLength);
        ctx.closePath();
        ctx.fill();

        // Propulsore Destro
        ctx.beginPath();
        ctx.moveTo(4, h/2);
        ctx.lineTo(10, h/2);
        ctx.lineTo(7, h/2 + flameLength);
        ctx.closePath();
        ctx.fill();

        // Cuore dei propulsori (bianco ad alta temperatura)
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        
        ctx.beginPath();
        ctx.moveTo(-9, h/2);
        ctx.lineTo(-5, h/2);
        ctx.lineTo(-7, h/2 + flameLength * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(5, h/2);
        ctx.lineTo(9, h/2);
        ctx.lineTo(7, h/2 + flameLength * 0.5);
        ctx.closePath();
        ctx.fill();

        // Draw operation under the spaceship
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#00f3ff';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(currentQuestionString, 0, h/2 + 50);

        ctx.restore();
    }

    shoot() {
        if (this.cooldown <= 0) {
            let bulletColor = this.color;
            if (consecutiveCorrect >= 30) bulletColor = '#b9f2ff';
            else if (consecutiveCorrect >= 10) bulletColor = '#ffd700';

            let b = new Bullet(this.x, this.y - this.height/2, bulletColor);
            bullets.push(b);
            
            this.cooldown = 15; // Rate of fire limit
        }
    }
}

class Bullet {
    constructor(x, y, color) {
        this.x = x;
        this.y = y; // Start point (player tip)
        this.width = 6;
        this.color = color;
        this.life = 10; // Frames the beam is visible
        this.markedForDeletion = false;
        
        // Immediate collision check
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (e.y < this.y && Math.abs(this.x - e.x) < e.radius + this.width/2) {
                if (e.isCorrect) {
                    createParticles(e.x, e.y, '#00ff11', 40, 3);
                    applyBonus();
                    generateQuestion(); // Reset immediato e nuova ondata
                } else {
                    createParticles(e.x, e.y, '#ff003c', 20, 2);
                    e.markedForDeletion = true; 
                    applyMalus("SBAGLIATO!");
                }
                break;
            }
        }
        
        // Create particles at the origin
        createParticles(this.x, this.y, this.color, 5, 2);
    }

    update() {
        this.life--;
        if (this.life <= 0) this.markedForDeletion = true;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / 10;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        // The beam goes from the top of the screen (y=0) to the player (this.y)
        ctx.fillRect(this.x - this.width/2, 0, this.width, this.y);
        
        // Add a core white beam for a cooler effect
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 5;
        ctx.fillRect(this.x - this.width/4, 0, this.width/2, this.y);
        ctx.restore();
    }
}

class Enemy {
    constructor(x, y, number, isCorrect) {
        this.x = x;
        this.y = y;
        this.radius = 35;
        this.speed = baseSpeed + (Math.random() * 0.5); // Leggera variazione di velocità
        this.number = number;
        this.isCorrect = isCorrect;
        this.color = '#ff003c'; // Colore unico per non far capire quale sia giusto
        this.markedForDeletion = false;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
    }

    update() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
        
        // Se un nemico raggiunge il fondo...
        if (this.y > height + this.radius) {
            this.markedForDeletion = true;
            if (this.isCorrect) {
                // Se era quello giusto e ci è sfuggito -> Malus
                applyMalus("TROPPO LENTO!", '#ff9900');
                generateQuestion();
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Controlla se il giocatore è allineato (larghezza raggio laser = 6, quindi metà è 3)
        let displayColor = this.color;
        let isTargeted = player && (this.y < player.y) && Math.abs(player.x - this.x) < this.radius + 3;
        
        if (isTargeted) {
            displayColor = '#00f3ff'; // Colore azzurro quando è sotto tiro
        }

        ctx.shadowBlur = isTargeted ? 25 : 15;
        ctx.shadowColor = displayColor;
        
        // Forma da asteroide/cristallo (esagono irregolare)
        ctx.strokeStyle = displayColor;
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(20, 0, 30, 0.8)';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = 2 * Math.PI / 6 * i;
            // Leggera irregolarità per sembrare più naturale
            const r = this.radius - (i % 2 === 0 ? 5 : 0); 
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Testo del numero
        ctx.rotate(-this.rotation); // Annulla rotazione per leggere il testo dritto
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#fff';
        ctx.font = 'bold 22px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.number, 0, 0);
        
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, speedMultiplier) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 1;
        this.speedX = (Math.random() - 0.5) * 10 * speedMultiplier;
        this.speedY = (Math.random() - 0.5) * 10 * speedMultiplier;
        this.color = color;
        this.life = 1;
        this.decay = Math.random() * 0.05 + 0.02;
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
    }
    
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function createParticles(x, y, color, amount, speedMultiplier = 1) {
    for (let i = 0; i < amount; i++) {
        particles.push(new Particle(x, y, color, speedMultiplier));
    }
}

function showFloatingText(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    gameContainer.appendChild(el);
    
    setTimeout(() => {
        el.remove();
    }, 1000);
}

function generateQuestion() {
    // 'a' è scelto tra le tabelline attive
    const a = activeTables[Math.floor(Math.random() * activeTables.length)];
    const b = Math.floor(Math.random() * 10) + 1;
    const correct = a * b;
    
    currentQuestion = {
        a: a,
        b: b,
        answer: correct
    };
    
    currentQuestionString = `${a} x ${b} = ?`;
    if (currentOperationElement) {
        currentOperationElement.innerText = currentQuestionString;
    }
    
    enemies = [];
    spawnWave();
}

function spawnWave() {
    // Numero di opzioni basato sulla difficoltà (inizia da 2, +1 ogni 10, max 5)
    let numEnemies = Math.min(2 + Math.floor(correctAnswersCount / 10), 5); 
    // Riduci le opzioni se si fanno errori consecutivi (minimo 2 opzioni)
    numEnemies = Math.max(2, numEnemies - consecutiveErrors);
    
    const positions = [];
    const margin = 60; // Spazio dai bordi
    const spacing = (width - margin * 2) / (numEnemies - 1);
    
    for (let i = 0; i < numEnemies; i++) {
        positions.push(margin + i * spacing);
    }
    
    const correctIndex = Math.floor(Math.random() * numEnemies);
    const usedAnswers = new Set([currentQuestion.answer]);
    
    for (let i = 0; i < numEnemies; i++) {
        let number;
        let isCorrect = false;
        
        if (i === correctIndex) {
            number = currentQuestion.answer;
            isCorrect = true;
        } else {
            // Generiamo risposte sbagliate ma verosimili (errori comuni)
            do {
                const diff = Math.floor(Math.random() * 3) + 1;
                // Offsets basati sui fattori o piccoli scarti
                const offset = Math.random() > 0.5 ? 
                    (Math.random() > 0.5 ? currentQuestion.a : currentQuestion.b) * diff :
                    (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
                
                number = currentQuestion.answer + offset;
                if (number <= 0) number = currentQuestion.answer + Math.abs(offset) + 1;
            } while (usedAnswers.has(number));
            usedAnswers.add(number);
        }
        
        // Spawn oltre il margine superiore, sfalsati
        const yOffset = -50 - Math.random() * 100;
        enemies.push(new Enemy(positions[i], yOffset, number, isCorrect));
    }
}

function applyDamage(amount) {
    health -= amount;
    updateUI();
    
    gameContainer.classList.add('shake');
    setTimeout(() => gameContainer.classList.remove('shake'), 400);
    
    damageFlash.classList.add('active');
    setTimeout(() => damageFlash.classList.remove('active'), 100);
    
    if (health <= 0) {
        gameOver();
    }
}

function applyMalus(reason, color = '#ff003c') {
    applyDamage(15);
    consecutiveCorrect = 0; // Azzera i consecutivi perdendo i potenziamenti
    consecutiveErrors++;
    baseSpeed = Math.max(1, baseSpeed * 0.9); // Riduci la velocità del 10%
    score = Math.max(0, score - 50); // Tolgo punteggio
    showFloatingText(width/2, height/2, reason, color);
    updateUI();
}

function applyBonus() {
    consecutiveCorrect++;
    consecutiveErrors = 0;
    
    let multiplier = 1;
    let rankName = "";
    let rankColor = "#00ff11";
    if (consecutiveCorrect >= 30) {
        multiplier = 10;
        rankName = "\n(DIAMANTE 10X!)";
        rankColor = "#b9f2ff";
    } else if (consecutiveCorrect >= 10) {
        multiplier = 5;
        rankName = "\n(ORO 5X!)";
        rankColor = "#ffd700";
    }

    // Punteggio variabile: 100 base + bonus basato sul prodotto (es: 10x10 -> +100), moltiplicato
    const pointsEarned = (100 + (currentQuestion.a * currentQuestion.b)) * multiplier;
    score += pointsEarned;
    correctAnswersCount++;
    totalCorrect++;
    localStorage.setItem('mwars_totalCorrect', totalCorrect);
    
    // Pianeti e alieni ogni 100 risposte giuste
    if (totalCorrect % 100 === 0) {
        const nextAlienIndex = (totalCorrect / 100) % ALL_ALIENS.length;
        const newAlien = ALL_ALIENS[nextAlienIndex];
        if (!unlockedAliens.includes(newAlien)) {
            unlockedAliens.push(newAlien);
            localStorage.setItem('unlockedAliens', JSON.stringify(unlockedAliens));
        }
        
        isPlaying = false;
        document.getElementById('new-alien-display').innerText = newAlien;
        document.getElementById('planet-screen').classList.add('active');
    }

    // Cura leggera
    health = Math.min(100, health + 5);
    
    // Aumenta del 3% la velocità ogni 20 risultati corretti
    if (correctAnswersCount % 20 === 0) {
        let maxSpeed = height / 180; // max 3 secondi (180 frame a 60fps)
        baseSpeed *= 1.03;
        if (baseSpeed > maxSpeed) {
            baseSpeed = maxSpeed;
        }
    }
    
    showFloatingText(width/2, height/2 - 50, `+${pointsEarned}${rankName}`, rankColor);
    updateUI();
    
    bonusFlash.classList.add('active');
    setTimeout(() => bonusFlash.classList.remove('active'), 100);
}

function updateUI() {
    scoreElement.innerText = score;
    healthFill.style.width = `${health}%`;
    if (health < 30) {
        healthFill.style.backgroundColor = '#ff003c';
        healthFill.style.boxShadow = '0 0 15px #ff003c';
    } else if (health < 60) {
        healthFill.style.backgroundColor = '#ff9900';
        healthFill.style.boxShadow = '0 0 15px #ff9900';
    } else {
        healthFill.style.backgroundColor = '#00ff11';
        healthFill.style.boxShadow = '0 0 15px #00ff11';
    }
}

function checkCollisions() {
    // Collisione proiettili-nemici rimossa perché il laser è istantaneo e gestita alla sua creazione
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        
        // Collisione più permissiva per il giocatore
        if (dist < e.radius * 0.8 + player.height/2) {
            e.markedForDeletion = true;
            createParticles(player.x, player.y, '#00f3ff', 30, 3);
            createParticles(e.x, e.y, '#ff003c', 20, 2);
            applyMalus("IMPATTO!");
            
            if (e.isCorrect) {
                generateQuestion(); // Rigenera se ci schiantiamo sulla risposta corretta
            }
        }
    }
}

function drawBackground() {
    // Effetto scia per simulare movimento nello spazio
    ctx.fillStyle = 'rgba(5, 5, 16, 0.4)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        // Le stelle si muovono più velocemente man mano che il gioco accelera
        star.y += star.speed + (baseSpeed * 0.2); 
        if (star.y > height) {
            star.y = 0;
            star.x = Math.random() * width;
        }
        ctx.globalAlpha = Math.random() * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

function loop() {
    if (!isPlaying) return;
    
    timePassed++;
    
    drawBackground();
    
    player.update();
    player.draw();
    
    bullets.forEach(b => {
        b.update();
        b.draw();
    });
    bullets = bullets.filter(b => !b.markedForDeletion);
    
    enemies.forEach(e => {
        e.update();
        e.draw();
    });
    enemies = enemies.filter(e => !e.markedForDeletion);
    
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    particles = particles.filter(p => p.life > 0);
    
    checkCollisions();
    
    gameLoopId = requestAnimationFrame(loop);
}

function startGame() {
    resize();
    player = new Player();
    score = 0;
    health = 100;
    baseSpeed = 2;
    timePassed = 0;
    correctAnswersCount = 0;
    consecutiveCorrect = 0;
    consecutiveErrors = 0;
    bullets = [];
    enemies = [];
    particles = [];
    updateUI();
    
    // Pulisce testi fluttuanti rimasti
    document.querySelectorAll('.floating-text').forEach(el => el.remove());
    
    generateQuestion();
    
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    isPlaying = true;
    
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(loop);
}

function gameOver() {
    isPlaying = false;
    finalScoreElement.innerText = score;
    gameOverScreen.classList.add('active');
    
    if (score >= 10000) {
        document.getElementById('new-highscore-box').style.display = 'flex';
    } else {
        document.getElementById('new-highscore-box').style.display = 'none';
    }
    
    // Esplosione finale del giocatore
    createParticles(player.x, player.y, player.color, 100, 5);
    drawBackground(); // Disegna ultimo frame per l'esplosione
    particles.forEach(p => { p.update(); p.draw(); });
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

function initTableToggles() {
    if (!tableTogglesContainer) return;
    for (let i = 1; i <= 10; i++) {
        const toggle = document.createElement('button');
        toggle.className = 'table-toggle';
        toggle.innerText = i;
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            updateActiveTables();
        });
        tableTogglesContainer.appendChild(toggle);
    }
}

function updateActiveTables() {
    activeTables = [];
    const toggles = document.querySelectorAll('.table-toggle');
    toggles.forEach(toggle => {
        if (toggle.classList.contains('active')) {
            activeTables.push(parseInt(toggle.innerText));
        }
    });
    
    // Se nessuna è selezionata, usale tutte di nascosto
    if (activeTables.length === 0) {
        activeTables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }
}

function initAliens() {
    const container = document.getElementById('alien-toggles');
    if (!container) return;
    container.innerHTML = '';
    unlockedAliens.forEach(alien => {
        const btn = document.createElement('div');
        btn.innerText = alien;
        btn.style.cursor = 'pointer';
        btn.style.opacity = alien === selectedAlien ? '1' : '0.4';
        btn.style.transform = alien === selectedAlien ? 'scale(1.2)' : 'scale(1)';
        btn.style.transition = 'all 0.2s ease';
        btn.addEventListener('click', () => {
            selectedAlien = alien;
            localStorage.setItem('selectedAlien', selectedAlien);
            initAliens(); // refresh UI
        });
        container.appendChild(btn);
    });
}

function updateLeaderboardUI() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = '';
    if (leaderboard.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#aaa;">Nessun record ancora.</p>';
        return;
    }
    leaderboard.forEach((entry, i) => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.padding = '10px 0';
        item.style.borderBottom = '1px solid rgba(255,215,0,0.3)';
        item.style.color = '#fff';
        item.style.fontFamily = 'Orbitron';
        item.innerHTML = `<span>#${i+1} <strong>${entry.name}</strong></span> <span style="color:gold;">${entry.score}</span>`;
        list.appendChild(item);
    });
}

// Event Listeners UI
document.getElementById('planet-continue-btn').addEventListener('click', () => {
    document.getElementById('planet-screen').classList.remove('active');
    initAliens();
    startScreen.classList.add('active'); // Torna al menu principale
});

document.getElementById('show-leaderboard-btn').addEventListener('click', () => {
    updateLeaderboardUI();
    document.getElementById('leaderboard-screen').classList.add('active');
});

document.getElementById('leaderboard-close-btn').addEventListener('click', () => {
    document.getElementById('leaderboard-screen').classList.remove('active');
});

document.getElementById('submit-score-btn').addEventListener('click', () => {
    const name = document.getElementById('player-name').value || "Anonimo";
    leaderboard.push({ name, score });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10); // Tieni i primi 10
    localStorage.setItem('mwars_leaderboard', JSON.stringify(leaderboard));
    document.getElementById('new-highscore-box').style.display = 'none';
    updateLeaderboardUI();
    document.getElementById('leaderboard-screen').classList.add('active');
});

// Initialize setup
initTableToggles();
initAliens();
resize();
drawBackground();

