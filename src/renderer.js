import { BLOCK_SIZE, COLS, ROWS, BLOCK_THEME, GHOST_COLORS } from './constants.js';

export class Renderer {
    constructor(canvas, nextCanvas, holdCanvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.nextCanvas = nextCanvas;
        this.nextCtx = nextCanvas.getContext('2d');

        this.holdCanvas = holdCanvas;
        this.holdCtx = holdCanvas ? holdCanvas.getContext('2d') : null;

        // Screen shake settings
        this.trauma = 0;
        this.maxShake = 12; // Maximum pixel displacement
        this.lastTime = performance.now();
    }

    triggerShake(amount = 0.5) {
        this.trauma = Math.min(1.0, this.trauma + amount);
    }

    draw(board, activePiece, nextPiece, holdPiece, canHold, particleSystem, time = performance.now()) {
        const dt = Math.min(50, time - this.lastTime);
        this.lastTime = time;

        // Compute screen shake
        let shakeX = 0;
        let shakeY = 0;
        if (this.trauma > 0) {
            const shakeFactor = this.trauma * this.trauma;
            shakeX = (Math.random() * 2 - 1) * this.maxShake * shakeFactor;
            shakeY = (Math.random() * 2 - 1) * this.maxShake * shakeFactor;
            this.trauma = Math.max(0, this.trauma - dt / 250);
        }

        // Draw main board
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply shake transform
        if (shakeX !== 0 || shakeY !== 0) {
            this.ctx.translate(shakeX, shakeY);
        }

        this.drawBackground(this.ctx, this.canvas.width, this.canvas.height);
        this.drawBoardBlocks(board);

        // Draw ghost and active piece if active piece exists
        if (activePiece) {
            this.drawGhostPiece(activePiece, time);
            this.drawPiece(this.ctx, activePiece);
        }

        // Draw line clear flashing animation if active
        if (board.clearingRows && board.clearingRows.length > 0) {
            this.drawClearingFlash(board.clearingRows, board.clearAnimTime);
        }

        // Draw particles and floating banners in board space
        if (particleSystem) {
            particleSystem.draw(this.ctx);
        }

        this.ctx.restore();

        // Draw sidebar previews
        this.drawNextPreview(nextPiece);
        this.drawHoldPreview(holdPiece, canHold);
    }

    drawBackground(ctx, width, height) {
        // Deep cyber dark background
        ctx.fillStyle = '#0a0c14';
        ctx.fillRect(0, 0, width, height);

        // Elegant grid lines
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * BLOCK_SIZE + 0.5, 0);
            ctx.lineTo(x * BLOCK_SIZE + 0.5, height);
            ctx.stroke();
        }

        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * BLOCK_SIZE + 0.5);
            ctx.lineTo(width, y * BLOCK_SIZE + 0.5);
            ctx.stroke();
        }
    }

    drawBoardBlocks(board) {
        board.grid.forEach((row, y) => {
            // Skip rendering rows that are currently undergoing flash animation (handled separately)
            if (board.clearingRows && board.clearingRows.includes(y)) return;

            row.forEach((type, x) => {
                if (type !== 0) {
                    this.drawJewelBlock(this.ctx, x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, type);
                }
            });
        });
    }

    drawPiece(ctx, piece, offsetX = 0, offsetY = 0, alpha = 1.0) {
        ctx.save();
        if (alpha < 1.0) {
            ctx.globalAlpha = alpha;
        }

        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    const px = (piece.x + x) * BLOCK_SIZE + offsetX;
                    const py = (piece.y + y) * BLOCK_SIZE + offsetY;
                    this.drawJewelBlock(ctx, px, py, BLOCK_SIZE, piece.type);
                }
            });
        });

        ctx.restore();
    }

    drawGhostPiece(piece, time) {
        const ghostY = piece.calculateGhostY();
        if (ghostY === piece.y) return; // Don't draw if already at ground position

        const pulse = 0.22 + 0.12 * Math.sin(time / 160);
        const theme = BLOCK_THEME[piece.type];

        this.ctx.save();
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    const px = (piece.x + x) * BLOCK_SIZE;
                    const py = (ghostY + y) * BLOCK_SIZE;
                    const s = BLOCK_SIZE;

                    // Semi-transparent fill with pulsing opacity
                    this.ctx.fillStyle = theme ? theme.glow.replace(/[\d.]+\)$/, `${pulse})`) : GHOST_COLORS[piece.type];
                    this.ctx.fillRect(px + 2, py + 2, s - 4, s - 4);

                    // High-tech outline
                    this.ctx.strokeStyle = theme ? theme.light : '#ffffff';
                    this.ctx.lineWidth = 1.5;
                    this.ctx.strokeRect(px + 1.5, py + 1.5, s - 3, s - 3);

                    // Center indicator dot
                    this.ctx.fillStyle = theme ? theme.light : '#ffffff';
                    this.ctx.fillRect(px + s / 2 - 1.5, py + s / 2 - 1.5, 3, 3);
                }
            });
        });
        this.ctx.restore();
    }

    drawJewelBlock(ctx, px, py, size, type) {
        const theme = BLOCK_THEME[type] || {
            base: '#00f0ff',
            light: '#ffffff',
            dark: '#005577',
            glow: 'rgba(0, 240, 255, 0.5)'
        };

        const b = 3.5; // Bevel depth in pixels

        // Base fill
        ctx.fillStyle = theme.base;
        ctx.fillRect(px, py, size, size);

        // Top bevel (light)
        ctx.fillStyle = theme.light;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + size, py);
        ctx.lineTo(px + size - b, py + b);
        ctx.lineTo(px + b, py + b);
        ctx.closePath();
        ctx.fill();

        // Left bevel (light)
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + b, py + b);
        ctx.lineTo(px + b, py + size - b);
        ctx.lineTo(px, py + size);
        ctx.closePath();
        ctx.fill();

        // Bottom bevel (dark)
        ctx.fillStyle = theme.dark;
        ctx.beginPath();
        ctx.moveTo(px, py + size);
        ctx.lineTo(px + size, py + size);
        ctx.lineTo(px + size - b, py + size - b);
        ctx.lineTo(px + b, py + size - b);
        ctx.closePath();
        ctx.fill();

        // Right bevel (dark)
        ctx.beginPath();
        ctx.moveTo(px + size, py);
        ctx.lineTo(px + size, py + size);
        ctx.lineTo(px + size - b, py + size - b);
        ctx.lineTo(px + size - b, py + b);
        ctx.closePath();
        ctx.fill();

        // Center jewel facet
        ctx.fillStyle = theme.base;
        ctx.fillRect(px + b, py + b, size - 2 * b, size - 2 * b);

        // Diagonal gloss shine line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(px + b + 1, py + b + 1, size - 2 * b - 2, 2);

        // Outer border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
    }

    drawClearingFlash(rows, animTime) {
        this.ctx.save();
        const flashIntensity = Math.abs(Math.sin((animTime / 180) * Math.PI * 3));
        rows.forEach(y => {
            const py = y * BLOCK_SIZE;

            // Bright flash over entire row
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + flashIntensity * 0.55})`;
            this.ctx.shadowColor = '#00f0ff';
            this.ctx.shadowBlur = 18;
            this.ctx.fillRect(0, py, this.canvas.width, BLOCK_SIZE);

            // Core white line
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, py + BLOCK_SIZE / 2 - 2, this.canvas.width, 4);
        });
        this.ctx.restore();
    }

    drawNextPreview(piece) {
        if (!this.nextCtx) return;
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        // Preview box background
        this.nextCtx.fillStyle = '#0a0c14';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        if (!piece) return;

        const size = piece.matrix.length;
        const cellSize = 22; // Scaled slightly down to fit comfortably in preview
        const offsetX = (this.nextCanvas.width - size * cellSize) / 2;
        const offsetY = (this.nextCanvas.height - size * cellSize) / 2;

        piece.matrix.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val > 0) {
                    this.drawJewelBlock(
                        this.nextCtx,
                        offsetX + x * cellSize,
                        offsetY + y * cellSize,
                        cellSize,
                        piece.type
                    );
                }
            });
        });
    }

    drawHoldPreview(holdPiece, canHold) {
        if (!this.holdCtx) return;
        this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);

        // Hold box background
        this.holdCtx.fillStyle = '#0a0c14';
        this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);

        if (!holdPiece) return;

        const size = holdPiece.matrix.length;
        const cellSize = 22;
        const offsetX = (this.holdCanvas.width - size * cellSize) / 2;
        const offsetY = (this.holdCanvas.height - size * cellSize) / 2;

        this.holdCtx.save();
        // If hold was already used in this turn, dim it to show locked state
        if (!canHold) {
            this.holdCtx.globalAlpha = 0.45;
        }

        holdPiece.matrix.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val > 0) {
                    this.drawJewelBlock(
                        this.holdCtx,
                        offsetX + x * cellSize,
                        offsetY + y * cellSize,
                        cellSize,
                        holdPiece.type
                    );
                }
            });
        });

        this.holdCtx.restore();
    }

    drawOpponent(canvas, state) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const cellSize = width / COLS;

        ctx.clearRect(0, 0, width, height);

        // Holographic dark background for opponent
        ctx.fillStyle = '#080a12';
        ctx.fillRect(0, 0, width, height);

        // Faint red/purple grid
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.06)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize + 0.5, 0);
            ctx.lineTo(x * cellSize + 0.5, height);
            ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * cellSize + 0.5);
            ctx.lineTo(width, y * cellSize + 0.5);
            ctx.stroke();
        }

        if (!state) return;

        // Draw opponent's locked blocks
        if (state.grid) {
            state.grid.forEach((row, y) => {
                row.forEach((type, x) => {
                    if (type !== 0) {
                        this.drawJewelBlock(ctx, x * cellSize, y * cellSize, cellSize, type);
                    }
                });
            });
        }

        // Draw opponent's active falling piece
        if (state.activePiece && state.activePiece.matrix) {
            const piece = state.activePiece;
            piece.matrix.forEach((row, y) => {
                row.forEach((val, x) => {
                    if (val > 0) {
                        this.drawJewelBlock(
                            ctx,
                            (piece.x + x) * cellSize,
                            (piece.y + y) * cellSize,
                            cellSize,
                            piece.type
                        );
                    }
                });
            });
        }
    }
}
