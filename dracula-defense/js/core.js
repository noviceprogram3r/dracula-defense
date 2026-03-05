class CastleCore {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 40;
        this.health = 3;
        this.maxHealth = 3;
        this.hitTimer = 0;
    }

    takeDamage(amount, engine) {
        if (this.hitTimer > 0) return; // Invincibility frames

        this.health -= amount;
        this.hitTimer = 1.0; // 1 second i-frames
        engine.addShake(12, 0.3); // Heavy shake

        // Update HUD
        const hearts = document.querySelectorAll('#core-health .heart');
        hearts.forEach((h, i) => {
            if (i >= this.health) h.classList.remove('active');
            else h.classList.add('active'); // in case of healing
        });

        // Visual text popup
        engine.particles.push(new TextParticle(this.x, this.y - 40, "CORE HIT!", "#ff0000", 20));

        // Sound
        if (engine.audio) {
            engine.audio.play('coreHit');
        }
    }

    heal(amount, engine) {
        if (this.health >= this.maxHealth) return;
        this.health = Math.min(this.health + amount, this.maxHealth);

        const hearts = document.querySelectorAll('#core-health .heart');
        hearts.forEach((h, i) => {
            if (i >= this.health) h.classList.remove('active');
            else h.classList.add('active');
        });

        engine.particles.push(new TextParticle(this.x, this.y - 40, "+CORE HEAL+", "#00ff00", 15));
    }

    update(dt, engine) {
        if (this.hitTimer > 0) {
            this.hitTimer -= dt;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw altar base
        ctx.fillStyle = '#2a2a35';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.restore();

        // Pulsating aura based on health
        const pulseSpeed = this.health === 1 ? 100 : 200; // pulse faster at low hp
        const pulse = 1 + Math.abs(Math.sin(performance.now() / pulseSpeed)) * 0.15;
        let opacity = (this.hitTimer > 0 && Math.floor(performance.now() / 100) % 2 === 0) ? 0.5 : 1.0;

        SpriteRenderer.draw(ctx, 'core', this.x, this.y, 0, opacity, pulse, pulse);
    }
}
