class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;

        // Stats
        this.baseSpeed = 250; // pixels per sec
        this.baseDamageMult = 1.0;
        this.stacks = 0;
        this.maxStacks = 5;
        this.stackDecayTimer = 0;
        this.stackDecayRate = 4.0; // lose a stack every 4 seconds

        // Weapons
        this.weaponIndex = 1; // 1: Whip, 2: Claws, 3: Sword
        this.attackCooldown = 0;
        this.lastMoveDir = { x: 1, y: 0 };
        this.attackHitboxDisplay = 0;

        // UI link setup
        this.updateWeaponUI();
    }

    getDmgMult() {
        return 1.0 + (this.stacks * 0.1);
    }

    getSpeed() {
        return this.baseSpeed * (1.0 + (this.stacks * 0.1));
    }

    addStack(engine) {
        if (this.stacks < this.maxStacks) {
            this.stacks++;
            engine.particles.push(new TextParticle(this.x, this.y - 30, "+POWER", "#ff0000"));
        }
        this.stackDecayTimer = this.stackDecayRate;
        this.updateStacksUI();
    }

    healCore(amount, engine) {
        if (engine.core) {
            engine.core.heal(amount, engine);
        }
    }

    switchWeapon(index, engine) {
        if (this.weaponIndex !== index) {
            this.weaponIndex = index;
            this.updateWeaponUI();
            if (engine.audio) engine.audio.play('swap');
        }
    }

    updateWeaponUI() {
        const names = ["", "Whip", "Claws", "Sword"];
        const icons = ["", "🪢", "🐾", "🗡️"];
        const elName = document.getElementById('weapon-name');
        const elIcon = document.getElementById('weapon-icon');

        if (elName && elIcon) {
            elName.innerText = `${names[this.weaponIndex]} (${this.weaponIndex})`;
            elIcon.innerText = icons[this.weaponIndex];
        }
    }

    updateStacksUI() {
        const slots = document.querySelectorAll('.stack-slot');
        slots.forEach((s, idx) => {
            if (idx < this.stacks) s.classList.add('active');
            else s.classList.remove('active');
        });
    }

    attack(engine) {
        if (this.attackCooldown > 0) return;

        let dmgBase = 0;
        let pRange = 0;
        let cooldown = 0;
        let sound = '';
        let hitVFX = '#fff';
        let aoe = false;

        if (this.weaponIndex === 1) { // Whip
            dmgBase = 15;
            pRange = 90;
            cooldown = 0.5;
            sound = 'whip';
            hitVFX = '#ff5555';
        } else if (this.weaponIndex === 2) { // Claws
            dmgBase = 10;
            pRange = 50;
            cooldown = 0.2;
            sound = 'claw';
            hitVFX = '#fff';
        } else if (this.weaponIndex === 3) { // Sword
            dmgBase = 25;
            pRange = 110;
            cooldown = 1.0;
            sound = 'sword';
            hitVFX = '#aaddff';
            aoe = true;
        }

        const totalDmg = dmgBase * this.getDmgMult();
        this.attackCooldown = cooldown;
        this.attackHitboxDisplay = 0.15; // show attack arc for 150ms

        if (engine.audio) engine.audio.play(sound);

        // Check enemies
        engine.enemies.forEach(e => {
            let inRange = false;
            let dist = MathUtils.distance(this, e);

            if (aoe) {
                if (dist <= pRange + e.radius) inRange = true;
            } else {
                if (dist <= pRange + e.radius) {
                    // Check angle. Last move dir defines attack forwards
                    let angToEnemy = MathUtils.angle(this, e);
                    let myAng = Math.atan2(this.lastMoveDir.y, this.lastMoveDir.x);

                    // Normalize angles to compare difference
                    let diff = Math.abs(angToEnemy - myAng);
                    if (diff > Math.PI) diff = 2 * Math.PI - diff;

                    const spread = this.weaponIndex === 1 ? Math.PI / 4 : Math.PI / 3; // Whip is 90deg cone, Claws are 120deg

                    if (diff <= spread) inRange = true;
                }
            }

            if (inRange) {
                // Apply special effects based on weapon
                let actualDmg = totalDmg;

                // Execite massive lifesteal on weak enemies (<30% HP)
                const isWeak = e.health < (e.maxHealth * 0.3);
                if (isWeak) {
                    actualDmg = e.health; // Execute
                    this.addStack(engine);
                    this.healCore(0.5, engine); // Heal core on suck
                    ParticleSystem.spawnBlood(engine, e.x, e.y, 20);
                    engine.particles.push(new TextParticle(e.x, e.y - 20, "SUCKED!", "#cc0000"));
                    if (engine.audio) engine.audio.play('suck');
                } else {
                    ParticleSystem.spawnHit(engine, e.x, e.y, hitVFX);
                    if (this.weaponIndex === 1) {
                        // Whip has tiny lifesteal chance/heal
                        if (Math.random() < 0.2) this.healCore(0.1, engine);
                    } else if (this.weaponIndex === 3) {
                        // Sword slows enemies
                        e.applySlow(0.5, 2.0); // 50% slow for 2 seconds
                        ParticleSystem.spawnFrost(engine, e.x, e.y, e.radius + 10);
                    }
                }

                e.takeDamage(actualDmg, engine);
            }
        });
    }

    update(dt, engine) {
        // Cooldowns
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.attackHitboxDisplay > 0) this.attackHitboxDisplay -= dt;

        // Stack decay
        if (this.stacks > 0) {
            this.stackDecayTimer -= dt;
            if (this.stackDecayTimer <= 0) {
                this.stacks--;
                this.stackDecayTimer = this.stackDecayRate;
                this.updateStacksUI();
                engine.particles.push(new TextParticle(this.x, this.y - 30, "-POWER", "#aa5555"));
            }
        }

        // Input gathering
        const moveVec = engine.input.getMovementVector();

        if (moveVec.x !== 0 || moveVec.y !== 0) {
            this.lastMoveDir = moveVec;
        }

        const speed = this.getSpeed();
        this.x += moveVec.x * speed * dt;
        this.y += moveVec.y * speed * dt;

        // Basic bounds (keep inside arena 2000x2000 centered)
        const arenaW = 2000, arenaH = 2000;
        const cx = engine.canvas.width / 2;
        const cy = engine.canvas.height / 2;
        this.x = MathUtils.clamp(this.x, cx - arenaW / 2 + this.radius, cx + arenaW / 2 - this.radius);
        this.y = MathUtils.clamp(this.y, cy - arenaH / 2 + this.radius, cy + arenaH / 2 - this.radius);

        // Inputs for attack/weapon swap
        if (engine.input.isDown('1')) this.switchWeapon(1, engine);
        if (engine.input.isDown('2')) this.switchWeapon(2, engine);
        if (engine.input.isDown('3')) this.switchWeapon(3, engine);

        if (engine.input.isDown(' ') || engine.input.touchStates.attack) {
            this.attack(engine);
        }
    }

    draw(ctx) {
        let angle = Math.atan2(this.lastMoveDir.y, this.lastMoveDir.x);

        SpriteRenderer.draw(ctx, 'dracula', this.x, this.y);

        // Draw attack hitbox/weapon
        if (this.attackHitboxDisplay > 0) {
            let weaponKey = this.weaponIndex === 1 ? 'whip' : (this.weaponIndex === 2 ? 'claws' : 'sword');
            let dist = this.weaponIndex === 1 ? 40 : (this.weaponIndex === 2 ? 30 : 50);
            let wx = this.x + Math.cos(angle) * dist;
            let wy = this.y + Math.sin(angle) * dist;

            SpriteRenderer.draw(ctx, weaponKey, wx, wy, angle + Math.PI / 4);

            ctx.save();
            ctx.translate(this.x, this.y);

            if (this.weaponIndex === 3) {
                // Sword AoE
                ctx.fillStyle = 'rgba(170, 221, 255, 0.2)';
                ctx.beginPath();
                ctx.arc(0, 0, 110, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Cone attack
                let spread = this.weaponIndex === 1 ? Math.PI / 4 : Math.PI / 3;
                let pRange = this.weaponIndex === 1 ? 90 : 50;

                ctx.fillStyle = this.weaponIndex === 1 ? 'rgba(255, 85, 85, 0.2)' : 'rgba(255, 255, 255, 0.2)';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, pRange, angle - spread, angle + spread);
                ctx.lineTo(0, 0);
                ctx.fill();
            }

            ctx.restore();
        }
    }
}
