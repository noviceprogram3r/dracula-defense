class WaveManager {
    constructor() {
        this.currentWaveNum = 1;
        this.maxWaves = 5;
        this.waveTimer = 5.0; // 5 seconds before first wave
        this.spawnsLeft = 0;
        this.spawnTimer = 0;
        this.active = true;

        // Define wave configurations
        this.waves = [
            // Wave 1: Easy, pure Minions, low health multiplier
            {
                hpMult: 1.0, spdMult: 0.8, spawns: [
                    { type: 'minion', count: 10, interval: 2.0 },
                    { type: 'knight', count: 2, interval: 5.0 }
                ]
            },
            // Wave 2: Introduce Priests
            {
                hpMult: 1.2, spdMult: 0.9, spawns: [
                    { type: 'minion', count: 15, interval: 1.5 },
                    { type: 'priest', count: 3, interval: 6.0 },
                    { type: 'knight', count: 3, interval: 7.0 }
                ]
            },
            // Wave 3: Ramp up Knights
            {
                hpMult: 1.5, spdMult: 1.0, spawns: [
                    { type: 'knight', count: 8, interval: 3.0 },
                    { type: 'priest', count: 5, interval: 5.0 },
                    { type: 'minion', count: 20, interval: 1.0 }
                ]
            },
            // Wave 4: Swarm
            {
                hpMult: 1.8, spdMult: 1.1, spawns: [
                    { type: 'minion', count: 40, interval: 0.5 },
                    { type: 'knight', count: 10, interval: 2.0 },
                    { type: 'priest', count: 8, interval: 4.0 }
                ]
            },
            // Wave 5: Final Assault
            {
                hpMult: 2.5, spdMult: 1.25, spawns: [
                    { type: 'minion', count: 30, interval: 0.8 },
                    { type: 'knight', count: 20, interval: 1.5 },
                    { type: 'priest', count: 15, interval: 3.0 }
                ]
            }
        ];

        this.spawnQueue = [];
    }

    startWave(num) {
        this.currentWaveNum = num;
        window.GameApp.setWave(num);

        const config = this.waves[num - 1];
        if (!config) {
            window.GameApp.triggerVictory();
            this.active = false;
            return;
        }

        // Build spawn queue
        this.spawnQueue = [];
        config.spawns.forEach(group => {
            for (let i = 0; i < group.count; i++) {
                this.spawnQueue.push({
                    type: group.type,
                    time: i * group.interval + Math.random() * 2 // slight randomness
                });
            }
        });

        // Sort queue by time
        this.spawnQueue.sort((a, b) => a.time - b.time);

        this.waveTimer = 0; // Tracks elapsed time in current wave
        this.spawnsLeft = this.spawnQueue.length;
    }

    update(dt, engine) {
        if (!this.active) return;

        if (this.currentWaveNum === 1 && this.waveTimer === 5.0 && this.spawnsLeft === 0) {
            // Very first wave initial delay handled implicitly by starting it
            this.startWave(1);
        }

        if (this.spawnsLeft > 0) {
            this.waveTimer += dt;

            // Output enemies whose time has come
            while (this.spawnQueue.length > 0 && this.spawnQueue[0].time <= this.waveTimer) {
                const spawnInfo = this.spawnQueue.shift();
                this.spawnEnemy(spawnInfo.type, engine);
                this.spawnsLeft--;
            }
        } else {
            // Check if wave complete
            if (engine.enemies.length === 0) {
                // Wave cleared!
                this.currentWaveNum++;
                if (this.currentWaveNum > this.maxWaves) {
                    window.GameApp.triggerVictory();
                    this.active = false;
                } else {
                    engine.particles.push(new TextParticle(engine.canvas.width / 2, engine.canvas.height / 2, `WAVE ${this.currentWaveNum} INCOMING!`, "#ffd700", 30));
                    this.startWave(this.currentWaveNum);
                }
            }
        }
    }

    spawnEnemy(type, engine) {
        const config = this.waves[this.currentWaveNum - 1];

        // Calculate spawn point along edges of arena (2000x2000 centered)
        const cx = engine.canvas.width / 2;
        const cy = engine.canvas.height / 2;

        let sx, sy;
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { // Top
            sx = cx + (Math.random() * 2000 - 1000);
            sy = cy - 1000;
        } else if (edge === 1) { // Bottom
            sx = cx + (Math.random() * 2000 - 1000);
            sy = cy + 1000;
        } else if (edge === 2) { // Left
            sx = cx - 1000;
            sy = cy + (Math.random() * 2000 - 1000);
        } else { // Right
            sx = cx + 1000;
            sy = cy + (Math.random() * 2000 - 1000);
        }

        let enemy;
        if (type === 'knight') {
            enemy = new Knight(sx, sy, config.hpMult, config.spdMult);
        } else if (type === 'priest') {
            enemy = new Priest(sx, sy, config.hpMult, config.spdMult);
        } else {
            enemy = new Minion(sx, sy, config.hpMult, config.spdMult);
        }

        engine.enemies.push(enemy);
    }
}
