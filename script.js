const player = document.getElementById("player");
const stars = document.querySelectorAll(".star");
const portal = document.getElementById("portal");
const scoreText = document.getElementById("score");
const landingScreen = document.getElementById("landing-screen");
const game = document.getElementById("game");
const playBtn = document.getElementById("play-btn");
const storyScreen = document.getElementById("story-screen");
const storyImage = document.getElementById("story-image");
const storyText = document.getElementById("story-text");
const platforms = document.querySelectorAll(".platform");
const levelsBtn = document.getElementById("levels-btn");
const preloadImages = [
    "assets/background-level1.jpg",
    "assets/background-level2.jpg",
    "assets/background-level3.jpg",
    "assets/background-level4.png",
    "assets/lumi-idle.png",
    "assets/lumi-run1.png",
    "assets/lumi-run2.png",
    "assets/lumi-run3.png",
    "assets/portal-open.png",
    "assets/portal-closed.png"
];

preloadImages.forEach(src => {
    const img = new Image();
    img.src = src;
});
const storyPages = [
    { img: "assets/story1.png", text: "One night, the moon began to crack..." },
    { img: "assets/story2.png", text: "Its light shattered into pieces..." },
    { img: "assets/story3.png", text: "The lost stars fell across the world..." },
    { img: "assets/story4.png", text: "A child named Lumi heard their call..." },
    { img: "assets/story5.png", text: "And began the journey to restore the sky." }
];

let currentStory = 0;

const runFrames = [
    "assets/lumi-run1.png",
   // "assets/lumi-run2.png",
   // "assets/lumi-run3.png"
];
let currentRunFrame = 0;

if(playBtn){
playBtn.onclick = () => {
    landingScreen.style.display = "none";
    storyScreen.classList.remove("hidden");   // ← show story, not game yet
    showStory();
};
}
if(levelsBtn){
levelsBtn.onclick = () => {
    window.location.href = "level-select.html";
};
}

function showStory() {
    storyImage.src = storyPages[currentStory].img;
    storyText.style.display = "block";
    storyText.innerText = storyPages[currentStory].text;
}

if(storyScreen){
storyScreen.addEventListener("click", () => {
    storyImage.classList.add("fade-out");

    setTimeout(() => {
        currentStory++;

        if (currentStory < storyPages.length) {
            storyImage.src = storyPages[currentStory].img;

            storyImage.onload = () => {
                storyImage.classList.remove("fade-out");
                storyImage.classList.add("fade-in");

                setTimeout(() => {
                    storyImage.classList.remove("fade-in");
                }, 800);
            };

        } else {
            storyScreen.style.display = "none";
            window.location.href = "level-select.html";
        }

    }, 800);
});
}
// ─── Physics constants ───────────────────────────────────────────────────────
const GROUND_Y   = 20;   // bottom CSS value when standing on ground
const PLAYER_H   = 90;   // must match CSS height
const GRAVITY    = 0.45;
const JUMP_FORCE = 14;

let x         = 50;
let y         = GROUND_Y;     // ← start ON the ground
let velocityY = 0;
let jumping   = false;
let score     = 0;
let facingLeft = false;
let movingPlatformDir = 1;

let enemyX = 400;
let enemyDir = 1;

const platformDirs = new Map();
const crumbleTimers = {};
const crumbleFallens = {};
let gameOver = false;

// Key state for smooth movement
const keys = {};
document.addEventListener("keydown", e => { keys[e.key] = true; });
document.addEventListener("keyup",   e => {
    keys[e.key] = false;
    if (!jumping) setSprite("assets/lumi-idle.png");
});

function setSprite(src) {
    player.style.backgroundImage = `url('${src}')`;
    // flip horizontally when facing left
    player.style.transform = facingLeft ? "scaleX(-1)" : "scaleX(1)";
}

function animateRun() {
    setSprite(runFrames[currentRunFrame]);
    currentRunFrame = (currentRunFrame + 1) % runFrames.length;
}

// ─── Main game loop ──────────────────────────────────────────────────────────
function updatePlayer() {
    if (gameOver) return;
    // Horizontal movement
    if (keys["ArrowRight"]) {
        x += 4;
        facingLeft = false;
        animateRun();
    } else if (keys["ArrowLeft"]) {
        x -= 4;
        facingLeft = true;
        animateRun();
        
    }


    // Jump input
    if ((keys[" "] || keys["ArrowUp"]) && !jumping) {
        velocityY = JUMP_FORCE;
        jumping = true;
        setSprite("assets/lumi-jump.png");
    }

    // Apply gravity
    velocityY -= GRAVITY;
    y += velocityY;

    // Show fall sprite
    if (velocityY < -2 && jumping) {
        setSprite("assets/lumi-fall.png");
    }

    // ── Ground collision ─────────────────────────────────────────────────────
    // AFTER — ground collision is always active; x < 220 only for the left ground patch
const hasLava = game && game.dataset.hasLava === "true";

if (y <= GROUND_Y) {
    if (!hasLava || x < 220) {  // only snap to ground on safe ground
        y = GROUND_Y;
        velocityY = 0;
        if (jumping) {
            jumping = false;
            if (!keys["ArrowRight"] && !keys["ArrowLeft"]) {
                setSprite("assets/lumi-idle.png");
            }
        }
    }
}
if (y < -150) {
    // Only trigger in levels with lava (level 3)
    const hasLava = document.getElementById("lava");
    const lavaRect = hasLava ? hasLava.getBoundingClientRect() : null;
    if (lavaRect && lavaRect.width > 0 && lavaRect.height > 0) {
        gameOver = true;
        document.getElementById("level-failed").classList.remove("hidden");
    } else {
        // Just reset position in levels without lava
        x = 50;
        y = GROUND_Y;
        velocityY = 0;
        jumping = false;
    }
}
    // ── Platform collision ───────────────────────────────────────────────────
    // Platforms use CSS bottom/left/width — all in px
    document.querySelectorAll(".platform").forEach(platform => {
        if (platform.classList.contains("gone")) return;   // ← ADD THIS LINE
    const pLeft   = parseInt(platform.style.left)   || 0;
    const pBottom = parseInt(platform.style.bottom) || 0;
    const pWidth = platform.style.width === "100%" 
    ? window.innerWidth 
    : parseInt(platform.style.width) || window.innerWidth;
    const pTop    = pBottom + 20;

    const playerRight = x + 50;
    const playerBottom = y;

    const overlapX = playerRight > pLeft && x < pLeft + pWidth;

    if (
        overlapX &&
        playerBottom <= pTop + 5 &&
        playerBottom >= pTop - 15 &&
        velocityY <= 0
    ) {
        y = pTop;
        velocityY = 0;
        jumping = false;

        if (!keys["ArrowRight"] && !keys["ArrowLeft"]) {
            setSprite("assets/lumi-idle.png");
        }
    }
});

    // Clamp to screen edges
    x = Math.max(0, Math.min(x, window.innerWidth - 70));

    updateMovingPlatforms();   // ← move this UP here

    player.style.left   = x + "px";
    player.style.bottom = y + "px";

    checkStars();
    checkPortal();
    checkSpikes();
    updateEnemy();
    checkCrumble();
    checkLava();
    requestAnimationFrame(updatePlayer);
}

// ─── Star collection ─────────────────────────────────────────────────────────
function checkStars() {
    stars.forEach(star => {
        if (star.classList.contains("collected")) return;

        const starRect = star.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();

        const touching =
            playerRect.right > starRect.left &&
            playerRect.left < starRect.right &&
            playerRect.bottom > starRect.top &&
            playerRect.top < starRect.bottom;

        if (touching) {
            star.classList.add("collected");
            star.style.display = "none";

            score++;
            scoreText.innerText = `Stars: ${score} / 3`;

            setSprite("assets/lumi-collect.png");

            setTimeout(() => {
                if (!jumping) {
                    setSprite("assets/lumi-idle.png");
                }
            }, 300);
        }
    });
}

// ─── Portal check ────────────────────────────────────────────────────────────
function checkPortal() {
    if (gameOver) return;
    const portalRect = portal.getBoundingClientRect();
    const playerRect = player.getBoundingClientRect();

    if (score >= 3) {
        portal.classList.add("open");
    }

    const touchingPortal =
        playerRect.right > portalRect.left &&
        playerRect.left < portalRect.right &&
        playerRect.bottom > portalRect.top &&
        playerRect.top < portalRect.bottom;

    if (touchingPortal && score >= 3) {
        gameOver = true;
        document.getElementById("level-complete").classList.remove("hidden");
    }
}

document.addEventListener("click", e => {
    if (e.target.classList.contains("unlocked")) {
        const lvl = e.target.dataset.level;
        window.location.href = `level${lvl}.html`;
    }

    document.getElementById("retry-level").onclick = () => {
    location.reload();
};
});

if(game){
    updatePlayer();
}

function checkSpikes() {
    if (gameOver) return;
    const spikes = document.querySelectorAll(".spike");

    spikes.forEach(spike => {
        const spikeRect = spike.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();

        const hit =
            playerRect.right - 8 > spikeRect.left + 10 &&
            playerRect.left + 8 < spikeRect.right - 10 &&
            playerRect.bottom > spikeRect.top + 15 &&
            playerRect.top < spikeRect.bottom;

        if (hit) {
            gameOver = true;
            document.getElementById("level-failed").classList.remove("hidden");
        }
    });
}

document.getElementById("retry-level").onclick = () => {
    location.reload();
};

document.getElementById("next-level").onclick = () => {
    window.location.href = "level-select.html";
};



function updateMovingPlatforms() {
    document.querySelectorAll("[id^='moving-platform']").forEach(p => {
        if (!platformDirs.has(p.id)) platformDirs.set(p.id, 1);
        let dir = platformDirs.get(p.id);
        let left = parseInt(p.style.left);
        const speed = parseFloat(p.dataset.speed) || 0.5;
        const min = parseFloat(p.dataset.min) || 620;
        const max = parseFloat(p.dataset.max) || 950;

        left += speed * dir;

        if (left >= max) {
            left = max;        // ← clamp so it doesn't overshoot
            dir = -1;
            platformDirs.set(p.id, dir);
        } else if (left <= min) {
            left = min;        // ← clamp so it doesn't get stuck
            dir = 1;
            platformDirs.set(p.id, dir);
        }

        p.style.left = left + "px";
    });
}

function updateEnemy() {
    const enemy = document.getElementById("enemy");
    if (!enemy || enemy.style.display === "none") return;

    // Read patrol bounds from data attributes if set, else use defaults
    const minX = parseFloat(enemy.dataset.min) || 10;
    const maxX = parseFloat(enemy.dataset.max) || 160;

    enemyX += 1.8 * enemyDir;
    if (enemyX > maxX || enemyX < minX) enemyDir *= -1;
    enemy.style.left = enemyX + "px";
    enemy.style.transform = enemyDir === -1 ? "scaleX(-1)" : "scaleX(1)";

    const inX = x + 50 > enemyX && x < enemyX + 50;
    const inY = y < 20 + 60 && y + PLAYER_H > 20;
    if (inX && inY) {
        gameOver = true;
        document.getElementById("level-failed").classList.remove("hidden");
    }
}



function checkCrumble() {
    ["crumble-platform", "crumble-platform-2", "crumble-platform-3"].forEach(id => {
        const cp = document.getElementById(id);
        if (!cp || crumbleFallens[id]) return;

        const pLeft   = parseInt(cp.style.left);
        const pBottom = parseInt(cp.style.bottom);
        const pTop    = pBottom + 20;
        const pWidth  = parseInt(cp.style.width);

        const onPlatform =
            x + 50 > pLeft &&
            x < pLeft + pWidth &&
            Math.abs(y - pTop) < 8;

        if (onPlatform && !crumbleTimers[id]) {
            cp.classList.add("shaking");
            crumbleTimers[id] = setTimeout(() => {
                cp.classList.add("gone");
                crumbleFallens[id] = true;
            }, 700); // slightly faster than level 3 for more difficulty
        }
    });
}

function checkLava() {
    if (gameOver) return;
    const lava = document.getElementById("lava");
    if (!lava) return;
    
    // Only check if lava has actual size on screen
    const lavaRect = lava.getBoundingClientRect();
    if (lavaRect.width === 0 || lavaRect.height === 0) return;  // ← ADD THIS
    
    const playerRect = player.getBoundingClientRect();
    const hit =
        playerRect.right > lavaRect.left &&
        playerRect.left < lavaRect.right &&
        playerRect.bottom > lavaRect.top &&
        playerRect.top < lavaRect.bottom;
    if (hit) {
        gameOver = true;
        document.getElementById("level-failed").classList.remove("hidden");
    }
}
