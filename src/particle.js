import { BLOCK_SIZE } from './constants.js';

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

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
    }

    reset() {
        this.particles = [];
        this.floatingTexts = [];
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

    spawnText(text, x, y, color = '#ffe600', fontSize = 22, duration = 1100) {
        this.floatingTexts.push(new FloatingText(text, x, y, color, fontSize, duration));
    }

    update(dt) {
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
        for (let p of this.particles) {
            p.draw(ctx);
        }
        for (let ft of this.floatingTexts) {
            ft.draw(ctx);
        }
    }
}
