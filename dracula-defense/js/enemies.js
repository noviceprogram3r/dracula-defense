class Projectile {
    constructor(x, y, targetX, targetY, speed, damage, isHoly) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.speed = speed;
        this.damage = damage;
        this.isHoly = isHoly; // Holy damages core, cannot damage Dracula (he's immune!)
        this.active = true;
        this.lifeTime = 5.0; // max 5 seconds

        const angle = Math.atan2(targetY - y, targetX - x);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update(dt, engine) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.lifeTime -= dt;

        if (this.lifeTime <= 0) {
            this.active = false;
            return;
        }

        // Spawn trail
        if (Math.random() < 0.3) {
            engine.particles.push(new Particle(this.x, this.y, 0, 0, 0.2, this.isHoly ? '#ffffaa' : '#ff0000'));
        }

        // Check collision with core
        if (engine.core && MathUtils.circleIntersect(this, engine.core)) {
            engine.core.takeDamage(this.damage, engine);
            this.active = false;
            ParticleSystem.spawnHit(engine, this.x, this.y, '#ffffaa');
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.isHoly ? '#ffff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Enemy {
    constructor(x, y, hp, speed, radius) {
        this.x = x;
        this.y = y;
        this.maxHealth = hp;
        this.health = hp;
        this.baseSpeed = speed;
        this.radius = radius;
        this.active = true;
        this.slowTimer = 0;
        this.slowFactor = 0;
        this.damageAmount = 1;
        this.attackCooldown = 0;

        // Visuals
        this.color = '#fff';
    }

    applySlow(factor, duration) {
        this.slowFactor = Math.max(this.slowFactor, factor);
        this.slowTimer = duration;
    }

    takeDamage(amount, engine) {
        this.health -= amount;
        if (this.health <= 0) {
            this.active = false;
            ParticleSystem.spawnBlood(engine, this.x, this.y, this.maxHealth);
            engine.particles.push(new TextParticle(this.x, this.y, `Dead`, '#aaa'));
            window.GameApp.addScore(this.maxHealth); // Score based on base HP
            if (engine.audio) engine.audio.play('enemyDie');
        } else {
            engine.particles.push(new TextParticle(this.x, this.y - 20, `-${Math.ceil(amount)}`, '#fff'));
            if (engine.audio) engine.audio.play('enemyHit');
        }
    }

    drawHealthBar(ctx) {
        if (this.health < this.maxHealth && this.health > 0) {
            const width = 30;
            const height = 4;
            const percent = this.health / this.maxHealth;

            ctx.fillStyle = '#000';
            ctx.fillRect(this.x - width / 2, this.y - this.radius - 12, width, height);

            // If weak, blink red, else normal green
            const isWeak = percent < 0.3;
            if (isWeak && Math.floor(performance.now() / 150) % 2 === 0) {
                ctx.fillStyle = '#ff0000';
            } else if (isWeak) {
                ctx.fillStyle = '#550000';
            } else {
                ctx.fillStyle = '#00f000';
            }

            ctx.fillRect(this.x - width / 2, this.y - this.radius - 12, width * percent, height);
        }
    }

    update(dt, engine) {
        // override
    }

    draw(ctx) {
        // override
    }
}

class Minion extends Enemy {
    constructor(x, y, hpMult = 1, spdMult = 1) {
        super(x, y, 20 * hpMult, 80 * spdMult, 12);
        this.color = '#8888aa'; // Basic grey crusader
    }

    update(dt, engine) {
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.slowTimer > 0) this.slowTimer -= dt;

        let currentSpeed = this.baseSpeed;
        if (this.slowTimer > 0) currentSpeed *= (1.0 - this.slowFactor);

        if (!engine.core) return;

        // Move towards core
        const distToCore = MathUtils.distance(this, engine.core);

        if (distToCore > this.radius + engine.core.radius) {
            const angle = MathUtils.angle(this, engine.core);
            this.x += Math.cos(angle) * currentSpeed * dt;
            this.y += Math.sin(angle) * currentSpeed * dt;
        } else {
            // Attack core
            if (this.attackCooldown <= 0) {
                engine.core.takeDamage(this.damageAmount, engine);
                this.attackCooldown = 1.0;
                // Move back slightly to bounce
                const angle = MathUtils.angle(engine.core, this);
                this.x += Math.cos(angle) * 20;
                this.y += Math.sin(angle) * 20;
            }
        }
    }

    draw(ctx) {
        let opacity = this.slowTimer > 0 ? 0.7 : 1.0;
        SpriteRenderer.draw(ctx, 'minion', this.x, this.y, 0, opacity);
        this.drawHealthBar(ctx);
    }
}

class Knight extends Enemy {
    constructor(x, y, hpMult = 1, spdMult = 1) {
        super(x, y, 60 * hpMult, 90 * spdMult, 18);
        this.color = '#cccccc'; // Silver armor
        this.hasShield = true;
        this.chargeTimer = 0;
        this.chargeCooldown = 4.0;
        this.isCharging = false;
        this.chargeTarget = null;
    }

    takeDamage(amount, engine) {
        if (this.hasShield) {
            this.hasShield = false;
            engine.particles.push(new TextParticle(this.x, this.y - 20, "BLOCKED!", "#aaaaaa"));
            if (engine.audio) engine.audio.play('block'); // generic hit/block sound
            return;
        }
        super.takeDamage(amount, engine);
    }

    update(dt, engine) {
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.slowTimer > 0) this.slowTimer -= dt;
        if (this.chargeCooldown > 0) this.chargeCooldown -= dt;

        let currentSpeed = this.baseSpeed;
        if (this.slowTimer > 0) currentSpeed *= (1.0 - this.slowFactor);

        if (!engine.core) return;

        // Charge logic
        if (!this.isCharging && this.chargeCooldown <= 0 && MathUtils.distance(this, engine.core) < 300) {
            this.isCharging = true;
            this.chargeTimer = 0.5; // active charge time
            this.chargeCooldown = 5.0;
            const angle = MathUtils.angle(this, engine.core);
            this.chargeVec = { x: Math.cos(angle), y: Math.sin(angle) };
            engine.particles.push(new TextParticle(this.x, this.y - 20, "CHARGE!", "#ffaaaa"));
        }

        if (this.isCharging) {
            this.chargeTimer -= dt;
            currentSpeed = this.baseSpeed * 3.5; // very fast charge
            this.x += this.chargeVec.x * currentSpeed * dt;
            this.y += this.chargeVec.y * currentSpeed * dt;

            // spawn dust
            if (Math.random() < 0.3) engine.particles.push(new Particle(this.x, this.y, 0, 0, 0.3, '#aaa'));

            if (this.chargeTimer <= 0) {
                this.isCharging = false;
            }
        } else {
            // Normal walking
            const distToCore = MathUtils.distance(this, engine.core);
            if (distToCore > this.radius + engine.core.radius) {
                const angle = MathUtils.angle(this, engine.core);
                this.x += Math.cos(angle) * currentSpeed * dt;
                this.y += Math.sin(angle) * currentSpeed * dt;
            } else {
                if (this.attackCooldown <= 0) {
                    engine.core.takeDamage(this.damageAmount, engine);
                    this.attackCooldown = 1.5;
                }
            }
        }
    }

    draw(ctx) {
        let opacity = this.slowTimer > 0 ? 0.7 : 1.0;
        SpriteRenderer.draw(ctx, 'knight', this.x, this.y, 0, opacity);
        if (this.hasShield) {
            SpriteRenderer.draw(ctx, 'shield', this.x + 15, this.y, 0, 1.0);
        }
        this.drawHealthBar(ctx);
    }
}

class Priest extends Enemy {
    constructor(x, y, hpMult = 1, spdMult = 1) {
        super(x, y, 40 * hpMult, 70 * spdMult, 14);
        this.color = '#33cc55'; // Green robes
        this.castTimer = 3.0;
        this.summonTimer = 8.0;
        this.preferredDist = 350; // Keep distance from core
    }

    update(dt, engine) {
        if (this.slowTimer > 0) this.slowTimer -= dt;
        this.castTimer -= dt;
        this.summonTimer -= dt;

        let currentSpeed = this.baseSpeed;
        if (this.slowTimer > 0) currentSpeed *= (1.0 - this.slowFactor);

        if (!engine.core) return;

        const distToCore = MathUtils.distance(this, engine.core);

        // Movement: Try to stay exactly preferredDist away
        if (Math.abs(distToCore - this.preferredDist) > 5) {
            const angle = MathUtils.angle(this, engine.core);
            // if too far, move towards. If too close, move away
            const dir = distToCore > this.preferredDist ? 1 : -1;
            this.x += Math.cos(angle) * currentSpeed * dt * dir;
            this.y += Math.sin(angle) * currentSpeed * dt * dir;
        }

        // Cast holy beam at core
        if (this.castTimer <= 0) {
            engine.projectiles.push(new Projectile(this.x, this.y, engine.core.x, engine.core.y, 200, 1, true));
            this.castTimer = 3.0 + Math.random();
            engine.particles.push(new TextParticle(this.x, this.y - 20, "HOLY FIRE", "#ffff00"));
            if (engine.audio) engine.audio.play('shoot');
        }

        // Summon Minion
        if (this.summonTimer <= 0) {
            engine.enemies.push(new Minion(this.x + 20, this.y + 20));
            this.summonTimer = 8.0 + Math.random() * 2;
            engine.particles.push(new TextParticle(this.x, this.y - 30, "ARISE", "#00ff00"));
        }
    }

    draw(ctx) {
        let opacity = this.slowTimer > 0 ? 0.7 : 1.0;
        SpriteRenderer.draw(ctx, 'priest', this.x, this.y, 0, opacity);
        this.drawHealthBar(ctx);
    }
}
