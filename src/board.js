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
    }

    getEmptyGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    reset() {
        this.grid = this.getEmptyGrid();
        this.clearingRows = [];
        this.clearAnimTime = 0;
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
}
