// ============================================================
//  FLAPPY LABUBU — "You Will Lose" Edition
//  Smart Villain AI · Coins · Mystery Effects · 3 Levels
//  Limbo aesthetics · Labubu character · Dopamine engine
// ============================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

// ====================== AUDIO ENGINE ======================
let audioCtx = null;
function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
}
function tone(freq, dur, vol, type, ramp) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (ramp) o.frequency.exponentialRampToValueAtTime(ramp, audioCtx.currentTime + dur);
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
}
function sfxFlap() { 
    tone(200, 0.1, 0.1, "sine", 100); 
    tone(300, 0.08, 0.05, "triangle", 150); 
}
function sfxScore() { 
    tone(523, 0.08, 0.08, "sine"); 
    setTimeout(() => tone(659, 0.08, 0.08, "sine"), 40); 
    setTimeout(() => tone(1046, 0.15, 0.1, "sine"), 80); 
}
function sfxDeath() { 
    // Satisfying retro crunchy shatter
    tone(150, 0.1, 0.15, "square", 50); 
    setTimeout(() => tone(100, 0.15, 0.15, "sawtooth", 30), 80);
    setTimeout(() => tone(60, 0.3, 0.2, "square", 10), 160);
}
function sfxLevelUp() { tone(440, 0.12, 0.08, "sine"); setTimeout(() => tone(554, 0.12, 0.08, "sine"), 80); setTimeout(() => tone(659, 0.12, 0.08, "sine"), 160); setTimeout(() => tone(880, 0.3, 0.10, "sine"), 240); }
function sfxCoinCollect() {
    tone(1046, 0.1, 0.08, "sine", 1500);
    setTimeout(() => tone(1318, 0.1, 0.08, "sine", 1800), 40);
    setTimeout(() => tone(1567, 0.2, 0.1, "sine"), 80);
    setTimeout(() => tone(2093, 0.3, 0.08, "triangle"), 120); // Shimmer
}
function sfxMystery() {
    for (let i = 0; i < 6; i++) setTimeout(() => tone(300 + i * 150, 0.1, 0.06, "sine", 600 + i * 100), i * 35);
}
function sfxDevilUgh() {
    tone(150, 0.2, 0.10, "sawtooth", 80);
    setTimeout(() => tone(100, 0.15, 0.08, "square", 60), 100);
}
function sfxDevilLaugh() { for (let i = 0; i < 5; i++) setTimeout(() => tone(130 - i * 12, 0.1, 0.05, "sawtooth", 90 - i * 8), i * 70); }
function sfxSizeChange() { tone(400, 0.15, 0.08, "triangle", 200); tone(600, 0.2, 0.06, "sine", 300); }

// ====================== GAME STATE ======================
let state = "START";
let score = 0, coins = 0, highScore = parseInt(localStorage.getItem("fLabubuHI") || "0");
let frames = 0, deathTimer = 0, screenShake = 0, slowMo = 1;
let currentLevel = 1, levelTransition = 0;
let globalPulse = 0, tiltAngle = 0;
// Active effects
let effectTimer = 0, effectType = ""; // "slowmo","speedup","shrink","grow"
let deathCount = parseInt(localStorage.getItem("fLabubuDeaths") || "0");

// ====================== ANTIGRAVITY MULTI-AGENT BACKEND ======================
const AntigravityAPI = {
    isProcessing: false,
    async evaluateState(s) {
        this.isProcessing = true;
        let traceLogs = [];
        
        // Network latency sim
        await this.sleep(300 + Math.random() * 400);

        // AGENT C: Referee
        let isLegit = s.score <= (performance.now() / 1000) * 1.5 + 5;
        if (!isLegit) traceLogs.push(`<span class="agent-c">[Agent C: Referee]</span> WARNING: Score delta anomaly detected. Flagging run.`);
        else traceLogs.push(`<span class="agent-c">[Agent C: Referee]</span> State validation complete. Integrity: OK.`);
        logTrace(traceLogs[traceLogs.length-1]);

        await this.sleep(300);

        // AGENT B: Director
        let trickModifier = null;
        if (s.comboSurvive >= 1 || s.frustration > 0.4) {
            traceLogs.push(`<span class="agent-b">[Agent B: Director]</span> Player proficiency exceeding thresholds. Deploying closing gap constraint & speed burst.`);
            trickModifier = { closeGap: true, speedBurst: true };
        } else if (s.score % 5 === 0 && s.score > 0) {
            traceLogs.push(`<span class="agent-b">[Agent B: Director]</span> Milestone reached. Applying minor spatial shift.`);
            trickModifier = { shift: true };
        } else {
            traceLogs.push(`<span class="agent-b">[Agent B: Director]</span> Metrics within acceptable failure ranges. Maintaining current difficulty vector.`);
        }
        logTrace(traceLogs[traceLogs.length-1]);

        await this.sleep(500 + Math.random() * 600);

        // AGENT A: Tactician
        let insult = this.generateDynamicInsult(s);
        traceLogs.push(`<span class="agent-a">[Agent A: Tactician]</span> Frustration at ${(s.frustration*100).toFixed(0)}%. Contextual response generated.`);
        logTrace(traceLogs[traceLogs.length-1]);

        this.isProcessing = false;
        
        return { valid: isLegit, modifiers: trickModifier, insult: insult };
    },
    
    sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
    
    generateDynamicInsult(s) {
        if (s.frustration > 0.7) return `You survived ${s.comboSurvive} predictions. I am rewriting the physics engine. You're dead.`;
        if (s.event === "mystery") return `A mystery coin? Let's see if this curse breaks you.`;
        if (s.score > s.avgDeath && s.avgDeath > 0) return `You passed your average of ${s.avgDeath}. Do you want a medal? You'll still fail.`;
        if (s.currentLevel === 3) return `Inferno metrics show your reaction time is deteriorating. I'll just wait.`;
        if (s.state === "DYING") return `Calculated death at ${s.score}. You are mathematically predictable.`;
        
        let pool = [
            `My telemetry indicates your heart rate is rising. Getting nervous?`,
            `The spatial arrays suggest you'll choke in exactly 3 seconds.`,
            `I've deployed a micro-stutter to the rendering thread. Enjoy.`,
            `You are literally wasting your life right now.`
        ];
        return pool[Math.floor(Math.random() * pool.length)];
    }
};

function logTrace(htmlString) {
    const logBox = document.getElementById("trace-logs");
    if (!logBox) return;
    const entry = document.createElement("div");
    entry.className = "trace-entry";
    entry.innerHTML = htmlString;
    logBox.appendChild(entry);
    if (logBox.children.length > 4) logBox.removeChild(logBox.firstChild);
}

// ====================== LEVEL CONFIG ======================
const LEVELS = {
    1: {
        name: "THE VOID", speed: 3, gap: 155, spawnInt: 95,
        obstacleMove: false, closing: 0,
        accent: [255, 255, 255], bg: "#080808", ground: "#0d0d0d",
        wGlow: "rgba(170,170,170,0.55)", wGlowS: "rgba(245,245,245,0.85)",
        dirtyChance: 0.05, tilt: 0,
    },
    2: {
        name: "PURGATORY", speed: 4.5, gap: 132, spawnInt: 72,
        obstacleMove: true, closing: 0,
        accent: [0, 220, 255], bg: "#050a0d", ground: "#0a0f12",
        wGlow: "rgba(0,210,250,0.5)", wGlowS: "rgba(0,245,255,0.9)",
        dirtyChance: 0.25, tilt: 0,
    },
    3: {
        name: "INFERNO", speed: 5.8, gap: 115, spawnInt: 58,
        obstacleMove: true, closing: 0.02,
        accent: [255, 40, 80], bg: "#0d0505", ground: "#120a0a",
        wGlow: "rgba(230,45,75,0.5)", wGlowS: "rgba(255,55,95,0.9)",
        dirtyChance: 0.40, tilt: 3, // degrees oscillation for vertigo
    }
};
function cfg() { return LEVELS[currentLevel]; }
function accentCSS(a) { let c = cfg().accent; return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

// ====================== VILLAIN AI (Backend Orchestrated) ======================
const villain = {
    quote: "", qTimer: 0, qAlpha: 0,
    eyeGlow: 0, mouthOpen: 0, mood: "smug",
    deathLog: JSON.parse(localStorage.getItem("fLabubuDeathLog") || "[]"),
    predictedScore: 0, trickPlaced: false,
    frustration: 0,
    comboSurvive: 0,
    lastApiTriggerScore: 0,

    getAvgDeath() {
        if (this.deathLog.length === 0) return 0;
        let sum = 0; for (let d of this.deathLog) sum += d;
        return Math.floor(sum / this.deathLog.length);
    },

    show(text, dur) {
        this.quote = text;
        this.qAlpha = 1;
        this.qTimer = dur || 260;
        this.mouthOpen = 1;
    },

    async requestAntigravityAnalysis(eventType) {
        if (AntigravityAPI.isProcessing) return;
        
        let payload = {
            score: score,
            currentLevel: currentLevel,
            frustration: this.frustration,
            comboSurvive: this.comboSurvive,
            avgDeath: this.getAvgDeath(),
            state: state,
            event: eventType
        };

        logTrace(`<span style="color:#aaa;">[System]</span> Dispatching payload to Antigravity Agents...`);
        let response = await AntigravityAPI.evaluateState(payload);

        if (response.insult) {
            this.show(response.insult);
            sfxDevilUgh();
        }

        // Apply dynamic tricks from Agent B
        if (response.modifiers && state === "PLAYING") {
            if (response.modifiers.closeGap || response.modifiers.speedBurst) {
                // Find next obstacle and inject the modifiers directly overriding standard spawn
                for(let ob of obs.items) {
                    if (ob.x > labubu.x + 100 && !ob.passed) {
                        ob.closing = response.modifiers.closeGap ? 0.05 : ob.closing;
                        ob.speedBurst = response.modifiers.speedBurst;
                        ob.dirty = true;
                        break;
                    }
                }
            }
        }
    },

    update(dt) {
        if (this.qTimer > 0) {
            this.qTimer -= dt;
            if (this.qTimer < 35) this.qAlpha = Math.max(0, this.qTimer / 35);
            if (this.qTimer <= 0) this.qAlpha = 0;
        }
        this.mouthOpen *= 0.94;
        this.eyeGlow = 0.3 + Math.sin(frames * 0.03) * 0.15 + this.frustration * 0.3;

        if (state !== "PLAYING") return;

        // Trigger API every 10 points or if survived prediction
        if (score > 0 && score % 10 === 0 && this.lastApiTriggerScore !== score) {
            this.lastApiTriggerScore = score;
            this.requestAntigravityAnalysis("milestone");
        }

        if (this.predictedScore > 0 && score > this.predictedScore && !this.trickPlaced) {
            this.trickPlaced = true;
            this.comboSurvive++;
            this.frustration = Math.min(1, this.frustration + 0.2);
            this.requestAntigravityAnalysis("survive");
            this.predictedScore = score + 5 + Math.floor(Math.random()*5); // Set new prediction
        }

        if (this.frustration > 0.7) this.mood = "desperate";
        else if (this.frustration > 0.4) this.mood = "angry";
        else if (this.comboSurvive > 0) this.mood = "frustrated";
        else this.mood = "smug";
    },

    logDeath() {
        this.deathLog.push(score);
        if (this.deathLog.length > 20) this.deathLog.shift();
        localStorage.setItem("fLabubuDeathLog", JSON.stringify(this.deathLog));
        deathCount++;
        localStorage.setItem("fLabubuDeaths", deathCount);
        this.frustration = Math.max(0, this.frustration - 0.1);
        this.comboSurvive = 0;
        this.requestAntigravityAnalysis("death"); // Agent processes death
    },

    shouldPlaceTrick() { return false; }, // Now handled dynamically by API overrides

    draw() {
        const cx = W / 2, cy = 40;
        ctx.save(); ctx.translate(cx, cy);

        // Devil face — changes with mood
        let moodColor = this.mood === "desperate" ? 1.0 :
                         this.mood === "angry" ? 0.8 :
                         this.mood === "frustrated" ? 0.6 : 0.4;

        // Pulsing outer ring (mood indicator)
        ctx.shadowColor = accentCSS(0.3 * moodColor);
        ctx.shadowBlur = 15 + this.frustration * 20;

        // Head shape — sharper when angry
        let headScale = 1 + this.frustration * 0.15;
        ctx.scale(headScale, headScale);
        ctx.fillStyle = accentCSS(0.06 + this.frustration * 0.04);
        ctx.strokeStyle = accentCSS(0.3 + this.eyeGlow * 0.25);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -18); ctx.lineTo(18, 0); ctx.lineTo(12, 16);
        ctx.lineTo(-12, 16); ctx.lineTo(-18, 0); ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Horns — grow with frustration
        let hornLen = 12 + this.frustration * 8;
        ctx.strokeStyle = accentCSS(0.4 + this.frustration * 0.3);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(-18, -12 - hornLen); ctx.lineTo(-8, -16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(12, -12); ctx.lineTo(18, -12 - hornLen); ctx.lineTo(8, -16); ctx.stroke();

        // Eyes — glow more when angry, shake when desperate
        let ex = this.mood === "desperate" ? (Math.random() - 0.5) * 2 : 0;
        ctx.shadowColor = accentCSS(0.9);
        ctx.shadowBlur = 12 + this.eyeGlow * 10 + this.frustration * 8;
        ctx.fillStyle = accentCSS(0.7 + this.eyeGlow * 0.3);
        ctx.beginPath(); ctx.arc(-6 + ex, -2, 2.5 + this.frustration, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6 + ex, -2, 2.5 + this.frustration, 0, Math.PI * 2); ctx.fill();

        // Mouth — wider when talking/angry
        ctx.shadowBlur = 0;
        ctx.strokeStyle = accentCSS(0.5 + this.frustration * 0.3);
        ctx.lineWidth = 1.5;
        let my = 8 + this.mouthOpen * 4;
        let mw = 7 + this.frustration * 3;
        ctx.beginPath();
        ctx.moveTo(-mw, my);
        ctx.quadraticCurveTo(-mw / 2, my + 3 + this.mouthOpen * 6, 0, my);
        ctx.quadraticCurveTo(mw / 2, my + 3 + this.mouthOpen * 6, mw, my);
        ctx.stroke();
        // Teeth when angry
        if (this.frustration > 0.3) {
            ctx.strokeStyle = accentCSS(0.3);
            ctx.lineWidth = 1;
            for (let t = -3; t <= 3; t += 2) {
                ctx.beginPath(); ctx.moveTo(t, my + 1); ctx.lineTo(t, my + 3 + this.mouthOpen * 2); ctx.stroke();
            }
        }

        ctx.restore();

        // Quote
        if (this.qAlpha > 0.01) {
            ctx.save(); ctx.globalAlpha = this.qAlpha;
            ctx.font = "10px 'Press Start 2P', monospace";
            ctx.textAlign = "center";
            let tw = ctx.measureText(this.quote).width + 28;
            let tx = cx - tw / 2, ty = cy + 28;
            // Background pill
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            roundRect(ctx, tx, ty, tw, 20, 4); ctx.fill();
            ctx.strokeStyle = accentCSS(0.35);
            ctx.lineWidth = 1;
            roundRect(ctx, tx, ty, tw, 20, 4); ctx.stroke();
            ctx.fillStyle = accentCSS(0.9);
            ctx.fillText(this.quote, cx, ty + 14);
            ctx.restore();
        }
    }
};

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ====================== PARTICLES ======================
const dust = [];
for (let i = 0; i < 45; i++) dust.push({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random() * 2, sx: 0.15 + Math.random() * 0.4, sy: -0.15 + Math.random() * 0.3, a: 0.02 + Math.random() * 0.05 });
const fx = [];
function spawnFX(x, y, n, color, spread, spd) {
    for (let i = 0; i < n; i++) fx.push({ x, y, vx: (Math.random() - 0.5) * spread * spd, vy: (Math.random() - 0.5) * spread * spd, s: 1.5 + Math.random() * 3.5, life: 1, decay: 0.012 + Math.random() * 0.018, color });
}

// ====================== BACKGROUND ======================
const GROUND_Y = H - 52;
class BGL {
    constructor(yB, hMin, hMax, wMin, wMax, n, spd) {
        this.spd = spd; this.shapes = [];
        for (let i = 0; i < n; i++) this.shapes.push({ x: Math.random() * (W + 300) - 100, w: wMin + Math.random() * (wMax - wMin), h: hMin + Math.random() * (hMax - hMin), yB, seed: Math.random() });
    }
    update(dt) { for (let s of this.shapes) { s.x -= this.spd * dt; if (s.x + s.w < -50) { s.x = W + Math.random() * 200; s.h *= (0.7 + Math.random() * 0.6); } } }
    draw(c) {
        ctx.fillStyle = c;
        for (let s of this.shapes) { ctx.beginPath(); ctx.moveTo(s.x, s.yB); for (let i = 0; i <= 6; i++) { let px = s.x + (s.w / 6) * i; let py = s.yB - s.h * (0.3 + 0.7 * Math.sin((i / 6 + s.seed) * Math.PI)); ctx.lineTo(px, py); } ctx.lineTo(s.x + s.w, s.yB); ctx.closePath(); ctx.fill(); }
    }
}
const bg1 = new BGL(GROUND_Y, 60, 160, 120, 300, 8, 0.25);
const bg2 = new BGL(GROUND_Y, 30, 100, 50, 140, 12, 0.55);
const bg3 = new BGL(GROUND_Y, 10, 40, 25, 70, 15, 0.9);

const gSegs = [];
for (let i = 0; i < W + 40; i += 3) gSegs.push({ x: i, h: 1 + Math.random() * 5 });
let gOff = 0;

function drawGround(dt) {
    let c = cfg();
    let spd = c.speed * getSpeedMult();
    if (state === "PLAYING") gOff = (gOff + spd * dt) % 3;
    ctx.fillStyle = c.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    for (let seg of gSegs) { let dx = seg.x - gOff; if (dx < -10) { seg.x += W + 40; seg.h = 1 + Math.random() * 5; } ctx.fillRect(dx, GROUND_Y - seg.h, 3, seg.h); }
    // Glow line
    ctx.shadowColor = c.wGlowS; ctx.shadowBlur = 10;
    ctx.strokeStyle = c.wGlow; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke();
    ctx.shadowBlur = 0;
}

// ====================== CAMERA ======================
const cam = { y: 0, tY: 0, update() { this.tY = (labubu.y - H * 0.42) * 0.12; this.y += (this.tY - this.y) * 0.06; } };

// ====================== LABUBU CHARACTER (Cute Ball) ======================
const labubu = {
    x: 120, y: H / 2 - 20,
    baseW: 28, baseH: 28,
    w: 28, h: 28,
    vel: 0, grav: 0.28, jumpF: -6.0,
    rot: 0, tRot: 0,
    flapGlow: 0,
    sizeScale: 1, // 1 = normal, 0.65 = shrunk, 1.4 = grown
    hitPad: 0, // 100% strict collision

    draw() {
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.rotate(this.rot);
        let sc = this.sizeScale;
        ctx.scale(sc, sc);

        let gI = 0.25 + this.flapGlow * 0.7 + Math.sin(frames * 0.08) * 0.06;
        ctx.shadowColor = `rgba(255,255,255,${gI})`;
        ctx.shadowBlur = 18 + this.flapGlow * 35;

        let oA = 0.55 + this.flapGlow * 0.45;

        // ---- Body (perfect cute ball) ----
        ctx.fillStyle = "rgba(22,22,22,1)";
        ctx.strokeStyle = `rgba(230,230,230,${oA})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // ---- Ears (bunny/cat style attached to ball) ----
        ctx.lineWidth = 2;
        // Left ear
        ctx.beginPath(); ctx.moveTo(-6, -12); ctx.quadraticCurveTo(-10, -26, -4, -24); ctx.quadraticCurveTo(-2, -22, -3, -12); ctx.fill(); ctx.stroke();
        // Right ear
        ctx.beginPath(); ctx.moveTo(6, -12); ctx.quadraticCurveTo(10, -26, 4, -24); ctx.quadraticCurveTo(2, -22, 3, -12); ctx.fill(); ctx.stroke();
        // Inner ear glow
        ctx.strokeStyle = accentCSS(0.2 + this.flapGlow * 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-5, -14); ctx.quadraticCurveTo(-7, -22, -4, -21); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, -14); ctx.quadraticCurveTo(7, -22, 4, -21); ctx.stroke();

        // ---- Eyes (BIG, cute, glowing, centered in ball) ----
        // White of eyes
        ctx.shadowColor = accentCSS(1);
        ctx.shadowBlur = 14 + this.flapGlow * 20;
        ctx.fillStyle = `rgba(245,245,245,${0.9 + this.flapGlow * 0.1})`;
        ctx.beginPath(); ctx.ellipse(-5, -2, 4.5, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(5, -2, 4.5, 5, 0, 0, Math.PI * 2); ctx.fill();
        // Pupils
        ctx.shadowBlur = 0;
        let pupOff = Math.min(1.5, this.vel * 0.15);
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.ellipse(-4, -2 + pupOff, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(6, -2 + pupOff, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
        // Sparkle reflections
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath(); ctx.arc(-5.5, -4, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4.5, -4, 1.2, 0, Math.PI * 2); ctx.fill();

        // ---- Blush marks ----
        ctx.fillStyle = accentCSS(0.08 + this.flapGlow * 0.06);
        ctx.beginPath(); ctx.ellipse(-9, 2, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(9, 2, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();

        // ---- Tiny mouth ----
        ctx.strokeStyle = `rgba(200,200,200,${0.4 + this.flapGlow * 0.2})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let mOpen = state === "DYING" ? 3 : this.flapGlow * 2;
        ctx.arc(0, 4 + mOpen * 0.5, 2.5, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.restore();
    },

    update(dt) {
        // Size management
        let targetScale = 1;
        if (effectType === "shrink") targetScale = 0.65;
        else if (effectType === "grow") targetScale = 1.45;
        this.sizeScale += (targetScale - this.sizeScale) * 0.08;
        this.w = this.baseW * this.sizeScale;
        this.h = this.baseH * this.sizeScale;

        this.vel += this.grav * dt;
        this.y += this.vel * dt;
        this.tRot = Math.max(-0.4, Math.min(0.7, this.vel * 0.04));
        this.rot += (this.tRot - this.rot) * 0.1 * dt;
        this.flapGlow *= 0.91;
        if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; triggerDeath(); }
        if (this.y <= 0) { this.y = 0; this.vel = 0; }
    },

    flap() {
        this.vel = this.jumpF;
        this.flapGlow = 1;
        spawnFX(this.x + this.w / 2, this.y + this.h, 7, accentCSS(0.6), 1.2, 3);
        sfxFlap();
    },

    hitbox() {
        let p = this.hitPad;
        return { x: this.x + p, y: this.y + p, w: this.w - p * 2, h: this.h - p * 2 };
    }
};

// ====================== COINS ======================
const coinList = [];
function spawnCoin(x, gapTop, gapBot) {
    // Keep it within the accessible gap, but random within that space
    let margin = 14; 
    let minY = gapTop + margin;
    let maxY = gapBot - margin;
    let cy = minY + Math.random() * (maxY - minY);
    let isMystery = Math.random() < 0.08; // 8% chance
    coinList.push({ x: x + 25, y: cy, r: 8, mystery: isMystery, collected: false, pulse: Math.random() * Math.PI * 2, sparkleTimer: 0 });
}

function updateCoins(dt) {
    let c = cfg(), spd = c.speed * getSpeedMult();
    let hb = labubu.hitbox();
    for (let i = coinList.length - 1; i >= 0; i--) {
        let cn = coinList[i];
        cn.x -= spd * dt;
        cn.pulse += 0.06;
        if (cn.x < -20) { coinList.splice(i, 1); continue; }
        if (cn.collected) continue;
        // Collision with labubu
        let dx = (hb.x + hb.w / 2) - cn.x, dy = (hb.y + hb.h / 2) - cn.y;
        if (Math.sqrt(dx * dx + dy * dy) < cn.r + Math.max(hb.w, hb.h) / 2) {
            cn.collected = true;
            if (cn.mystery) {
                sfxMystery();
                triggerMysteryEffect();
                villain.requestAntigravityAnalysis("mystery");
            } else {
                coins++;
                score += 2;
                sfxCoinCollect();
            }
            spawnFX(cn.x, cn.y, 12, cn.mystery ? "rgba(180,80,255,0.8)" : "rgba(255,220,50,0.8)", 1.5, 4);
        }
    }
}

function drawCoins() {
    for (let cn of coinList) {
        if (cn.collected) continue;
        let pulse = Math.sin(cn.pulse) * 0.2 + 0.8;
        if (cn.mystery) {
            // Rainbow mystery coin
            let hue = (frames * 3) % 360;
            ctx.shadowColor = `hsla(${hue},100%,60%,0.7)`;
            ctx.shadowBlur = 16;
            ctx.fillStyle = `hsla(${hue},80%,55%,0.9)`;
            ctx.strokeStyle = `hsla(${hue},100%,80%,0.8)`;
            ctx.lineWidth = 2;
            // Star shape
            ctx.beginPath();
            for (let j = 0; j < 5; j++) {
                let angle = (j * Math.PI * 2 / 5) - Math.PI / 2 + frames * 0.03;
                let ox = cn.x + Math.cos(angle) * cn.r * pulse;
                let oy = cn.y + Math.sin(angle) * cn.r * pulse;
                if (j === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
                let midAngle = angle + Math.PI / 5;
                ctx.lineTo(cn.x + Math.cos(midAngle) * cn.r * 0.4, cn.y + Math.sin(midAngle) * cn.r * 0.4);
            }
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            // ? mark
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#000";
            ctx.font = "bold 9px 'Orbitron'";
            ctx.textAlign = "center";
            ctx.fillText("?", cn.x, cn.y + 3);
        } else {
            // Golden coin
            ctx.shadowColor = "rgba(255,200,50,0.6)";
            ctx.shadowBlur = 10 * pulse;
            ctx.fillStyle = `rgba(255,210,60,${0.8 * pulse})`;
            ctx.strokeStyle = "rgba(255,240,150,0.7)";
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(cn.x, cn.y, cn.r * pulse * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // Inner ring
            ctx.strokeStyle = "rgba(200,160,30,0.5)";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cn.x, cn.y, cn.r * 0.5 * pulse, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
    ctx.textAlign = "left";
}

// ====================== MYSTERY EFFECTS ======================
function triggerMysteryEffect() {
    let effects = ["slowmo", "speedup", "shrink", "grow"];
    let weights = [0.35, 0.25, 0.25, 0.15];
    let r = Math.random(), acc = 0;
    for (let i = 0; i < effects.length; i++) {
        acc += weights[i];
        if (r < acc) { effectType = effects[i]; break; }
    }
    effectTimer = 240; // ~4 seconds
    sfxSizeChange();
    if (effectType === "shrink" || effectType === "grow") {
        villain.show(villain.q.sizeChange[Math.floor(Math.random() * villain.q.sizeChange.length)]);
    }
}

function getSpeedMult() {
    if (effectType === "slowmo") return 0.5;
    if (effectType === "speedup") return 1.6;
    return 1;
}

function updateEffects(dt) {
    if (effectTimer > 0) {
        effectTimer -= dt;
        if (effectTimer <= 0) { effectType = ""; effectTimer = 0; }
    }
}

// ====================== OBSTACLES ======================
const obs = {
    items: [], spawnT: 0,

    spawn() {
        let c = cfg();
        let minH = 55, maxH = GROUND_Y - c.gap - 55;
        let topH = minH + Math.random() * (maxH - minH);
        let moveDir = c.obstacleMove ? (Math.random() < 0.5 ? 1 : -1) : 0;
        let moveSpd = c.obstacleMove ? (0.4 + Math.random() * 0.7) : 0;
        let moveRange = c.obstacleMove ? (18 + Math.random() * 28) : 0;

        let bumpsT = [], bumpsB = [];
        for (let i = 0; i <= 8; i++) { bumpsT.push(2 + Math.random() * 5); bumpsB.push(2 + Math.random() * 5); }

        // Villain-driven dirty play relies on backend API dynamic injection now
        let speedBurst = false;
        let closing = currentLevel >= 3 ? c.closing : 0;
        let dirty = false;

        this.items.push({
            x: W + 20, topH, botY: topH + c.gap, botH: GROUND_Y - (topH + c.gap),
            origTopH: topH, origGap: c.gap,
            passed: false, bumpsT, bumpsB,
            moveDir, moveSpd, moveRange, movePhase: Math.random() * Math.PI * 2,
            dirty, dirtyDone: false, closing,
            speedBurst, speedBurstDone: false, speedBurstT: 0,
            gp: Math.random() * Math.PI * 2, width: 50,
            hasCoin: Math.random() < 0.45,
            coinSpawned: false,
        });
    },

    draw() {
        let c = cfg();
        for (let p of this.items) {
            let glow = 0.4 + Math.sin(p.gp + frames * 0.04) * 0.3;

            // Top pillar
            ctx.fillStyle = "#0d0d0d";
            ctx.fillRect(p.x, 0, p.width, p.topH);
            for (let i = 0; i < p.bumpsT.length; i++) { let by = (p.topH / p.bumpsT.length) * i, bh = p.topH / p.bumpsT.length; ctx.fillRect(p.x + p.width, by, p.bumpsT[i], bh); ctx.fillRect(p.x - p.bumpsT[i], by, p.bumpsT[i], bh); }
            // Stalactite
            ctx.beginPath(); ctx.moveTo(p.x - 8, p.topH); ctx.lineTo(p.x + p.width + 8, p.topH); ctx.lineTo(p.x + p.width + 2, p.topH + 14); ctx.lineTo(p.x + p.width / 2, p.topH + 22); ctx.lineTo(p.x - 2, p.topH + 14); ctx.closePath(); ctx.fill();
            // Glow edges
            ctx.shadowColor = c.wGlowS; ctx.shadowBlur = 14 + glow * 12;
            ctx.strokeStyle = c.wGlowS; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(p.x - 8, p.topH); ctx.lineTo(p.x + p.width / 2, p.topH + 22); ctx.lineTo(p.x + p.width + 8, p.topH); ctx.stroke();
            ctx.strokeStyle = c.wGlow; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, p.topH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p.x + p.width, 0); ctx.lineTo(p.x + p.width, p.topH); ctx.stroke();
            ctx.shadowBlur = 0;

            // Bottom pillar
            ctx.fillStyle = "#0d0d0d";
            ctx.fillRect(p.x, p.botY, p.width, p.botH);
            for (let i = 0; i < p.bumpsB.length; i++) { let by = p.botY + (p.botH / p.bumpsB.length) * i, bh = p.botH / p.bumpsB.length; ctx.fillRect(p.x + p.width, by, p.bumpsB[i], bh); ctx.fillRect(p.x - p.bumpsB[i], by, p.bumpsB[i], bh); }
            // Stalagmite
            ctx.beginPath(); ctx.moveTo(p.x - 8, p.botY); ctx.lineTo(p.x + p.width + 8, p.botY); ctx.lineTo(p.x + p.width + 2, p.botY - 14); ctx.lineTo(p.x + p.width / 2, p.botY - 22); ctx.lineTo(p.x - 2, p.botY - 14); ctx.closePath(); ctx.fill();
            // Glow
            ctx.shadowColor = c.wGlowS; ctx.shadowBlur = 14 + glow * 12;
            ctx.strokeStyle = c.wGlowS; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(p.x - 8, p.botY); ctx.lineTo(p.x + p.width / 2, p.botY - 22); ctx.lineTo(p.x + p.width + 8, p.botY); ctx.stroke();
            ctx.strokeStyle = c.wGlow; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.botY); ctx.lineTo(p.x, GROUND_Y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p.x + p.width, p.botY); ctx.lineTo(p.x + p.width, GROUND_Y); ctx.stroke();
            ctx.shadowBlur = 0;

            // Gap deco lines
            ctx.strokeStyle = accentCSS(0.04 + glow * 0.03);
            ctx.lineWidth = 0.5;
            for (let d = -2; d <= 2; d++) { ctx.beginPath(); ctx.moveTo(p.x + p.width / 2 + d * 10, p.topH + 22); ctx.lineTo(p.x + p.width / 2 + d * 10, p.botY - 22); ctx.stroke(); }
        }
    },

    update(dt) {
        let c = cfg(), spd = c.speed * getSpeedMult();
        this.spawnT += dt;
        if (this.spawnT >= c.spawnInt) { this.spawn(); this.spawnT = 0; }

        let hb = labubu.hitbox();
        for (let i = this.items.length - 1; i >= 0; i--) {
            let p = this.items[i];
            p.x -= spd * dt;

            // Spawn coin in gap
            if (p.hasCoin && !p.coinSpawned && p.x < W - 50) {
                p.coinSpawned = true;
                spawnCoin(p.x, p.topH + 22, p.botY - 22);
            }

            // Vertical movement
            if (p.moveDir !== 0) {
                p.movePhase += 0.02 * p.moveSpd * dt;
                let off = Math.sin(p.movePhase) * p.moveRange;
                p.topH = Math.max(30, Math.min(GROUND_Y - c.gap - 30, p.origTopH + off));
                p.botY = p.topH + c.gap; p.botH = GROUND_Y - p.botY;
            }

            // Closing (Level 3)
            if (p.closing > 0 && p.x < W * 0.7) {
                p.topH += p.closing * dt;
                p.botY = p.topH + Math.max(75, p.origGap - (p.topH - p.origTopH) * 2);
                p.botH = GROUND_Y - p.botY;
            }

            // Dirty tricks
            if (p.dirty && !p.dirtyDone && p.x < labubu.x + 95 && p.x > labubu.x - 10) {
                p.dirtyDone = true;
                let trick = Math.random();
                if (trick < 0.35) {
                    let shift = (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 22);
                    p.topH = Math.max(40, Math.min(GROUND_Y - c.gap - 40, p.topH + shift));
                    p.botY = p.topH + c.gap; p.botH = GROUND_Y - p.botY;
                    let q = ["Oops, wall moved. My bad.", "I rearranged things for you.", "Surprise! I own these walls.", "Too predictable. Fixed it."];
                    villain.show(q[Math.floor(Math.random() * q.length)]);
                } else if (trick < 0.6) {
                    p.topH += 14; p.botY -= 14; p.botH = GROUND_Y - p.botY;
                    let q = ["The walls are hungry.", "Tighter... perfect.", "Claustrophobic yet?"];
                    villain.show(q[Math.floor(Math.random() * q.length)]);
                } else if (trick < 0.8) {
                    p.width += 18;
                    villain.show("Wider walls. More suffering.");
                } else {
                    // Size curse!
                    if (effectType === "") {
                        effectType = Math.random() < 0.5 ? "grow" : "shrink";
                        effectTimer = 180;
                        sfxSizeChange();
                        villain.show(villain.q.sizeChange[Math.floor(Math.random() * villain.q.sizeChange.length)]);
                    }
                }
            }

            // Speed burst
            if (p.speedBurst && !p.speedBurstDone && p.x < labubu.x + 180) { p.speedBurstDone = true; p.speedBurstT = 28; }
            if (p.speedBurstT > 0) { p.x -= spd * 0.55 * dt; p.speedBurstT -= dt; }

            // ---- STRICT COLLISION ----
            const pad = 1;
            if (hb.x + hb.w > p.x + pad && hb.x < p.x + p.width - pad) {
                if (hb.y < p.topH || hb.y + hb.h > p.botY) triggerDeath();
                else {
                    let tD = hb.y - p.topH, bD = p.botY - (hb.y + hb.h);
                    if ((tD < 8 || bD < 8) && Math.random() < 0.2 && villain.qTimer <= 0)
                        villain.show(villain.q.nearMiss[Math.floor(Math.random() * villain.q.nearMiss.length)], 120);
                }
            }
            // Cap collision (stalactite/stalagmite tips)
            if (hb.x + hb.w > p.x - 8 && hb.x < p.x + p.width + 8) {
                if (hb.y < p.topH + 22 && hb.y + hb.h > p.topH) {
                    let dr = (hb.y + hb.h - p.topH) / 22;
                    let hw = (p.width / 2 + 8) * (1 - dr * 0.7), cx = p.x + p.width / 2;
                    if (hb.x + hb.w > cx - hw && hb.x < cx + hw) triggerDeath();
                }
                if (hb.y + hb.h > p.botY - 22 && hb.y < p.botY) {
                    let dr = (p.botY - hb.y) / 22;
                    let hw = (p.width / 2 + 8) * (1 - dr * 0.7), cx = p.x + p.width / 2;
                    if (hb.x + hb.w > cx - hw && hb.x < cx + hw) triggerDeath();
                }
            }

            // Score
            if (!p.passed && p.x + p.width < labubu.x) {
                p.passed = true; score++;
                sfxScore();
                spawnFX(labubu.x + labubu.w, labubu.y + labubu.h / 2, 5, accentCSS(0.5), 0.8, 2);
                checkLevelUp();
            }
            if (p.x + p.width + 20 < 0) this.items.splice(i, 1);
        }
    },

    reset() { this.items = []; this.spawnT = 0; }
};

// ====================== LEVEL TRANSITIONS ======================
function checkLevelUp() {
    let nl = score >= 100 ? 3 : score >= 50 ? 2 : 1;
    if (nl !== currentLevel) {
        currentLevel = nl;
        levelTransition = 130;
        sfxLevelUp(); sfxDevilLaugh();
        villain.show(`LEVEL ${currentLevel}: ${cfg().name}`, 300);
        // Villain frustration reset on new level — they get confident again
        villain.frustration = Math.max(0, villain.frustration - 0.2);
    }
}

// ====================== EFFECTS & FOG ======================
function drawEffects() {
    let c = cfg();
    // Top fog
    let fg = ctx.createLinearGradient(0, 0, 0, 85);
    fg.addColorStop(0, "rgba(5,5,5,0.82)"); fg.addColorStop(1, "transparent");
    ctx.fillStyle = fg; ctx.fillRect(0, 0, W, 85);
    // Vignette
    let vig = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W * 0.72);
    vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    // Light cone around labubu
    let lr = 110 + labubu.flapGlow * 40;
    let lc = ctx.createRadialGradient(labubu.x + labubu.w / 2, labubu.y + labubu.h / 2, 3, labubu.x + labubu.w / 2, labubu.y + labubu.h / 2, lr);
    lc.addColorStop(0, accentCSS(0.10 + labubu.flapGlow * 0.12));
    lc.addColorStop(1, "transparent");
    ctx.fillStyle = lc; ctx.fillRect(0, 0, W, H);
    // Level transition flash
    if (levelTransition > 0) {
        let fa = levelTransition > 110 ? (levelTransition - 110) / 20 : 0;
        if (fa > 0) { ctx.fillStyle = accentCSS(Math.min(0.5, fa)); ctx.fillRect(0, 0, W, H); }
        levelTransition--;
    }
    // Active effect indicator flash
    if (effectType) {
        let ea = 0.03 + Math.sin(frames * 0.1) * 0.02;
        if (effectType === "slowmo") ctx.fillStyle = `rgba(100,200,255,${ea})`;
        else if (effectType === "speedup") ctx.fillStyle = `rgba(255,100,50,${ea})`;
        else if (effectType === "shrink") ctx.fillStyle = `rgba(150,255,150,${ea})`;
        else ctx.fillStyle = `rgba(255,50,50,${ea})`;
        ctx.fillRect(0, 0, W, H);
    }
    // Edge geometric lines
    ctx.strokeStyle = accentCSS(0.04 + Math.sin(frames * 0.02) * 0.02);
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) { let yy = (frames * 0.5 + i * 110) % (H + 40) - 20; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(12, yy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W, yy); ctx.lineTo(W - 12, yy); ctx.stroke(); }
}

// ====================== HUD ======================
function drawHUD() {
    let c = cfg();

    // Sleek HUD background bar at the top
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, 45);
    ctx.strokeStyle = accentCSS(0.3);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 45); ctx.lineTo(W, 45); ctx.stroke();
    
    // Bottom bar for progress
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, H - 28, W, 28);
    ctx.beginPath(); ctx.moveTo(0, H - 28); ctx.lineTo(W, H - 28); ctx.stroke();

    // Score
    ctx.font = "900 32px 'Orbitron'"; ctx.textAlign = "right";
    ctx.fillStyle = accentCSS(0.9); ctx.fillText(score, W - 20, 34);
    // High score
    ctx.font = "400 10px 'Orbitron'"; ctx.fillStyle = accentCSS(0.5);
    ctx.fillText("BEST " + highScore, W - 80, 32);
    
    // Coins
    ctx.textAlign = "left";
    ctx.font = "700 14px 'Orbitron'";
    ctx.fillStyle = "rgba(255,220,80,0.9)";
    ctx.fillText("● " + coins, 20, 28);
    
    // Level + progress (bottom left)
    ctx.font = "700 10px 'Press Start 2P', monospace";
    ctx.fillStyle = accentCSS(0.7);
    ctx.fillText(`LV${currentLevel} ${c.name}`, 20, H - 10);
    
    // Progress bar
    if (currentLevel < 3) {
        let nxt = currentLevel === 1 ? 50 : 100, prev = currentLevel === 1 ? 0 : 50;
        let prog = Math.min(1, (score - prev) / (nxt - prev));
        ctx.fillStyle = accentCSS(0.15); ctx.fillRect(20, H - 24, 140, 4);
        ctx.fillStyle = accentCSS(0.8); ctx.fillRect(20, H - 24, 140 * prog, 4);
    }
    
    // Effect indicator (bottom center)
    if (effectType && effectTimer > 0) {
        let label = effectType === "slowmo" ? "⏳ SLOW" : effectType === "speedup" ? "⚡ FAST" : effectType === "shrink" ? "🔻 TINY" : "🔺 BIG";
        let blink = Math.sin(frames * 0.15) > 0 ? 1 : 0.5;
        ctx.font = "700 12px 'Orbitron'";
        ctx.fillStyle = accentCSS(0.8 * blink);
        ctx.textAlign = "center";
        ctx.fillText(label + " " + Math.ceil(effectTimer / 60) + "s", W / 2, H - 10);
    }
    
    // Death count (bottom right)
    ctx.textAlign = "right";
    ctx.font = "700 12px 'Orbitron'";
    ctx.fillStyle = "rgba(200,50,50,0.7)";
    ctx.fillText("☠ " + deathCount, W - 20, H - 10);
    ctx.textAlign = "left";
}

// ====================== SCREENS ======================
function drawStart() {
    ctx.font = "900 36px 'Orbitron'"; ctx.textAlign = "center";
    ctx.fillStyle = "rgba(200,200,200,0.5)"; ctx.fillText("FLAPPY LABUBU", W / 2, H / 2 - 45);
    ctx.font = "11px 'Press Start 2P', monospace";
    ctx.fillStyle = "rgba(160,160,160,0.3)"; ctx.fillText("you will lose", W / 2, H / 2 - 10);
    let b = Math.sin(frames * 0.06) * 0.12 + 0.22;
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = `rgba(200,200,200,${b})`; ctx.fillText("[ SPACE / TAP ]", W / 2, H / 2 + 35);
    ctx.textAlign = "left";
}

function drawGameOver() {
    ctx.font = "900 30px 'Orbitron'"; ctx.textAlign = "center";
    ctx.fillStyle = accentCSS(0.5); ctx.fillText("YOU PERISHED", W / 2, H / 2 - 35);
    ctx.font = "14px 'Orbitron'"; ctx.fillStyle = accentCSS(0.3);
    ctx.fillText(`SCORE: ${score}  ·  COINS: ${coins}`, W / 2, H / 2 - 5);
    if (score >= highScore && score > 0) { ctx.fillStyle = accentCSS(0.4); ctx.fillText("✦ NEW BEST ✦", W / 2, H / 2 + 22); }
    let b = Math.sin(frames * 0.06) * 0.1 + 0.2;
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = `rgba(200,200,200,${b})`; ctx.fillText("[ SPACE / TAP ]", W / 2, H / 2 + 60);
    ctx.textAlign = "left";
}

// ====================== DEATH ======================
function triggerDeath() {
    if (state === "DYING" || state === "GAME_OVER") return;
    state = "DYING"; deathTimer = 70; screenShake = 16; slowMo = 0.2;
    sfxDeath();
    spawnFX(labubu.x + labubu.w / 2, labubu.y + labubu.h / 2, 30, accentCSS(0.7), 1.5, 5);
    villain.logDeath();
    villain.show(villain.q.death[Math.floor(Math.random() * villain.q.death.length)]);
    sfxDevilLaugh();
}

// ====================== INPUT ======================
function handleInput(e) {
    if (e) e.preventDefault();
    ensureAudio();
    if (state === "START") {
        state = "PLAYING"; labubu.flap();
        villain.show("Initializing Antigravity Pipeline... Good luck.");
        villain.predictedScore = 5 + Math.floor(Math.random() * 5);
        villain.lastApiTriggerScore = 0;
        logTrace(`<span style="color:#0f0;">[System]</span> Game started. Engines online.`);
    } else if (state === "PLAYING") {
        labubu.flap();
    } else if (state === "GAME_OVER") {
        if (score > highScore) { highScore = score; localStorage.setItem("fLabubuHI", highScore); }
        score = 0; coins = 0; frames = 0; currentLevel = 1;
        labubu.y = H / 2 - 20; labubu.vel = 0; labubu.rot = 0; labubu.flapGlow = 0; labubu.sizeScale = 1;
        obs.reset(); coinList.length = 0; fx.length = 0;
        slowMo = 1; cam.y = 0; effectType = ""; effectTimer = 0;
        villain.frustration = 0; villain.comboSurvive = 0; villain.predictedScore = 0;
        state = "START";
    }
}
window.addEventListener("keydown", e => { if (e.code === "Space" || e.code === "ArrowUp") handleInput(e); });
canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener("touchstart", handleInput, { passive: false });

// ====================== MAIN LOOP ======================
let lastT = performance.now();
function loop(now) {
    let rawDt = (now - lastT) / 16.667; lastT = now;
    let dt = Math.min(rawDt, 3) * slowMo;
    let c = cfg();

    // Update
    if (state === "PLAYING") {
        frames++; labubu.update(dt); obs.update(dt); updateCoins(dt); updateEffects(dt);
        cam.update(); bg1.update(dt); bg2.update(dt); bg3.update(dt); villain.update(dt);
    } else if (state === "DYING") {
        frames++; deathTimer--; slowMo += (1 - slowMo) * 0.025; villain.update(dt);
        if (deathTimer <= 0) { state = "GAME_OVER"; slowMo = 1; }
    } else { frames++; villain.update(1); }

    // Particles
    for (let p of dust) { p.x -= p.sx * dt; p.y += p.sy * dt; if (p.x < -10) { p.x = W + 10; p.y = Math.random() * H; } }
    for (let i = fx.length - 1; i >= 0; i--) { let p = fx[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= p.decay; if (p.life <= 0) fx.splice(i, 1); }
    if (screenShake > 0) { screenShake *= 0.9; if (screenShake < 0.3) screenShake = 0; }

    // Level 3 tilt
    if (c.tilt > 0) { tiltAngle += (Math.sin(frames * 0.008) * c.tilt * (Math.PI / 180) - tiltAngle) * 0.03; }
    else { tiltAngle *= 0.95; }

    // ---- DRAW ----
    ctx.save();
    // Level 3 vertigo tilt
    if (Math.abs(tiltAngle) > 0.001) { ctx.translate(W / 2, H / 2); ctx.rotate(tiltAngle); ctx.translate(-W / 2, -H / 2); }
    // Camera + shake
    let cOff = -cam.y + (screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2.5 : 0);
    if (screenShake > 0) ctx.translate((Math.random() - 0.5) * screenShake * 2, cOff);
    else ctx.translate(0, cOff);

    // Sky
    let sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, c.bg); sky.addColorStop(1, c.ground);
    ctx.fillStyle = sky; ctx.fillRect(-50, -50, W + 100, H + 100);

    // BG layers
    bg1.draw("rgba(12,12,12,1)"); bg2.draw("rgba(16,16,16,1)"); bg3.draw("rgba(20,20,20,1)");

    drawGround(dt);
    obs.draw();
    drawCoins();
    labubu.draw();

    // Dust
    for (let p of dust) { ctx.fillStyle = accentCSS(p.a); ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill(); }
    // FX particles
    for (let p of fx) { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.s, p.s); }
    ctx.globalAlpha = 1;

    ctx.restore();

    // Post-effects (not affected by camera/tilt)
    drawEffects();
    drawHUD();
    villain.draw();
    if (state === "START") drawStart();
    if (state === "GAME_OVER") drawGameOver();

    requestAnimationFrame(loop);
}

labubu.y = H / 2 - 20;
requestAnimationFrame(loop);
