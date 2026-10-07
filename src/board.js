import { COLS, ROWS, COLORS } from './constants.js';

export function parseCell(cell) {
    if (!cell || cell === 0) return { type: 0, special: null };
    if (typeof cell === 'string' && cell.includes(':')) {
        const [type, special] = cell.split(':');
        return { type, special };
    }
    return { type: cell, special: null };
}

export class Board {
    constructor() {
        this.grid = this.getEmptyGrid();
        this.clearingRows = [];
        this.clearAnimTime = 0;
        this.bombClearingCells = [];
        this.drillClearingCells = [];
    }

    getEmptyGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    reset() {
        this.grid = this.getEmptyGrid();
        this.clearingRows = [];
        this.clearAnimTime = 0;
        this.bombClearingCells = [];
        this.drillClearingCells = [];
    }

    isValidMove(piece, dx = 0, dy = 0, matrix = piece.matrix) {
        return matrix.every((row, y) => {
            return row.every((value, x) => {
                let nextX = piece.x + x + dx;
                let nextY = piece.y + y + dy;
                return (
                    value === 0 ||
                    (nextX >= 0 &&
                        nextX < COLS &&
                        nextY < ROWS &&
                        (nextY < 0 || this.grid[nextY][nextX] === 0))
                );
            });
        });
    }

    lockPiece(piece) {
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    let nextX = piece.x + x;
                    let nextY = piece.y + y;
                    if (nextY >= 0 && nextY < ROWS && nextX >= 0 && nextX < COLS) {
                        const cellVal = (typeof value === 'string' && value !== '1')
                            ? `${piece.type}:${value}`
                            : piece.type;
                        this.grid[nextY][nextX] = cellVal;
                    }
                }
            });
        });
    }

    getFullRows() {
        const fullRows = [];
        for (let y = 0; y < ROWS; y++) {
            if (this.grid[y].every(cell => cell !== 0)) {
                fullRows.push(y);
            }
        }
        return fullRows;
    }

    getRowColors(row) {
        return this.grid[row].map(cell => {
            const { type } = parseCell(cell);
            return COLORS[type] || '#00f0ff';
        });
    }

    removeRows(rowsToRemove) {
        if (!rowsToRemove || rowsToRemove.length === 0) return 0;
        const rowsSet = new Set(rowsToRemove);
        const newGrid = [];
        let count = 0;

        for (let y = 0; y < ROWS; y++) {
            if (rowsSet.has(y)) {
                count++;
            } else {
                newGrid.push(this.grid[y]);
            }
        }

        while (newGrid.length < ROWS) {
            newGrid.unshift(Array(COLS).fill(0));
        }

        this.grid = newGrid;
        this.clearingRows = [];
        this.clearAnimTime = 0;
        return count;
    }

    clearLines() {
        const fullRows = this.getFullRows();
        return this.removeRows(fullRows);
    }

    addGarbageLines(count, holeCol = Math.floor(Math.random() * COLS)) {
        if (count <= 0) return;
        const actualCount = Math.min(count, ROWS);
        
        // Remove top actualCount rows
        this.grid.splice(0, actualCount);

        // Add actualCount garbage rows at bottom
        for (let i = 0; i < actualCount; i++) {
            const row = Array(COLS).fill('G');
            row[holeCol] = 0;
            this.grid.push(row);
        }
    }

    applyGravity() {
        for (let x = 0; x < COLS; x++) {
            let emptyRow = ROWS - 1;
            for (let y = ROWS - 1; y >= 0; y--) {
                if (this.grid[y][x] !== 0) {
                    if (emptyRow !== y) {
                        this.grid[emptyRow][x] = this.grid[y][x];
                        this.grid[y][x] = 0;
                    }
                    emptyRow--;
                }
            }
        }
    }

    getBombAffectedCells(centerX, centerY) {
        const cells = [];
        const minX = Math.max(0, centerX - 1);
        const maxX = Math.min(COLS - 1, centerX + 1);
        const minY = Math.max(0, centerY - 1);
        const maxY = Math.min(ROWS - 1, centerY + 1);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (this.grid[y][x] !== 0) {
                    cells.push({ x, y, type: this.grid[y][x] });
                }
            }
        }

        return {
            cells,
            bounds: { minX, maxX, minY, maxY, centerX, centerY }
        };
    }

    removeBombCells(cells) {
        cells.forEach(({ x, y }) => {
            if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
                this.grid[y][x] = 0;
            }
        });
        this.bombClearingCells = [];
        // Do NOT apply cascade gravity: preserve player holes and avoid auto-filling mistakes
        return cells.length;
    }

    applyBomb(centerX, centerY) {
        const { cells } = this.getBombAffectedCells(centerX, centerY);
        this.removeBombCells(cells);
        return cells;
    }

    getDrillAffectedCells(drillX, drillY) {
        const cells = [];
        // Column
        if (drillX >= 0 && drillX < COLS) {
            for (let y = 0; y < ROWS; y++) {
                if (this.grid[y][drillX] !== 0) {
                    cells.push({ x: drillX, y, type: this.grid[y][drillX] });
                }
            }
        }
        // Row
        if (drillY >= 0 && drillY < ROWS) {
            for (let x = 0; x < COLS; x++) {
                if (this.grid[drillY][x] !== 0) {
                    if (!cells.some(c => c.x === x && c.y === drillY)) {
                        cells.push({ x, y: drillY, type: this.grid[drillY][x] });
                    }
                }
            }
        }
        return {
            cells,
            drillX,
            drillY
        };
    }

    removeDrillCells(cells, drillX = -1, drillY = -1) {
        cells.forEach(({ x, y }) => {
            if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
                this.grid[y][x] = 0;
            }
        });
        this.drillClearingCells = [];

        // Collapse the drilled row as standard Tetris line clear without collapsing column holes
        if (drillY >= 0 && drillY < ROWS) {
            this.grid.splice(drillY, 1);
            this.grid.unshift(Array(COLS).fill(0));
        }

        return cells.length;
    }

    applyDrill(drillX, drillY) {
        const { cells } = this.getDrillAffectedCells(drillX, drillY);
        this.removeDrillCells(cells, drillX, drillY);
        return cells;
    }
}
