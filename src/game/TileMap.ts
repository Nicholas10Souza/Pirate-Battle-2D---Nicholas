export const TILE = 68;
export const SHALLOW_TILE = 17;
const SHALLOW_REACH = 44;
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

export interface Cell {
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
    shallows: Cell[];
    cells: Cell[];
    structures: Cell[];
    decorations: Decoration[];
}

const piece = (col: number, row: number, tileId: number): Cell => ({ col, row, tileId, flipX: false, flipY: false });

// torres, muros, canhão, ponte.
const FORTRESS: Cell[] = [
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

export function shallowOrigin(col: number, row: number): { x: number; y: number } {
    return { x: col * SHALLOW_TILE + ORIGIN.x, y: row * SHALLOW_TILE + ORIGIN.y };
}

const isLand = (c: number, r: number): boolean => {
    const row = LAYOUT[Math.min(ROWS - 1, Math.max(0, r))];
    return row[Math.min(COLS - 1, Math.max(0, c))] !== '0';
};

function near(x: number, y: number, reach: number): boolean {
    const c0 = Math.floor((x - ORIGIN.x) / TILE);
    const r0 = Math.floor((y - ORIGIN.y) / TILE);
    for (let r = r0 - 1; r <= r0 + 1; r++) {
        for (let c = c0 - 1; c <= c0 + 1; c++) {
            if (!isLand(c, r)) continue;
            const o = cellOrigin(c, r);
            const dx = Math.max(o.x - x, 0, x - (o.x + TILE));
            const dy = Math.max(o.y - y, 0, y - (o.y + TILE));
            if (dx * dx + dy * dy <= reach * reach) return true;
        }
    }
    return false;
}

function buildShallows(width: number, height: number): Cell[] {
    const min = -2;
    const cols = Math.ceil((width - ORIGIN.x) / SHALLOW_TILE) + 4;
    const rows = Math.ceil((height - ORIGIN.y) / SHALLOW_TILE) + 4;
    const center = (i: number, j: number) => {
        const o = shallowOrigin(i + min, j + min);
        return { x: o.x + SHALLOW_TILE / 2, y: o.y + SHALLOW_TILE / 2 };
    };

    const grid: boolean[][] = [];
    for (let j = 0; j < rows; j++) {
        grid.push([]);
        for (let i = 0; i < cols; i++) {
            const p = center(i, j);
            grid[j].push(near(p.x, p.y, SHALLOW_REACH));
        }
    }
    const at = (i: number, j: number) => grid[Math.min(rows - 1, Math.max(0, j))][Math.min(cols - 1, Math.max(0, i))];

    for (let pass = 0; pass < 8; pass++) {
        let changed = false;
        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
                const here = grid[j][i];
                const gap = (at(i - 1, j) && at(i + 1, j)) || (at(i, j - 1) && at(i, j + 1));
                const spur = (!at(i - 1, j) && !at(i + 1, j)) || (!at(i, j - 1) && !at(i, j + 1));
                const p = center(i, j);
                let next = here;
                if (!here && gap) next = true;
                else if (here && spur && !near(p.x, p.y, 0)) next = false;
                if (next !== here) {
                    grid[j][i] = next;
                    changed = true;
                }
            }
        }
        if (!changed) break;
    }

    const list: Cell[] = [];
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            if (!grid[j][i]) continue;
            const o = shallowOrigin(i + min, j + min);
            if (o.x + SHALLOW_TILE <= 0 || o.x >= width || o.y + SHALLOW_TILE <= 0 || o.y >= height) continue;
            const n = !at(i, j - 1);
            const e = !at(i + 1, j);
            const s = !at(i, j + 1);
            const w = !at(i - 1, j);
            let id = 27;
            if (n && w) id = 10;
            else if (n && e) id = 12;
            else if (s && w) id = 42;
            else if (s && e) id = 44;
            else if (n) id = 11;
            else if (s) id = 43;
            else if (w) id = 26;
            else if (e) id = 28;
            else if (!at(i + 1, j + 1)) id = 58;
            else if (!at(i - 1, j + 1)) id = 59;
            else if (!at(i + 1, j - 1)) id = 74;
            else if (!at(i - 1, j - 1)) id = 75;
            list.push({ col: i + min, row: j + min, tileId: id, flipX: false, flipY: false });
        }
    }
    return list;
}

export function buildIslandMap(width: number, height: number): IslandMap {
    const cells: Cell[] = [];
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const m = /^(\d+)(h?)(v?)$/.exec(LAYOUT[row][col]);
            if (!m || m[1] === '0') continue;
            cells.push({ col, row, tileId: Number(m[1]), flipX: m[2] === 'h', flipY: m[3] === 'v' });
        }
    }
    return { shallows: buildShallows(width, height), cells, structures: FORTRESS, decorations: DECORATIONS };
}

// Círculo por célula de terra, para a colisão ficar igual ao desenho
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