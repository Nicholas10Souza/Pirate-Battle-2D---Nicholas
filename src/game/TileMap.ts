export const TILE = 68;
const ORIGIN = { x: -33, y: -5 };

const MASK = [
    '########.......',
    '..######.......',
    '..####.........',
    '..####.........',
    '...............',
    '...........####',
    '.....#####.####',
    '.....##########',
];
const COLS = MASK[0].length;
const ROWS = MASK.length;

export interface LandCell {
    col: number;
    row: number;
    tileId: number;
}

export interface Decoration {
    tileId: number;
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

const FORTRESS: LandCell[] = [
    { col: 1, row: 0, tileId: 93 },
    { col: 2, row: 0, tileId: 16 },
    { col: 3, row: 0, tileId: 78 },
    { col: 3, row: 1, tileId: 93 },
    { col: 4, row: 1, tileId: 76 },
    { col: 5, row: 1, tileId: 94 },
    { col: 5, row: 0, tileId: 31 },
];

const DECORATIONS: Decoration[] = [
    { tileId: 50, x: -3, y: 30, rotation: 0, scale: 0.75 },
    { tileId: 71, x: 139, y: 165, rotation: 0, scale: 0.96 },
    { tileId: 72, x: 205, y: 232, rotation: 0.4, scale: 0.97 },
    { tileId: 66, x: 337, y: 165, rotation: 0, scale: 1 },
    { tileId: 70, x: 408, y: 27, rotation: 0, scale: 0.92 },
    { tileId: 67, x: 673, y: 500, rotation: 0, scale: 1 },
    { tileId: 71, x: 805, y: 493, rotation: 0.3, scale: 1 },
    { tileId: 72, x: 816, y: 422, rotation: 0, scale: 0.7 },
    { tileId: 72, x: 788, y: 433, rotation: 1, scale: 0.6 },
];

export function cellOrigin(col: number, row: number): { x: number; y: number } {
    return { x: col * TILE + ORIGIN.x, y: row * TILE + ORIGIN.y };
}

const isLand = (c: number, r: number): boolean => {
    const row = MASK[Math.min(ROWS - 1, Math.max(0, r))];
    return row[Math.min(COLS - 1, Math.max(0, c))] === '#';
};

const isGrass = (c: number, r: number): boolean => {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (!isLand(c + dc, r + dr)) return false;
    return true;
};

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function buildIslandMap(seed = 7): IslandMap {
    const rnd = mulberry32(seed);
    const pick = <T,>(list: T[]): T => list[Math.floor(rnd() * list.length)];

    const tileFor = (c: number, r: number): number => {
        if (isGrass(c, r)) return pick([39, 40]);
        const n = !isLand(c, r - 1);
        const e = !isLand(c + 1, r);
        const s = !isLand(c, r + 1);
        const w = !isLand(c - 1, r);
        if (n && w) return isGrass(c + 1, r + 1) ? 6 : 1;
        if (n && e) return isGrass(c - 1, r + 1) ? 9 : 3;
        if (s && w) return isGrass(c + 1, r - 1) ? 54 : 33;
        if (s && e) return isGrass(c - 1, r - 1) ? 57 : 35;
        if (n) return isGrass(c, r + 1) ? pick([7, 8]) : 2;
        if (s) return isGrass(c, r - 1) ? pick([55, 56]) : 34;
        if (w) return isGrass(c + 1, r) ? pick([22, 38]) : 17;
        if (e) return isGrass(c - 1, r) ? pick([25, 41]) : 19;
        // 4 vizinhos de terra e uma diagonal de água
        if (!isLand(c + 1, r + 1)) return 36;
        if (!isLand(c - 1, r + 1)) return 37;
        if (!isLand(c + 1, r - 1)) return 52;
        if (!isLand(c - 1, r - 1)) return 53;
        return pick([68, 69]);
    };

    const cells: LandCell[] = [];
    for (let r = 0; r <= ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (isLand(c, r)) cells.push({ col: c, row: r, tileId: tileFor(c, r) });
        }
    }
    return { cells, structures: FORTRESS, decorations: DECORATIONS };
}

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

export function buildIslandColliders() {
    const list: { id: string; position: { x: number; y: number }; radius: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (MASK[r][c] !== '#') continue;
            const o = cellOrigin(c, r);
            list.push({ id: `land-${c}-${r}`, position: { x: o.x + TILE / 2, y: o.y + TILE / 2 }, radius: 38 });
        }
    }
    return list;
}
