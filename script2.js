// ─── Element refs ─────────────────────────────────────────────────────────────
const player    = document.getElementById("player");
const portal    = document.getElementById("portal");
const scoreText = document.getElementById("score");
const game      = document.getElementById("game");
const stars     = document.querySelectorAll(".star");

// ─── Physics ──────────────────────────────────────────────────────────────────
const GROUND_Y   = 20;
const PLAYER_H   = 90;
const GRAVITY    = 0.45;
const JUMP_FORCE = 14;

// ─── Player state ─────────────────────────────────────────────────────────────
let x          = 50;
let y          = GROUND_Y;
let velocityY  = 0;
let jumping    = false;
let facingLeft = false;
let score      = 0;
let gameOver   = false;

// ─── Lives ────────────────────────────────────────────────────────────────────
let lumiLives      = 6;
let enemyLives     = 8;
let lumiInvincible = false;

// ─── Projectiles ──────────────────────────────────────────────────────────────
const lumiFireballs = [];
const enemyOrbs     = [];
let lastFireTime = 0;
const FIRE_COOLDOWN = 450;

// ─── Enemy state ──────────────────────────────────────────────────────────────
let enemyX          = 1000;
let enemyY          = GROUND_Y;
let enemyVelY       = 0;
let enemyJumping    = false;
let lastEnemyShot   = 0;
const ENEMY_SHOOT_INTERVAL = 1800;

// ─── Platform dirs ────────────────────────────────────────────────────────────
const platformDirs = new Map();

// ─── Keys ─────────────────────────────────────────────────────────────────────
const keys = {};
document.addEventListener("keydown", e => {
    keys[e.key] = true;
    if ((e.key === "s" || e.key === "S") && !gameOver) shootFireball();
});
document.addEventListener("keyup", e => {
    keys[e.key] = false;
    if (!jumping) setSprite("assets/lumi-idle.png");
});

// ─── Sprite ───────────────────────────────────────────────────────────────────
function setSprite(src) {
    player.style.backgroundImage = `url('${src}')`;
    player.style.transform = facingLeft ? "scaleX(-1)" : "scaleX(1)";
}

// ─── Lumi shoots fireball ─────────────────────────────────────────────────────
function shootFireball() {
    const now = Date.now();
    if (now - lastFireTime < FIRE_COOLDOWN) return;
    lastFireTime = now;

    const el = document.createElement("div");
    el.classList.add("lumi-fireball");
    const fx = facingLeft ? x - 10 : x + 55;
    const fy = y + 30;
    el.style.left   = fx + "px";
    el.style.bottom = fy + "px";
    game.appendChild(el);
    lumiFireballs.push({ el, x: fx, y: fy, dir: facingLeft ? -1 : 1 });

    setSprite("assets/lumi-collect.png");
    setTimeout(() => { if (!jumping) setSprite("assets/lumi-idle.png"); }, 200);
}

// ─── Enemy shoots orb toward Lumi ─────────────────────────────────────────────
function enemyShoot() {
    if (enemyLives <= 0) return;
    const el = document.createElement("div");
    el.classList.add("enemy-orb");

    // Fire from enemy center toward Lumi
    const startX = enemyX + 48;   // center of the larger enemy
    const startY = enemyY + 50;
    el.style.left   = startX + "px";
    el.style.bottom = startY + "px";
    game.appendChild(el);

    const dir = x < enemyX ? -1 : 1;
    enemyOrbs.push({ el, x: startX, y: startY, dir });
}
// ─── Update fireballs ─────────────────────────────────────────────────────────
function updateFireballs() {
    for (let i = lumiFireballs.length - 1; i >= 0; i--) {
        const fb = lumiFireballs[i];
        fb.x += 9 * fb.dir;
        fb.el.style.left   = fb.x + "px";
        fb.el.style.bottom = fb.y + "px";

        if (fb.x > window.innerWidth + 50 || fb.x < -50) {
            fb.el.remove();
            lumiFireballs.splice(i, 1);
            continue;
        }

        // Hit enemy
        if (enemyLives > 0) {
            if (
                fb.x + 18 > enemyX &&
                fb.x      < enemyX + 60 &&
                fb.y + 18 > enemyY &&
                fb.y      < enemyY + 70
            ) {
                fb.el.remove();
                lumiFireballs.splice(i, 1);
                hitEnemy();
            }
        }
    }
}

// ─── Update enemy orbs ────────────────────────────────────────────────────────
function updateEnemyOrbs() {
    for (let i = enemyOrbs.length - 1; i >= 0; i--) {
        const orb = enemyOrbs[i];
        orb.x += 6 * orb.dir;
        orb.el.style.left   = orb.x + "px";
        orb.el.style.bottom = orb.y + "px";

        if (orb.x > window.innerWidth + 50 || orb.x < -50) {
            orb.el.remove();
            enemyOrbs.splice(i, 1);
            continue;
        }

        if (!lumiInvincible) {
            if (
                orb.x + 16 > x      &&
                orb.x      < x + 55 &&
                orb.y + 16 > y      &&
                orb.y      < y + PLAYER_H
            ) {
                orb.el.remove();
                enemyOrbs.splice(i, 1);
                hitLumi();
            }
        }
    }
}

// ─── Hit enemy ────────────────────────────────────────────────────────────────
function hitEnemy() {
    enemyLives--;
    const heart = document.getElementById(`enemy-h${enemyLives + 1}`);
    if (heart) heart.classList.add("lost");

    const enemyEl = document.getElementById("enemy");
    if (enemyEl) {
        setEnemySprite("assets/enemyhurt.png");
        setTimeout(() => { enemyCurrentSprite = ""; }, 400); // force sprite refresh after hurt
    }

    if (enemyLives <= 0) {
        if (enemyEl) {
            setEnemySprite("assets/enemyhurt.png");
            setTimeout(() => {
                enemyEl.style.display = "none";
                enemyOrbs.forEach(o => o.el.remove());
                enemyOrbs.length = 0;
                portal.classList.remove("hidden");
                portal.classList.add("open");
            }, 800);
        }
    }
}

// ─── Hit Lumi ─────────────────────────────────────────────────────────────────
function hitLumi() {
    if (lumiInvincible || gameOver) return;
    lumiLives--;
    const heart = document.getElementById(`lumi-h${lumiLives + 1}`);
if (!heart) {
    const allHearts = document.querySelectorAll("#lumi-lives .heart:not(.lost)");
    if (allHearts.length) allHearts[allHearts.length - 1].classList.add("lost");
} else {
    heart.classList.add("lost");
}

player.classList.add("hit-flash");
setTimeout(() => player.classList.remove("hit-flash"), 400);

if (lumiLives <= 0) {
    gameOver = true;
    setTimeout(() => {
        document.getElementById("level-failed").classList.remove("hidden");
    }, 500);
    return;
}

    lumiInvincible = true;
    // Flicker during invincibility
    let flicker = setInterval(() => {
        player.style.opacity = player.style.opacity === "0.3" ? "1" : "0.3";
    }, 150);
    setTimeout(() => {
        lumiInvincible = false;
        clearInterval(flicker);
        player.style.opacity = "1";
    }, 1500);
}

// ─── Enemy AI — follows Lumi on ground, jumps on platforms ───────────────────
// ─── Enemy sprite helper ───────────────────────────────────────────────────
let enemyCurrentSprite = "";
function setEnemySprite(src) {
    const enemyEl = document.getElementById("enemy");
    if (!enemyEl || enemyCurrentSprite === src) return;
    enemyCurrentSprite = src;
    enemyEl.style.backgroundImage = `url('${src}')`;
    enemyEl.style.backgroundSize = "contain";
    enemyEl.style.backgroundRepeat = "no-repeat";
    enemyEl.style.backgroundPosition = "center bottom";
}

// ─── Enemy walk animation ──────────────────────────────────────────────────
const enemyWalkFrames = ["assets/enemywalk1.png", "assets/enemywalk2.png", "assets/enemywalk3.png"];
let enemyWalkFrame = 0;
let enemyWalkTimer = 0;
const ENEMY_WALK_SPEED = 8; // frames between walk sprite changes

// ─── Enemy AI — full platform navigation ──────────────────────────────────
function updateEnemy() {
    if (enemyLives <= 0) return;
    const enemyEl = document.getElementById("enemy");
    if (!enemyEl || enemyEl.style.display === "none") return;

    const dx = x - enemyX;
    const dy = y - enemyY;

    // ── Find what platform/ground the enemy is currently on ──
    // Build a list of all surfaces (ground + platforms)
    const surfaces = [];

    // Ground sections
    surfaces.push({ left: 0, right: 1400, top: GROUND_Y });

    document.querySelectorAll(".platform:not(.gone)").forEach(p => {
        const pLeft   = parseInt(p.style.left)   || 0;
        const pBottom = parseInt(p.style.bottom) || 0;
        const pWidth  = parseInt(p.style.width)  || 0;
        if (pBottom > 0) { // skip ground-level platforms since we handle those above
            surfaces.push({ left: pLeft, right: pLeft + pWidth, top: pBottom + 20 });
        }
    });

    // ── Apply gravity ──
    enemyVelY -= GRAVITY * 0.75;
    enemyY += enemyVelY;

    // ── Surface collision ──
    let onSurface = false;
    let currentSurfaceTop = GROUND_Y;
    surfaces.forEach(s => {
        const overlapX = enemyX + 60 > s.left && enemyX < s.right;
         if (overlapX && enemyY <= s.top + 15 && enemyY >= s.top - 40 && enemyVelY <= 0) {
            enemyY = s.top;
            enemyVelY = 0;
            enemyJumping = false;
            onSurface = true;
            currentSurfaceTop = s.top;
        }
    });

    // ── Decide movement ──
    const chaseSpeed = 1.8;

    if (onSurface) {
        // Check if Lumi is on a higher surface — find the surface Lumi is on
        let lumiSurfaceTop = GROUND_Y;
        surfaces.forEach(s => {
            if (x + 50 > s.left && x < s.right) {
                if (Math.abs(y - s.top) < 30) lumiSurfaceTop = s.top;
            }
        });

        const needsToGoUp = lumiSurfaceTop > currentSurfaceTop + 30;

        // Jump toward Lumi if she's higher OR enemy is close enough horizontally to jump up
        if (!enemyJumping && needsToGoUp && Math.abs(dx) < 250 && Math.random() < 0.04) {
            enemyVelY = 12;
            enemyJumping = true;
        }

        // If blocked by a gap ahead, jump over it
        if (!enemyJumping && Math.random() < 0.008) {
            // Check if there's ground ahead in the direction of Lumi
            const checkX = dx > 0 ? enemyX + 80 : enemyX - 20;
            const gapAhead = !surfaces.some(s => checkX > s.left && checkX < s.right && Math.abs(currentSurfaceTop - s.top) < 5);
            if (gapAhead) {
                enemyVelY = 13;
                enemyJumping = true;
            }
        }

        // Chase Lumi horizontally
        if (Math.abs(dx) > 10) {
            enemyX += dx > 0 ? chaseSpeed : -chaseSpeed;
        }

        // Walk animation
        enemyWalkTimer++;
        if (Math.abs(dx) > 10) {
            if (enemyWalkTimer >= ENEMY_WALK_SPEED) {
                enemyWalkTimer = 0;
                enemyWalkFrame = (enemyWalkFrame + 1) % enemyWalkFrames.length;
            }
            setEnemySprite(enemyWalkFrames[enemyWalkFrame]);
        } else {
            setEnemySprite("assets/enemyidle.png");
        }
    } else {
        // In air — still move toward Lumi
        if (Math.abs(dx) > 10) enemyX += dx > 0 ? chaseSpeed * 0.6 : -chaseSpeed * 0.6;
    }

    // ── Keep within bounds ──
    enemyX = Math.max(0, Math.min(enemyX, window.innerWidth - 60));

    // ── Update DOM ──
    enemyEl.style.left      = enemyX + "px";
    enemyEl.style.bottom    = enemyY + "px";
    // Flip based on direction toward Lumi
    // dx = x - enemyX, so if dx > 0 Lumi is to the RIGHT, enemy should face right (no flip)
// dx = x - enemyX (positive = Lumi is to the right of enemy)
enemyEl.style.transform = dx < 0 ? "scaleX(1)" : "scaleX(-1)";

    // ── Shoot at Lumi ──
    const now = Date.now();
    if (now - lastEnemyShot > ENEMY_SHOOT_INTERVAL) {
        lastEnemyShot = now;
        setEnemySprite("assets/enemyidle.png");
        setTimeout(() => {
            if (!enemyJumping) setEnemySprite("assets/enemywalk1.png");
        }, 350);
        enemyShoot();
    }

    // ── Contact damage ──
    if (!lumiInvincible) {
        const inX = x + 50 > enemyX + 5 && x < enemyX + 55;
        const inY = y < enemyY + 70 && y + PLAYER_H > enemyY;
        if (inX && inY) hitLumi();
    }

    if (enemyY < GROUND_Y) {
    enemyY = GROUND_Y;
    enemyVelY = 0;
    enemyJumping = false;
}
}

// ─── Platform collision helper ────────────────────────────────────────────────
function handleCollisions() {
    // Ground — level 4 has 3 ground sections with gaps
    // REPLACE the ground section inside handleCollisions():
if (y <= GROUND_Y) {
    y = GROUND_Y; velocityY = 0;
    if (jumping) {
        jumping = false;
        if (!keys["ArrowRight"] && !keys["ArrowLeft"]) setSprite("assets/lumi-idle.png");
    }
}

// Fall into gap — keep this but raise the threshold since no more pits
if (y < -300) {
    hitLumi();
    x = 50; y = GROUND_Y; velocityY = 0; jumping = false;
}

    // Fall into gap — lose a life, reset

    // Platforms
    document.querySelectorAll(".platform").forEach(platform => {
        if (platform.classList.contains("gone")) return;
        const pLeft   = parseInt(platform.style.left)   || 0;
        const pBottom = parseInt(platform.style.bottom) || 0;
        const pWidth  = parseInt(platform.style.width)  || window.innerWidth;
        const pTop    = pBottom + 20;
        const overlapX = x + 50 > pLeft && x < pLeft + pWidth;
        if (overlapX && y <= pTop + 5 && y >= pTop - 15 && velocityY <= 0) {
            y = pTop; velocityY = 0; jumping = false;
            if (!keys["ArrowRight"] && !keys["ArrowLeft"]) setSprite("assets/lumi-idle.png");
        }
    });
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function checkStars() {
    stars.forEach(star => {
        if (star.classList.contains("collected")) return;
        const sr = star.getBoundingClientRect();
        const pr = player.getBoundingClientRect();
        if (pr.right > sr.left && pr.left < sr.right &&
            pr.bottom > sr.top && pr.top < sr.bottom) {
            star.classList.add("collected");
            star.style.display = "none";
            score++;
            scoreText.innerText = `Stars: ${score} / 3`;
        }
    });
}

// ─── Portal ───────────────────────────────────────────────────────────────────
function checkPortal() {
    if (portal.classList.contains("hidden")) return;
    if (score < 3) {
        // Show hint that stars are needed
        portal.title = "Collect all stars first!";
        return;
    }
    const pr  = portal.getBoundingClientRect();
    const plr = player.getBoundingClientRect();
    if (plr.right > pr.left && plr.left < pr.right &&
        plr.bottom > pr.top && plr.top < pr.bottom) {
        gameOver = true;
        document.getElementById("level-complete").classList.remove("hidden");
    }
}

// ─── Spikes ───────────────────────────────────────────────────────────────────
function checkSpikes() {
    if (gameOver) return;
    document.querySelectorAll(".spike").forEach(spike => {
        const sr  = spike.getBoundingClientRect();
        const plr = player.getBoundingClientRect();
        if (plr.right - 8  > sr.left + 10 &&
            plr.left  + 8  < sr.right - 10 &&
            plr.bottom     > sr.top + 15 &&
            plr.top        < sr.bottom) {
            hitLumi();
        }
    });
}

// ─── Main loop ────────────────────────────────────────────────────────────────
function updatePlayer() {
    if (gameOver) return;

    if (keys["ArrowRight"]) { x += 4; facingLeft = false; setSprite("assets/lumi-run1.png"); }
    else if (keys["ArrowLeft"]) { x -= 4; facingLeft = true; setSprite("assets/lumi-run1.png"); }

    if ((keys[" "] || keys["ArrowUp"]) && !jumping) {
        velocityY = JUMP_FORCE; jumping = true;
        setSprite("assets/lumi-jump.png");
    }

    velocityY -= GRAVITY;
    y += velocityY;

    if (velocityY < -2 && jumping) setSprite("assets/lumi-fall.png");

    x = Math.max(0, Math.min(x, window.innerWidth - 70));

    handleCollisions();

    player.style.left   = x + "px";
    player.style.bottom = y + "px";

    checkStars();
    checkPortal();
    checkSpikes();
    updateEnemy();
    updateFireballs();
    updateEnemyOrbs();

    requestAnimationFrame(updatePlayer);
}

if (game) updatePlayer();