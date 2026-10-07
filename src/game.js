import { Board } from './board.js';
import { Piece } from './piece.js';
import { Renderer } from './renderer.js';
import { ParticleSystem } from './particle.js';
import { SoundController } from './audio.js';
import {
    COLS,
    ROWS,
    BLOCK_SIZE,
    BLOCK_THEME,
    POINTS,
    LEVEL_SPEED,
    getLevelSpeed,
    LOCK_DELAY_MS,
    MAX_LOCK_RESETS,
    LINE_CLEAR_ANIM_MS,
    KEY,
} from './constants.js';

export class Game {
    constructor(canvas, nextCanvas, holdCanvas, onStateChange = null, onGameOver = null) {
        this.canvas = canvas;
        this.board = new Board();
        this.renderer = new Renderer(canvas, nextCanvas, holdCanvas);
        this.particles = new ParticleSystem();
        this.audio = new SoundController();

        this.onStateChange = onStateChange;
        this.onGameOver = onGameOver;
        this.onGarbageChange = null;

        // Multiplayer Battle Properties
        this.isBattleMode = false;
        this.network = null;
        this.randomSeed = null;
        this.pendingGarbage = [];

        this.highScore = parseInt(localStorage.getItem('tetris_high_score') || '0', 10);
        this.isStarted = false;
        this.reset();
    }

    setBattleMode(network, seed = null) {
        this.isBattleMode = !!network;
        this.network = network;
        this.randomSeed = seed;
        this.pendingGarbage = [];
        this.reset();
    }

    reset() {
        this.board.reset();
        this.particles.reset();

        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = 0;
        this.bag = [];
        this.pendingGarbage = [];

        this.activePiece = this.spawnPiece();
        this.nextPiece = this.spawnPiece();
        this.holdPiece = null;
        this.canHold = true;

        this.isGameOver = false;
        this.isPaused = false;

        // Line clearing animation state
        this.isClearing = false;
        this.clearTimer = 0;
        this.linesToClear = [];

        // Special clearing animation states
        this.isBombClearing = false;
        this.bombClearTimer = 0;
        this.bombAffected = null;

        this.isDrillClearing = false;
        this.drillClearTimer = 0;
        this.drillAffected = null;

        // Lock delay state
        this.isLocking = false;
        this.lockTimer = 0;
        this.lockResets = 0;

        this.dropCounter = 0;
        this.lastTime = performance.now();

        if (this.onGarbageChange) this.onGarbageChange(0);
        if (this.onStateChange) this.onStateChange(this);
        this.broadcastState();
    }

    seededRandom() {
        if (this.randomSeed === null) return Math.random();
        this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
        return this.randomSeed / 233280;
    }

    fillBag() {
        const pieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'B', 'D'];
        // Fisher-Yates shuffle with seeded or standard random
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(this.seededRandom() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        this.bag = pieces;
    }

    spawnPiece() {
        if (this.bag.length === 0) {
            this.fillBag();
        }
        const type = this.bag.pop();
        return new Piece(type, this.board);
    }

    start() {
        this.isStarted = true;
        this.lastTime = performance.now();
        if (this.requestId) cancelAnimationFrame(this.requestId);
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    startLoop() {
        this.lastTime = performance.now();
        if (this.requestId) cancelAnimationFrame(this.requestId);
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    update(time = performance.now()) {
        const dt = Math.min(100, time - this.lastTime);
        this.lastTime = time;

        if (this.isStarted && !this.isPaused && !this.isGameOver) {
            // Update particles and floating text
            this.particles.update(dt);

            if (this.isClearing) {
                this.clearTimer -= dt;
                this.board.clearAnimTime += dt;
                if (this.clearTimer <= 0) {
                    this.finishLineClear();
                }
            } else if (this.isBombClearing) {
                this.bombClearTimer -= dt;
                if (this.bombClearTimer <= 0) {
                    this.finishBombClear();
                }
            } else if (this.isDrillClearing) {
                this.drillClearTimer -= dt;
                if (this.drillClearTimer <= 0) {
                    this.finishDrillClear();
                }
            } else {
                this.handleGravity(dt);
            }
        }

        // Render current frame
        const isSpecialActive = this.isClearing || this.isBombClearing || this.isDrillClearing;
        this.renderer.draw(
            this.board,
            isSpecialActive ? null : this.activePiece,
            this.nextPiece,
            this.holdPiece,
            this.canHold,
            this.particles,
            time
        );

        if (!this.isGameOver) {
            this.requestId = requestAnimationFrame(this.update.bind(this));
        }
    }

    handleGravity(dt) {
        if (!this.activePiece) return;

        const isGrounded = !this.board.isValidMove(this.activePiece, 0, 1);

        if (isGrounded) {
            if (!this.isLocking) {
                this.isLocking = true;
                this.lockTimer = 0;
            } else {
                this.lockTimer += dt;
                if (this.lockTimer >= LOCK_DELAY_MS) {
                    this.lock();
                }
            }
        } else {
            this.isLocking = false;
            this.lockTimer = 0;

            this.dropCounter += dt;
            const speed = LEVEL_SPEED[Math.min(this.level, 10)] || 100;
            if (this.dropCounter > speed) {
                this.drop();
            }
        }
    }

    drop() {
        if (!this.activePiece) return;
        if (this.board.isValidMove(this.activePiece, 0, 1)) {
            this.activePiece.y++;
            this.dropCounter = 0;
            this.broadcastState();
        } else {
            if (!this.isLocking) {
                this.isLocking = true;
                this.lockTimer = 0;
            }
        }
    }

    softDrop() {
        if (this.isPaused || this.isGameOver || this.isClearing || !this.activePiece) return;
        if (this.board.isValidMove(this.activePiece, 0, 1)) {
            this.activePiece.y++;
            this.score += POINTS.SOFT_DROP;
            this.checkHighScore();
            this.audio.playSoftDrop();
            this.dropCounter = 0;
            if (this.onStateChange) this.onStateChange(this);
            this.broadcastState();
        }
    }

    hardDrop() {
        if (this.isPaused || this.isGameOver || this.isClearing || !this.activePiece) return;

        let dropDistance = 0;
        while (this.board.isValidMove(this.activePiece, 0, 1)) {
            this.activePiece.y++;
            dropDistance++;
        }

        this.score += dropDistance * POINTS.HARD_DROP;
        this.checkHighScore();

        this.audio.playHardDrop();
        this.renderer.triggerShake(0.35);

        const bounds = this.activePiece.getOccupiedBounds();
        const theme = BLOCK_THEME[this.activePiece.type] || { light: '#00f0ff' };
        this.particles.spawnHardDropImpact(
            bounds.minX * BLOCK_SIZE,
            bounds.maxX * BLOCK_SIZE,
            bounds.maxY * BLOCK_SIZE,
            theme.light
        );

        this.lock();
    }

    move(dir) {
        if (this.isPaused || this.isGameOver || this.isClearing || !this.activePiece) return;

        if (this.board.isValidMove(this.activePiece, dir, 0)) {
            this.activePiece.x += dir;
            this.audio.playMove();

            if (this.isLocking && this.lockResets < MAX_LOCK_RESETS) {
                this.lockTimer = 0;
                this.lockResets++;
            }
            this.broadcastState();
        }
    }

    rotate(clockwise = true) {
        if (this.isPaused || this.isGameOver || this.isClearing || !this.activePiece) return;

        if (this.activePiece.rotate(clockwise)) {
            this.audio.playRotate();

            if (this.isLocking && this.lockResets < MAX_LOCK_RESETS) {
                this.lockTimer = 0;
                this.lockResets++;
            }
            this.broadcastState();
        }
    }

    hold() {
        if (this.isPaused || this.isGameOver || this.isClearing || !this.canHold || !this.activePiece) return;

        this.audio.playHold();
        const currentType = this.activePiece.type;

        if (this.holdPiece === null) {
            this.holdPiece = new Piece(currentType, this.board);
            this.activePiece = this.nextPiece;
            this.nextPiece = this.spawnPiece();
        } else {
            const nextType = this.holdPiece.type;
            this.holdPiece = new Piece(currentType, this.board);
            this.activePiece = new Piece(nextType, this.board);
        }

        this.activePiece.resetPosition();
        this.canHold = false;
        this.isLocking = false;
        this.lockTimer = 0;
        this.lockResets = 0;
        this.dropCounter = 0;

        if (this.onStateChange) this.onStateChange(this);
        this.broadcastState();
    }

    getPendingGarbageCount() {
        return this.pendingGarbage.reduce((sum, item) => sum + item.lines, 0);
    }

    receiveGarbage(lines, holeCol) {
        this.pendingGarbage.push({ lines, holeCol });
        this.audio.playWarning();
        if (this.onGarbageChange) this.onGarbageChange(this.getPendingGarbageCount());
    }

    applyPendingGarbage() {
        if (this.pendingGarbage.length === 0) return;
        let total = 0;
        while (this.pendingGarbage.length > 0) {
            const item = this.pendingGarbage.shift();
            this.board.addGarbageLines(item.lines, item.holeCol);
            total += item.lines;
        }
        this.audio.playGarbageRise();
        this.renderer.triggerShake(Math.min(0.8, 0.25 + total * 0.12));
        if (this.onGarbageChange) this.onGarbageChange(0);
    }

    sendAttack(attackPower) {
        if (!this.isBattleMode || !this.network || attackPower <= 0) return;

        // Offset incoming pending garbage (相殺)
        if (this.pendingGarbage.length > 0) {
            let canceled = 0;
            while (attackPower > 0 && this.pendingGarbage.length > 0) {
                if (this.pendingGarbage[0].lines <= attackPower) {
                    attackPower -= this.pendingGarbage[0].lines;
                    canceled += this.pendingGarbage[0].lines;
                    this.pendingGarbage.shift();
                } else {
                    this.pendingGarbage[0].lines -= attackPower;
                    canceled += attackPower;
                    attackPower = 0;
                }
            }
            if (canceled > 0) {
                this.particles.spawnText("OFFSET!", 150, 320, '#00ff66', 22, 1100);
                if (this.onGarbageChange) this.onGarbageChange(this.getPendingGarbageCount());
            }
        }

        // Send remaining attack power to opponent
        if (attackPower > 0) {
            const holeCol = Math.floor(Math.random() * COLS);
            this.network.sendGarbage(attackPower, holeCol);
            this.particles.spawnText(`+${attackPower} ATTACK!`, 150, 260, '#ff0055', 24, 1200);
        }
    }

    lock() {
        if (!this.activePiece) return;

        const pieceType = this.activePiece.type;
        const pieceX = this.activePiece.x;
        const pieceY = this.activePiece.y;

        if (pieceType === 'B') {
            this.audio.playBomb();
            this.renderer.triggerShake(0.85);

            const affected = this.board.getBombAffectedCells(pieceX, pieceY);
            this.bombAffected = affected;
            this.board.bombClearingCells = affected.cells;

            // 1. Particle sparks & fire
            this.particles.spawnBombExplosion(pieceX, pieceY);
            // 2. 3x3 Blast area border & ruined crater cells
            this.particles.spawnBombBlastArea(affected.bounds, affected.cells, 500);
            // 3. Expanding shockwave ring
            this.particles.spawnShockwave(
                pieceX * BLOCK_SIZE + BLOCK_SIZE / 2,
                pieceY * BLOCK_SIZE + BLOCK_SIZE / 2,
                95,
                '#ff3b30',
                420
            );

            const destroyedCount = affected.cells.length;
            const countText = destroyedCount > 0 ? ` (${destroyedCount} DESTROYED)` : '';
            this.particles.spawnText(`BOMB! 💥${countText}`, 150, Math.max(45, pieceY * BLOCK_SIZE), '#ff3300', 25, 1300);

            this.isBombClearing = true;
            this.bombClearTimer = 240;
            this.activePiece = null;
            this.broadcastState();
            return;
        }

        if (pieceType === 'D') {
            this.audio.playDrill();
            this.renderer.triggerShake(0.75);

            const affected = this.board.getDrillAffectedCells(pieceX, pieceY);
            this.drillAffected = affected;
            this.board.drillClearingCells = affected.cells;

            this.particles.spawnDrillLaser(pieceX, pieceY);
            this.particles.spawnDrillBeamArea(pieceX, pieceY, affected.cells, 420);
            this.particles.spawnShockwave(
                pieceX * BLOCK_SIZE + BLOCK_SIZE / 2,
                pieceY * BLOCK_SIZE + BLOCK_SIZE / 2,
                95,
                '#00e5ff',
                380
            );

            const destroyedCount = affected.cells.length;
            const countText = destroyedCount > 0 ? ` (${destroyedCount} DESTROYED)` : '';
            this.particles.spawnText(`DRILL! ⚡${countText}`, 150, Math.max(45, pieceY * BLOCK_SIZE), '#00e5ff', 25, 1300);

            this.isDrillClearing = true;
            this.drillClearTimer = 220;
            this.activePiece = null;
            this.broadcastState();
            return;
        }

        this.board.lockPiece(this.activePiece);
        this.audio.playLock();
        this.checkFullRowsOrNextTurn(false);
    }

    finishBombClear() {
        this.isBombClearing = false;
        this.bombClearTimer = 0;
        const cells = this.bombAffected ? this.bombAffected.cells : [];
        const count = cells.length;
        this.board.removeBombCells(cells);
        this.bombAffected = null;

        if (count > 0) {
            this.score += count * 50 * this.level;
            const attackPower = Math.min(4, Math.floor(count / 3));
            if (attackPower > 0) {
                this.sendAttack(attackPower);
            }
        }

        this.checkFullRowsOrNextTurn(count > 0);
    }

    finishDrillClear() {
        this.isDrillClearing = false;
        this.drillClearTimer = 0;
        const cells = this.drillAffected ? this.drillAffected.cells : [];
        const drillX = this.drillAffected ? this.drillAffected.drillX : -1;
        const drillY = this.drillAffected ? this.drillAffected.drillY : -1;
        const count = cells.length;
        this.board.removeDrillCells(cells, drillX, drillY);
        this.drillAffected = null;

        if (count > 0) {
            this.score += count * 40 * this.level;
            const attackPower = Math.min(4, Math.floor(count / 4));
            if (attackPower > 0) {
                this.sendAttack(attackPower);
            }
        }

        this.checkFullRowsOrNextTurn(count > 0);
    }

    checkFullRowsOrNextTurn(hadSpecialCleared = false) {
        const fullRows = this.board.getFullRows();

        if (fullRows.length > 0) {
            this.isClearing = true;
            this.clearTimer = LINE_CLEAR_ANIM_MS;
            this.linesToClear = fullRows;
            this.board.clearingRows = fullRows;
            this.board.clearAnimTime = 0;

            fullRows.forEach(row => {
                this.particles.spawnLineClear(row, COLS, this.board.getRowColors(row));
            });

            this.combo++;
            this.audio.playClear(fullRows.length, this.combo);

            const centerY = fullRows[0] * BLOCK_SIZE;
            if (fullRows.length === 4) {
                this.renderer.triggerShake(0.7);
                this.particles.spawnText("TETRIS!", 150, centerY, '#00f0ff', 30, 1400);
            } else if (fullRows.length === 3) {
                this.renderer.triggerShake(0.45);
                this.particles.spawnText("TRIPLE", 150, centerY, '#ffe600', 24, 1100);
            } else if (fullRows.length === 2) {
                this.renderer.triggerShake(0.3);
                this.particles.spawnText("DOUBLE", 150, centerY, '#ff8800', 22, 1000);
            } else {
                this.particles.spawnText("SINGLE", 150, centerY, '#ffffff', 18, 900);
            }

            if (this.combo > 1) {
                this.particles.spawnText(
                    `${this.combo} COMBO!`,
                    150,
                    Math.max(20, centerY - 25),
                    '#ff0055',
                    20,
                    1200
                );
            }

            if (this.isBattleMode && this.network) {
                const attackTable = [0, 0, 1, 2, 4];
                const attackPower = (attackTable[fullRows.length] || 0) + Math.max(0, this.combo - 1);
                this.sendAttack(attackPower);
            }

            this.addScore(fullRows.length, this.combo);
            this.lines += fullRows.length;
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.particles.spawnText("LEVEL UP!", 150, 240, '#00ff66', 26, 1500);
            }
        } else {
            if (!hadSpecialCleared) {
                this.combo = 0;
            }
            this.applyPendingGarbage();
            this.nextTurn();
        }

        this.checkHighScore();
        if (this.onStateChange) this.onStateChange(this);
        this.broadcastState();
    }

    finishLineClear() {
        this.board.removeRows(this.linesToClear);
        this.isClearing = false;
        this.linesToClear = [];
        // After line clear is completed, push any remaining incoming garbage
        this.applyPendingGarbage();
        this.nextTurn();
        if (this.onStateChange) this.onStateChange(this);
        this.broadcastState();
    }

    nextTurn() {
        this.activePiece = this.nextPiece;
        this.nextPiece = this.spawnPiece();
        this.canHold = true;
        this.isLocking = false;
        this.lockTimer = 0;
        this.lockResets = 0;
        this.dropCounter = 0;

        if (!this.board.isValidMove(this.activePiece)) {
            this.triggerGameOver();
        }
    }

    addScore(lines, combo) {
        const linePoints = [0, POINTS.SINGLE, POINTS.DOUBLE, POINTS.TRIPLE, POINTS.TETRIS];
        let earned = (linePoints[lines] || 0) * this.level;
        if (combo > 1) {
            earned += (combo - 1) * POINTS.COMBO_BONUS * this.level;
        }
        this.score += earned;
    }

    checkHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('tetris_high_score', this.highScore.toString());
        }
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.audio.playGameOver();
        if (this.isBattleMode && this.network) {
            this.network.sendGameOver();
        }
        if (this.onGameOver) {
            this.onGameOver(this);
        }
        this.broadcastState();
    }

    togglePause() {
        if (this.isGameOver || this.isBattleMode) return; // Cannot pause during live battle
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.lastTime = performance.now();
        }
        if (this.onStateChange) this.onStateChange(this);
    }

    broadcastState() {
        if (!this.isBattleMode || !this.network) return;
        this.network.sendGameState({
            grid: this.board.grid,
            activePiece: this.activePiece ? {
                type: this.activePiece.type,
                x: this.activePiece.x,
                y: this.activePiece.y,
                rotation: this.activePiece.rotation,
                matrix: this.activePiece.matrix,
            } : null,
            score: this.score,
            lines: this.lines,
            holdPiece: this.holdPiece ? this.holdPiece.type : null,
            combo: this.combo,
        });
    }

    handleInput(key) {
        if (!this.isStarted) {
            if (key === KEY.ENTER) {
                this.start();
            }
            return;
        }

        if (key === KEY.PAUSE_P || key === KEY.PAUSE_P_UP || key === KEY.PAUSE_ESC) {
            this.togglePause();
            return;
        }

        if (this.isPaused) return;
        if (this.isClearing || this.isBombClearing || this.isDrillClearing) return;

        if (this.isGameOver) {
            if (!this.isBattleMode && (key === KEY.ENTER || key === KEY.SPACE)) {
                this.reset();
                this.start();
            }
            return;
        }

        switch (key) {
            case KEY.LEFT:
                this.move(-1);
                break;
            case KEY.RIGHT:
                this.move(1);
                break;
            case KEY.DOWN:
                this.softDrop();
                break;
            case KEY.UP:
                this.rotate(true);
                break;
            case KEY.SPACE:
                this.hardDrop();
                break;
            case KEY.HOLD_C:
            case KEY.HOLD_C_UP:
            case KEY.HOLD_SHIFT:
                this.hold();
                break;
            case KEY.MUTE_M:
            case KEY.MUTE_M_UP:
                this.audio.toggleMute();
                break;
        }

        if (this.onStateChange) this.onStateChange(this);
    }
}
