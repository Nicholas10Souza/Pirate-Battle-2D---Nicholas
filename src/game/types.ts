export interface IslandCircle {
    position: { x: number; y: number };
    radius: number;
}

export interface LandCell {
    col: number;
    row: number;
    tileId: number;
}

export interface Decoration {
    kind: 'palm' | 'rock';
    tileId: number;
    x: number;
    y: number;
    rotation: number;
    scale: number;
}

export interface IslandMap {
    cells: LandCell[];
    decorations: Decoration[];
}

const MARGIN = 3;

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

export function buildIslandMap(
    islands: IslandCircle[],
    width: number,
    height: number,
    tile: number,
    seed = 7
): IslandMap {
    const cols = Math.ceil(width / tile);
    const rows = Math.ceil(height / tile);
    const rnd = mulberry32(seed);
    const pick = <T,>(list: T[]): T => list[Math.floor(rnd() * list.length)];

    const insideCircle = (c: number, r: number): boolean => {
        const cx = (c + 0.5) * tile;
        const cy = (r + 0.5) * tile;
        return islands.some((i) => Math.hypot(cx - i.position.x, cy - i.position.y) < i.radius);
    };

    const land = new Map<string, boolean>();
    const key = (c: number, r: number) => `${c},${r}`;
    for (let r = -MARGIN; r < rows + MARGIN; r++) {
        for (let c = -MARGIN; c < cols + MARGIN; c++) land.set(key(c, r), insideCircle(c, r));
    }
    const isLand = (c: number, r: number): boolean => land.get(key(c, r)) ?? insideCircle(c, r);

    let changed = true;
    while (changed) {
        changed = false;
        for (const [k, v] of land) {
            if (!v) continue;
            const [c, r] = k.split(',').map(Number);
            const water = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dc, dr]) => !isLand(c + dc, r + dr)).length;
            if (water >= 3) {
                land.set(k, false);
                changed = true;
            }
        }
    }

    const isGrass = (c: number, r: number): boolean => {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (!isLand(c + dc, r + dr)) return false;
        return true;
    };

    const tileFor = (c: number, r: number): number => {
        if (isGrass(c, r)) return pick([23, 24, 39, 40]);
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
        return pick([4, 5, 18, 20, 21, 68, 69]);
    };

    const cells: LandCell[] = [];
    const decorations: Decoration[] = [];
    for (let r = -MARGIN; r < rows + MARGIN; r++) {
        for (let c = -MARGIN; c < cols + MARGIN; c++) {
            if (!isLand(c, r)) continue;
            const tileId = tileFor(c, r);

            if (c >= -1 && c <= cols && r >= -1 && r <= rows) cells.push({ col: c, row: r, tileId });

            if (isGrass(c, r) && c >= 0 && c < cols && r >= 0 && r < rows) {
                const roll = rnd();
                if (roll < 0.2) {
                    decorations.push({
                        kind: 'palm',
                        tileId: pick([70, 71, 72]),
                        x: (c + 0.2 + rnd() * 0.6) * tile,
                        y: (r + 0.2 + rnd() * 0.6) * tile,
                        rotation: rnd() * Math.PI * 2,
                        scale: 0.55 + rnd() * 0.35,
                    });
                } else if (roll < 0.27) {
                    decorations.push({
                        kind: 'rock',
                        tileId: pick([65, 66, 67]),
                        x: (c + 0.3 + rnd() * 0.4) * tile,
                        y: (r + 0.3 + rnd() * 0.4) * tile,
                        rotation: 0,
                        scale: 0.5 + rnd() * 0.25,
                    });
                }
            }
        }
    }
    return { cells, decorations };
}