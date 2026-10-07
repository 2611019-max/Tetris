import { SHAPES, KICK_DATA } from './constants.js';

export class Piece {
    constructor(type, board, specialData = null) {
        this.type = type;
        this.board = board;
        this.matrix = SHAPES[type].map(row => [...row]);
        this.specialData = specialData;
        if (specialData && this.matrix[specialData.y] && this.matrix[specialData.y][specialData.x] !== undefined) {
            this.matrix[specialData.y][specialData.x] = specialData.type;
        }
        this.resetPosition();
        this.rotation = 0; // 0, 1, 2, 3
    }

    resetPosition() {
        if (this.type === 'O' || this.type === 'B' || this.type === 'D') {
            this.x = 4;
            this.y = 0;
        } else if (this.type === 'I') {
            this.x = 3;
            this.y = -1;
        } else {
            this.x = 3;
            this.y = 0;
        }
        this.rotation = 0;
    }

    rotate(clockwise = true) {
        const prevRotation = this.rotation;
        const nextRotation = (prevRotation + (clockwise ? 1 : 3)) % 4;
        
        // Rotate matrix
        const nextMatrix = this.getRotatedMatrix(clockwise);
        
        // SRS Wall Kicks
        const kicks = this.getKicks(prevRotation, nextRotation);
        
        for (const [dx, dy] of kicks) {
            // dy is inverted in standard grid (y increases downwards)
            if (this.board.isValidMove(this, dx, -dy, nextMatrix)) {
                this.x += dx;
                this.y -= dy;
                this.matrix = nextMatrix;
                this.rotation = nextRotation;
                return true;
            }
        }
        return false;
    }

    getRotatedMatrix(clockwise) {
        const matrix = this.matrix;
        const size = matrix.length;
        const result = Array.from({ length: size }, () => Array(size).fill(0));
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (clockwise) {
                    result[x][size - 1 - y] = matrix[y][x];
                } else {
                    result[size - 1 - x][y] = matrix[y][x];
                }
            }
        }
        return result;
    }

    getKicks(from, to) {
        const key = `${from}-${to}`;
        if (this.type === 'O' || this.type === 'B' || this.type === 'D') return [[0, 0]];
        if (this.type === 'I') return KICK_DATA.I[key];
        return KICK_DATA.common[key];
    }

    calculateGhostY() {
        let dy = 0;
        while (this.board.isValidMove(this, 0, dy + 1)) {
            dy++;
        }
        return this.y + dy;
    }

    cloneInitial() {
        return new Piece(
            this.type,
            this.board,
            this.specialData ? { ...this.specialData } : null
        );
    }

    getOccupiedBounds(targetY = this.y) {
        let minX = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        this.matrix.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val !== 0) {
                    const blockX = this.x + x;
                    const blockY = targetY + y;
                    minX = Math.min(minX, blockX);
                    maxX = Math.max(maxX, blockX + 1);
                    maxY = Math.max(maxY, blockY + 1);
                }
            });
        });

        return { minX, maxX, maxY };
    }
}
