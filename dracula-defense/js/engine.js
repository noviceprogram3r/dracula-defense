class InputManager {
    constructor() {
        if (InputManager.instance) {
            InputManager.instance.touchStates = { attack: false, weaponSwap: false, joystick: null };
            InputManager.instance.keys = {};
            return InputManager.instance;
        }
        InputManager.instance = this;

        this.keys = {};
        this.touchStates = { attack: false, weaponSwap: false, joystick: null };

        window.addEventListener('keydown', (e) => {
            const kl = e.key.toLowerCase();
            this.keys[kl] = true;
            this.keys[e.code] = true;
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(kl)) {
                e.preventDefault();
            }
        }, { passive: false });

        window.addEventListener('keyup', (e) => {
            const kl = e.key.toLowerCase();
            this.keys[kl] = false;
            this.keys[e.code] = false;
        });

        // Touch setups
        const btnAttack = document.getElementById('btn-attack');
        const btnWeapon = document.getElementById('btn-weapon');
        const joystickZone = document.getElementById('joystick-zone');

        if (btnAttack) {
            btnAttack.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchStates.attack = true; });
            btnAttack.addEventListener('touchend', (e) => { e.preventDefault(); this.touchStates.attack = false; });
        }

        if (btnWeapon) {
            btnWeapon.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (window.GameApp && window.GameApp.engine && window.GameApp.engine.player) {
                    let idx = window.GameApp.engine.player.weaponIndex + 1;
                    if (idx > 3) idx = 1;
                    window.GameApp.engine.player.switchWeapon(idx, window.GameApp.engine);
                }
            });
        }

        if (joystickZone) {
            let activeTouchId = null;
            let centerX, centerY;
            const computeDir = (e, touch) => {
                const rect = joystickZone.getBoundingClientRect();
                centerX = rect.left + rect.width / 2;
                centerY = rect.top + rect.height / 2;
                let dx = touch.clientX - centerX;
                let dy = touch.clientY - centerY;
                // Normalize
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) { dx /= dist; dy /= dist; }
                this.touchStates.joystick = { dx, dy };
            };

            joystickZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                activeTouchId = e.changedTouches[0].identifier;
                computeDir(e, e.changedTouches[0]);
            });
            joystickZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === activeTouchId) {
                        computeDir(e, e.changedTouches[i]);
                    }
                }
            });
            joystickZone.addEventListener('touchend', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === activeTouchId) {
                        activeTouchId = null;
                        this.touchStates.joystick = null;
                    }
                }
            });
        }
    }

    isDown(key) {
        return !!this.keys[key.toLowerCase()];
    }

    isJustPressed(key) {
        // Advanced input handling if needed, currently we can just check isDown
        return this.isDown(key);
    }

    getMovementVector() {
        let dx = 0;
        let dy = 0;

        if (this.isDown('w') || this.isDown('arrowup')) dy -= 1;
        if (this.isDown('s') || this.isDown('arrowdown')) dy += 1;
        if (this.isDown('a') || this.isDown('arrowleft')) dx -= 1;
        if (this.isDown('d') || this.isDown('arrowright')) dx += 1;

        // Normalize
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        if (this.touchStates.joystick) {
            // Apply touch joystick vector
            dx = this.touchStates.joystick.dx;
            dy = this.touchStates.joystick.dy;
        }

        return { x: dx, y: dy };
    }
}

class GameEngine {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.input = new InputManager();
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.step = 1000 / 60; // 60 FPS target

        this.isRunning = false;

        // Game Entities
        this.player = null;
        this.core = null;
        this.enemies = [];
        this.particles = [];
        this.projectiles = [];
        this.bloodPools = [];

        // Systems
        this.waveManager = null;
        this.audio = null; // Will be set in main.js
        this.camera = { x: 0, y: 0, shakeTime: 0, shakeMagnitude: 0 };
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    stop() {
        this.isRunning = false;
    }

    loop(currentTime) {
        if (!this.isRunning) return;

        let deltaTime = currentTime - this.lastTime;
        if (deltaTime > 250) deltaTime = 250; // Max frame time to avoid spiral of death
        this.lastTime = currentTime;

        this.accumulator += deltaTime;

        while (this.accumulator >= this.step) {
            this.update(this.step / 1000); // pass dt in seconds
            this.accumulator -= this.step;
        }

        this.draw();

        requestAnimationFrame((time) => this.loop(time));
    }

    addShake(magnitude, duration) {
        this.camera.shakeMagnitude = magnitude;
        this.camera.shakeTime = duration;
    }

    update(dt) {
        // Update Camera Shake
        if (this.camera.shakeTime > 0) {
            this.camera.shakeTime -= dt;
        } else {
            this.camera.shakeMagnitude = 0;
        }

        if (this.player) this.player.update(dt, this);
        if (this.core) this.core.update(dt, this);
        if (this.waveManager) this.waveManager.update(dt, this);

        // Update arrays
        this.enemies = this.enemies.filter(e => {
            e.update(dt, this);
            return e.active;
        });

        this.projectiles = this.projectiles.filter(p => {
            p.update(dt, this);
            return p.active;
        });

        this.particles = this.particles.filter(p => {
            p.update(dt, this);
            return p.active;
        });

        this.bloodPools = this.bloodPools.filter(b => {
            b.update(dt, this);
            return b.active;
        });

        // Check core death
        if (this.core && this.core.health <= 0 && this.isRunning) {
            window.GameApp.triggerGameOver();
        }
    }

    draw() {
        // Clear screen
        this.ctx.fillStyle = '#111'; // Very dark background behind arena
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // Apply Camera Shake
        if (this.camera.shakeMagnitude > 0) {
            const dx = MathUtils.randomRange(-this.camera.shakeMagnitude, this.camera.shakeMagnitude);
            const dy = MathUtils.randomRange(-this.camera.shakeMagnitude, this.camera.shakeMagnitude);
            this.ctx.translate(dx, dy);
        }

        // Draw Arena Floor
        this.ctx.fillStyle = '#1a1a24'; // Floor color
        // Assuming arena is 2000x2000 centered
        this.ctx.fillRect(this.canvas.width / 2 - 1000, this.canvas.height / 2 - 1000, 2000, 2000);

        // Draw grid lines for retro feel
        this.ctx.strokeStyle = '#222';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let x = this.canvas.width / 2 - 1000; x < this.canvas.width / 2 + 1000; x += 64) {
            this.ctx.moveTo(x, this.canvas.height / 2 - 1000);
            this.ctx.lineTo(x, this.canvas.height / 2 + 1000);
        }
        for (let y = this.canvas.height / 2 - 1000; y < this.canvas.height / 2 + 1000; y += 64) {
            this.ctx.moveTo(this.canvas.width / 2 - 1000, y);
            this.ctx.lineTo(this.canvas.width / 2 + 1000, y);
        }
        this.ctx.stroke();

        this.bloodPools.forEach(b => b.draw(this.ctx));
        if (this.core) this.core.draw(this.ctx);
        this.enemies.forEach(e => e.draw(this.ctx));
        this.projectiles.forEach(p => p.draw(this.ctx));
        if (this.player) this.player.draw(this.ctx);
        this.particles.forEach(p => p.draw(this.ctx));

        this.ctx.restore();
    }
}
