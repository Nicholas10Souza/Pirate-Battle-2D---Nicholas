export const TILE = 68;
const ORIGIN = { x: -33, y: -5 };

const LAYOUT = [
    ' 56 56h  37  39 39h  39  40  41   0   0   0   0   0   0   0',
    '  0   0 38v 39v 39hv  36  56  57   0   0   0   0   0   0   0',
    '  0   0  38  39  40  41   0   0   0   0   0   0   0   0   0',
    '  0   0  54  55 55h  57   0   0   0   0   0   0   0   0   0',
    '  0   0   0   0   0   0   0   0   0   0   0   0   0   0   0',
    '  0   0   0   0   0   0   0   0   0   0   0   6   8  8h   8',
    '  0   0   0   0   0   6   8  8h   8   9   0  38  39  40 40h',
    '  0   0   0   0   0  38 39h  39 39h  52  8h  53 39v 40v 40hv',
].map((row) => row.trim().split(/\s+/));

const ROWS = LAYOUT.length;
const COLS = LAYOUT[0].length;

export interface LandCell {
    col: number;
    row: number;
    tileId: number;
    flipX: boolean;
    flipY: boolean;
}

export interface Decoration {
    image: string;
    x: number;
    y: number;
    rotation: number;
    scale: number;
}

export interface IslandMap {
    cells: LandCell[];
    structures: LandCell[];
    decorations: Decoration[];
}

const piece = (col: number, row: number, tileId: number): LandCell => ({ col, row, tileId, flipX: false, flipY: false });

// torres 93 94 78, muros 15 16, canhão 31, ponte 76
const FORTRESS: LandCell[] = [
    piece(1, 0, 93),
    piece(2, 0, 16),
    piece(3, 0, 78),
    piece(3, 1, 93),
    piece(4, 1, 76),
    piece(5, 1, 94),
    piece(5, 0, 31),
];

const DECORATIONS: Decoration[] = [
    { image: 'tile_50', x: -3, y: 30, rotation: 0, scale: 0.75 },
    { image: 'tile_71', x: 139, y: 165, rotation: 0, scale: 0.96 },
    { image: 'tile_72', x: 205, y: 232, rotation: 0.4, scale: 0.97 },
    { image: 'tile_66', x: 337, y: 165, rotation: 0, scale: 1 },
    { image: 'tile_70', x: 408, y: 27, rotation: 0, scale: 0.92 },
    { image: 'tile_67', x: 673, y: 500, rotation: 0, scale: 1 },
    { image: 'tile_71', x: 805, y: 493, rotation: 0.3, scale: 1 },
    { image: 'tile_72', x: 816, y: 422, rotation: 0, scale: 0.7 },
    { image: 'tile_72', x: 788, y: 433, rotation: 1, scale: 0.6 },
    { image: 'dinghy_large_2', x: 544, y: 430, rotation: 0.5, scale: 1.1 },
    { image: 'dinghy_small_1', x: 723, y: 355, rotation: -0.9, scale: 1.1 },
    { image: 'cannon_mobile', x: 797, y: 357, rotation: -0.6, scale: 1.1 },
    { image: 'cannon_loose', x: 933, y: 421, rotation: 1.4, scale: 1.1 },
    { image: 'wood_4', x: 949, y: 437, rotation: -0.6, scale: 1.2 },
];

export function cellOrigin(col: number, row: number): { x: number; y: number } {
    return { x: col * TILE + ORIGIN.x, y: row * TILE + ORIGIN.y };
}

// fora da grade repete a borda, a ilha continua além da tela
const isLand = (c: number, r: number): boolean => {
    const row = LAYOUT[Math.min(ROWS - 1, Math.max(0, r))];
    return row[Math.min(COLS - 1, Math.max(0, c))] !== '0';
};

export function buildIslandMap(): IslandMap {
    const cells: LandCell[] = [];
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const m = /^(\d+)(h?)(v?)$/.exec(LAYOUT[row][col]);
            if (!m || m[1] === '0') continue;
            cells.push({ col, row, tileId: Number(m[1]), flipX: m[2] === 'h', flipY: m[3] === 'v' });
        }
    }
    return { cells, structures: FORTRESS, decorations: DECORATIONS };
}

// retângulos de terra para desenhar as águas rasas
export function landRects(): { x: number; y: number; w: number; h: number }[] {
    const list: { x: number; y: number; w: number; h: number }[] = [];
    for (let r = -2; r <= ROWS + 1; r++) {
        for (let c = -2; c <= COLS + 1; c++) {
            if (!isLand(c, r)) continue;
            const o = cellOrigin(c, r);
            list.push({ x: o.x, y: o.y, w: TILE, h: TILE });
        }
    }
    return list;
}

// um círculo por célula de terra, para a colisão ficar igual ao desenho
export function buildIslandColliders() {
    const list: { id: string; position: { x: number; y: number }; radius: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (LAYOUT[r][c] === '0') continue;
            const o = cellOrigin(c, r);
            list.push({ id: `land-${c}-${r}`, position: { x: o.x + TILE / 2, y: o.y + TILE / 2 }, radius: 38 });
        }
    }
    return list;
}