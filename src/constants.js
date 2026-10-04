export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30;

export const SHAPES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
    ],
    O: [
        [1, 1],
        [1, 1],
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
    ],
};

// Cyber Neon Jewel Tones
export const COLORS = {
    I: '#00f0ff', // Cyan Neon
    J: '#1b6aff', // Electric Blue
    L: '#ff8800', // Neon Amber
    O: '#ffe600', // Electric Gold
    S: '#00ff66', // Emerald Neon
    T: '#cc00ff', // Vivid Purple
    Z: '#ff0055', // Crimson Laser
    G: '#718096', // Metallic Garbage
};

// Shading and Glow specifications for 3D Beveled Jewel Tiles
export const BLOCK_THEME = {
    I: { base: '#00d4e6', light: '#80f8ff', dark: '#008b99', glow: 'rgba(0, 240, 255, 0.6)' },
    J: { base: '#1b6aff', light: '#73a4ff', dark: '#0c3ea8', glow: 'rgba(27, 106, 255, 0.6)' },
    L: { base: '#ff8800', light: '#ffb366', dark: '#b35f00', glow: 'rgba(255, 136, 0, 0.6)' },
    O: { base: '#ffd000', light: '#ffe866', dark: '#b39200', glow: 'rgba(255, 230, 0, 0.6)' },
    S: { base: '#00e65c', light: '#66ff9e', dark: '#00993d', glow: 'rgba(0, 255, 102, 0.6)' },
    T: { base: '#b800e6', light: '#e066ff', dark: '#7a0099', glow: 'rgba(204, 0, 255, 0.6)' },
    Z: { base: '#ff0055', light: '#ff6699', dark: '#b3003b', glow: 'rgba(255, 0, 85, 0.6)' },
    G: { base: '#4a5568', light: '#8898aa', dark: '#2d3748', glow: 'rgba(113, 128, 150, 0.4)' },
};

export const GHOST_COLORS = {
    I: 'rgba(0, 240, 255, 0.28)',
    J: 'rgba(27, 106, 255, 0.28)',
    L: 'rgba(255, 136, 0, 0.28)',
    O: 'rgba(255, 230, 0, 0.28)',
    S: 'rgba(0, 255, 102, 0.28)',
    T: 'rgba(204, 0, 255, 0.28)',
    Z: 'rgba(255, 0, 85, 0.28)',
    G: 'rgba(113, 128, 150, 0.28)',
};

// SRS (Super Rotation System) Wall Kick Data
export const KICK_DATA = {
    common: {
        '0-1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '1-2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '2-3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
        '3-0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '1-0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '2-1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '3-2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '0-3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    },
    I: {
        '0-1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '1-2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
        '2-3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '3-0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '1-0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '2-1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '3-2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '0-3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    }
};

export const POINTS = {
    SINGLE: 100,
    DOUBLE: 300,
    TRIPLE: 500,
    TETRIS: 800,
    SOFT_DROP: 1,
    HARD_DROP: 2,
    COMBO_BONUS: 50,
};

export const LEVEL_SPEED = {
    1: 800,
    2: 716,
    3: 633,
    4: 550,
    5: 466,
    6: 383,
    7: 300,
    8: 216,
    9: 133,
    10: 100,
};

export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;
export const LINE_CLEAR_ANIM_MS = 180;

export const KEY = {
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
    DOWN: 'ArrowDown',
    UP: 'ArrowUp',
    SPACE: ' ',
    HOLD_C: 'c',
    HOLD_C_UP: 'C',
    HOLD_SHIFT: 'Shift',
    PAUSE_P: 'p',
    PAUSE_P_UP: 'P',
    PAUSE_ESC: 'Escape',
    MUTE_M: 'm',
    MUTE_M_UP: 'M',
    ENTER: 'Enter',
};
