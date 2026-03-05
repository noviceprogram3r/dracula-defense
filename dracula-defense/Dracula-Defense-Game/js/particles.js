class Particle {
    constructor(x, y, vx, vy, lifeTime, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.lifeTime = lifeTime;
        this.maxLife = lifeTime;
        this.color = color;
        this.active = true;
    }

    update(dt) {
        this.x += this.vx * dt * 60; // scale up slightly so velocity unit is per frame conceptually
        this.y += this.vy * dt * 60;
        this.lifeTime -= dt;

        // Add minimal friction
        this.vx *= 0.95;
        this.vy *= 0.95;

        if (this.lifeTime <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        const alpha = Math.max(0, this.lifeTime / this.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 2, this.y - 2, 4, 4); // Square pixel-art retro look
        ctx.globalAlpha = 1.0;
    }
}

class TextParticle extends Particle {
    constructor(x, y, text, color, fontSize = 16) {
        super(x, y, 0, -1.5, 1.0, color);
        this.text = text;
        this.fontSize = fontSize;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.lifeTime / this.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = `${this.fontSize}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add shadow for visibility
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillText(this.text, this.x, this.y);

        // Reset properties
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.globalAlpha = 1.0;
    }
}

class BloodPool {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.lifeTime = 10.0;
        this.maxLife = 10.0;
        this.active = true;
    }

    update(dt) {
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) this.active = false;
    }

    draw(ctx) {
        let alpha = 0.6 * Math.min(1, this.lifeTime); // fade out at end
        ctx.fillStyle = `rgba(138, 3, 3, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

const ParticleSystem = {
    spawnBlood(engine, x, y, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const life = Math.random() * 0.5 + 0.2;
            engine.particles.push(new Particle(x, y, vx, vy, life, '#cc0000'));
        }
        // Small chance to spawn a lingering pool
        if (Math.random() < 0.3) {
            engine.bloodPools.push(new BloodPool(x + (Math.random() * 20 - 10), y + (Math.random() * 20 - 10), Math.random() * 15 + 10));
        }
    },

    spawnHit(engine, x, y, color = '#fff') {
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            engine.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.2, color));
        }
    },

    spawnFrost(engine, x, y, radius) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            engine.particles.push(new Particle(px, py, 0, -0.5, 0.4, '#aaddff'));
        }
    }
};
