import { BLOCK_SIZE, COLS, ROWS } from './constants.js';

class Particle {
    constructor(x, y, vx, vy, color, size, life, gravity = 0.15, friction = 0.98) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.originalSize = size;
        this.life = life;
        this.maxLife = life;
        this.gravity = gravity;
        this.friction = friction;
    }

    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.life -= dt;
        this.size = Math.max(0, this.originalSize * (this.life / this.maxLife));
    }

    draw(ctx) {
        if (this.life <= 0 || this.size <= 0) return;
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class FloatingText {
    constructor(text, x, y, color = '#ffffff', fontSize = 20, duration = 1000) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.fontSize = fontSize;
        this.life = duration;
        this.maxLife = duration;
        this.vy = -0.6; // Moves slowly upwards
    }

    update(dt) {
        this.y += this.vy * (dt / 16);
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const progress = 1 - (this.life / this.maxLife);
        const alpha = Math.sin((1 - progress) * Math.PI * 0.5);
        // Pop-in scale effect early on
        const scale = progress < 0.2 ? 0.8 + (progress / 0.2) * 0.35 : 1.15 - (progress - 0.2) * 0.18;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.font = `900 ${this.fontSize}px 'Segoe UI', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.text, 0, 0);

        ctx.lineWidth = 2;
        ctx.strokeStyle = this.color;
        ctx.strokeText(this.text, 0, 0);
        ctx.restore();
    }
}

class ShockwaveRing {
    constructor(cx, cy, maxRadius = 90, color = '#ff3b30', duration = 400) {
        this.cx = cx;
        this.cy = cy;
        this.maxRadius = maxRadius;
        this.color = color;
        this.duration = duration;
        this.life = duration;
    }

    update(dt) {
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const progress = 1 - (this.life / this.duration);
        const radius = this.maxRadius * Math.sin(progress * Math.PI * 0.5);
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(1, 4.5 * (1 - progress));
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 16;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

class BombBlastArea {
    constructor(bounds, cells, duration = 480) {
        this.bounds = bounds;
        this.cells = cells;
        this.duration = duration;
        this.life = duration;
    }

    update(dt) {
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const progress = 1 - (this.life / this.duration);
        const alpha = Math.max(0, Math.sin((1 - progress) * Math.PI * 0.5));

        const bx = this.bounds.minX * BLOCK_SIZE;
        const by = this.bounds.minY * BLOCK_SIZE;
        const bw = (this.bounds.maxX - this.bounds.minX + 1) * BLOCK_SIZE;
        const bh = (this.bounds.maxY - this.bounds.minY + 1) * BLOCK_SIZE;

        ctx.save();

        // 1. Semi-transparent warning blast zone fill
        ctx.fillStyle = `rgba(255, 42, 42, ${alpha * 0.28})`;
        ctx.fillRect(bx, by, bw, bh);

        // 2. Neon Red warning outline
        ctx.strokeStyle = '#ff3b30';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ff3b30';
        ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);

        // Cyber corner brackets (gold/yellow)
        const cornerLen = 14;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#ffe600';
        ctx.shadowColor = '#ffe600';
        // Top-left
        ctx.beginPath();
        ctx.moveTo(bx, by + cornerLen);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + cornerLen, by);
        // Top-right
        ctx.moveTo(bx + bw - cornerLen, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + cornerLen);
        // Bottom-left
        ctx.moveTo(bx, by + bh - cornerLen);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx + cornerLen, by + bh);
        // Bottom-right
        ctx.moveTo(bx + bw - cornerLen, by + bh);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw, by + bh - cornerLen);
        ctx.stroke();

        // 3. Highlight each destroyed cell with a crater / blast mark
        this.cells.forEach(({ x, y }) => {
            const px = x * BLOCK_SIZE;
            const py = y * BLOCK_SIZE;

            ctx.fillStyle = `rgba(255, 136, 0, ${alpha * 0.45})`;
            ctx.fillRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);

            // Blast cross "✖" marker
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha * 0.95;
            ctx.beginPath();
            ctx.moveTo(px + 7, py + 7);
            ctx.lineTo(px + BLOCK_SIZE - 7, py + BLOCK_SIZE - 7);
            ctx.moveTo(px + BLOCK_SIZE - 7, py + 7);
            ctx.lineTo(px + 7, py + BLOCK_SIZE - 7);
            ctx.stroke();
        });

        // 4. Center label: "3x3 BLAST"
        if (progress < 0.75) {
            const cx = bx + bw / 2;
            const cy = by + bh / 2;
            ctx.font = "900 13px 'Orbitron', monospace, sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff3b30';
            ctx.fillText("3x3 BLAST", cx, cy);
        }

        ctx.restore();
    }
}

class DrillBeamArea {
    constructor(drillX, drillY, cells, duration = 400) {
        this.drillX = drillX;
        this.drillY = drillY;
        this.cells = cells;
        this.duration = duration;
        this.life = duration;
    }

    update(dt) {
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const progress = 1 - (this.life / this.duration);
        const alpha = Math.max(0, Math.sin((1 - progress) * Math.PI * 0.5));

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#00e5ff';

        // Column beam
        const colX = this.drillX * BLOCK_SIZE;
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.28})`;
        ctx.fillRect(colX, 0, BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(colX + 1, 0, BLOCK_SIZE - 2, ROWS * BLOCK_SIZE);

        // Row beam
        const rowY = this.drillY * BLOCK_SIZE;
        ctx.fillRect(0, rowY, COLS * BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeRect(0, rowY + 1, COLS * BLOCK_SIZE, BLOCK_SIZE - 2);

        // Core white line
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(colX + BLOCK_SIZE / 2 - 1.5, 0, 3, ROWS * BLOCK_SIZE);
        ctx.fillRect(0, rowY + BLOCK_SIZE / 2 - 1.5, COLS * BLOCK_SIZE, 3);

        ctx.restore();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
        this.blastAreas = [];
        this.shockwaves = [];
    }

    reset() {
        this.particles = [];
        this.floatingTexts = [];
        this.blastAreas = [];
        this.shockwaves = [];
    }

    spawnLineClear(row, cols, colors) {
        const y = row * BLOCK_SIZE + BLOCK_SIZE / 2;
        for (let col = 0; col < cols; col++) {
            const x = col * BLOCK_SIZE + BLOCK_SIZE / 2;
            const color = colors[col] || '#00f0ff';
            const count = 5 + Math.floor(Math.random() * 4);
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 5;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed - 1.5;
                const size = 2 + Math.random() * 3.5;
                const life = 350 + Math.random() * 350;
                this.particles.push(new Particle(x, y, vx, vy, color, size, life, 0.12, 0.95));
            }
        }
    }

    spawnHardDropImpact(minX, maxX, y, color = '#00f0ff') {
        const count = 16;
        for (let i = 0; i < count; i++) {
            const x = minX + Math.random() * (maxX - minX);
            const vx = (Math.random() - 0.5) * 6;
            const vy = -Math.random() * 4.5;
            const size = 2 + Math.random() * 3;
            const life = 250 + Math.random() * 200;
            this.particles.push(new Particle(x, y, vx, vy, color, size, life, 0.18, 0.93));
        }
    }

    spawnBombExplosion(centerX, centerY) {
        const cx = centerX * BLOCK_SIZE + BLOCK_SIZE / 2;
        const cy = centerY * BLOCK_SIZE + BLOCK_SIZE / 2;
        const colors = ['#ff0055', '#ff4400', '#ffcc00', '#ffffff'];
        const count = 48;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2.5 + Math.random() * 9;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 1.2;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 3 + Math.random() * 5;
            const life = 450 + Math.random() * 350;
            this.particles.push(new Particle(cx, cy, vx, vy, color, size, life, 0.1, 0.94));
        }
    }

    spawnDrillLaser(drillX, drillY) {
        const cx = drillX * BLOCK_SIZE + BLOCK_SIZE / 2;
        const cy = drillY * BLOCK_SIZE + BLOCK_SIZE / 2;
        const colors = ['#00e5ff', '#ffffff', '#7df9ff', '#0099ff'];

        // Horizontal laser sparks along the row
        for (let x = 0; x < COLS; x++) {
            const px = x * BLOCK_SIZE + BLOCK_SIZE / 2;
            for (let i = 0; i < 4; i++) {
                const vy = (Math.random() - 0.5) * 6;
                const vx = (Math.random() - 0.5) * 4;
                const color = colors[Math.floor(Math.random() * colors.length)];
                this.particles.push(new Particle(px, cy, vx, vy, color, 2.5 + Math.random() * 3, 300 + Math.random() * 250, 0.04, 0.95));
            }
        }

        // Vertical laser sparks along the column
        for (let y = 0; y < ROWS; y++) {
            const py = y * BLOCK_SIZE + BLOCK_SIZE / 2;
            for (let i = 0; i < 4; i++) {
                const vx = (Math.random() - 0.5) * 6;
                const vy = (Math.random() - 0.5) * 4;
                const color = colors[Math.floor(Math.random() * colors.length)];
                this.particles.push(new Particle(cx, py, vx, vy, color, 2.5 + Math.random() * 3, 300 + Math.random() * 250, 0.04, 0.95));
            }
        }
    }

    spawnBombBlastArea(bounds, cells, duration = 480) {
        this.blastAreas.push(new BombBlastArea(bounds, cells, duration));
    }

    spawnShockwave(cx, cy, maxRadius = 90, color = '#ff3b30', duration = 400) {
        this.shockwaves.push(new ShockwaveRing(cx, cy, maxRadius, color, duration));
    }

    spawnDrillBeamArea(drillX, drillY, cells, duration = 400) {
        this.blastAreas.push(new DrillBeamArea(drillX, drillY, cells, duration));
    }

    spawnText(text, x, y, color = '#ffe600', fontSize = 22, duration = 1100) {
        this.floatingTexts.push(new FloatingText(text, x, y, color, fontSize, duration));
    }

    update(dt) {
        for (let i = this.blastAreas.length - 1; i >= 0; i--) {
            this.blastAreas[i].update(dt);
            if (this.blastAreas[i].life <= 0) {
                this.blastAreas.splice(i, 1);
            }
        }

        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            this.shockwaves[i].update(dt);
            if (this.shockwaves[i].life <= 0) {
                this.shockwaves.splice(i, 1);
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            this.floatingTexts[i].update(dt);
            if (this.floatingTexts[i].life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // 1. Blast areas underneath
        for (let b of this.blastAreas) {
            b.draw(ctx);
        }

        // 2. Shockwaves
        for (let sw of this.shockwaves) {
            sw.draw(ctx);
        }

        // 3. Particles
        for (let p of this.particles) {
            p.draw(ctx);
        }

        // 4. Floating texts on top
        for (let ft of this.floatingTexts) {
            ft.draw(ctx);
        }
    }
}
