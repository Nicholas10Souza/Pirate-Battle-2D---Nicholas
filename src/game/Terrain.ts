import * as PIXI from 'pixi.js';
import { path } from './assets';
import type { TextureStore } from './assets';
import { cellOrigin, SHALLOW_TILE, shallowOrigin, TILE } from './TileMap';
import type { Cell, IslandMap } from './TileMap';

const SRC = 64;
const WATER_SCALE = 3;
const GRASS_LUM = 125;
const TONE = 0xdbdbdb;

export function terrainPaths(map: IslandMap): string[] {
    const ids = new Set<number>([73]);
    for (const c of [...map.shallows, ...map.cells, ...map.structures]) ids.add(c.tileId);
    return [...[...ids].map(path.tile), ...map.decorations.map((d) => path.image(d.image))];
}

function levelGrass(store: TextureStore, ids: Iterable<number>): void {
    for (const id of new Set(ids)) {
        const p = path.tile(id);
        const tex = store.get(p);
        const w = tex.width;
        const h = tex.height;
        if (!w || !h) continue;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.drawImage(tex.source.resource as CanvasImageSource, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const px = img.data;

        const grass = new Uint8Array(w * h);
        let found = false;
        for (let k = 0; k < w * h; k++) {
            const i = k * 4;
            if (px[i + 3] > 200 && px[i + 1] > px[i] + 10 && px[i + 1] > px[i + 2] + 30) {
                grass[k] = 1;
                found = true;
            }
        }
        if (!found) continue;

        const level = (list: number[]) => {
            if (list.length < 6) return;
            let sum = 0;
            for (const k of list) sum += px[k * 4] * 0.3 + px[k * 4 + 1] * 0.59 + px[k * 4 + 2] * 0.11;
            const f = Math.min(1.35, Math.max(0.75, GRASS_LUM / (sum / list.length)));
            for (const k of list) for (let c = 0; c < 3; c++) px[k * 4 + c] = Math.min(255, px[k * 4 + c] * f);
        };
        for (let y = 0; y < h; y++) {
            const list: number[] = [];
            for (let x = 0; x < w; x++) if (grass[y * w + x]) list.push(y * w + x);
            level(list);
        }
        for (let x = 0; x < w; x++) {
            const list: number[] = [];
            for (let y = 0; y < h; y++) if (grass[y * w + x]) list.push(y * w + x);
            level(list);
        }
        ctx.putImageData(img, 0, 0);
        store.replace(p, PIXI.Texture.from(canvas));
    }
}

function tileSprite(store: TextureStore, cell: Cell, origin: { x: number; y: number }, size: number): PIXI.Sprite {
    const sp = new PIXI.Sprite(store.get(path.tile(cell.tileId)));
    const s = size / SRC;
    sp.scale.set(cell.flipX ? -s : s, cell.flipY ? -s : s);
    sp.position.set(origin.x + (cell.flipX ? size : 0), origin.y + (cell.flipY ? size : 0));
    return sp;
}

export class Terrain {
    public readonly water: PIXI.TilingSprite;
    public readonly land = new PIXI.Container();

    constructor(map: IslandMap, store: TextureStore, width: number, height: number) {
        levelGrass(store, map.cells.map((c) => c.tileId));

        this.water = new PIXI.TilingSprite({ texture: store.get(path.tile(73)), width, height });
        this.water.tileScale.set(WATER_SCALE);
        this.water.tint = TONE;
        this.land.tint = TONE;

        const shallow = new PIXI.Container();
        for (const c of map.shallows) shallow.addChild(tileSprite(store, c, shallowOrigin(c.col, c.row), SHALLOW_TILE));

        const ground = new PIXI.Container();
        for (const c of map.cells) ground.addChild(tileSprite(store, c, cellOrigin(c.col, c.row), TILE));

        const structures = new PIXI.Container();
        for (const c of map.structures) structures.addChild(tileSprite(store, c, cellOrigin(c.col, c.row), TILE));

        const decorations = new PIXI.Container();
        for (const d of map.decorations) {
            const sp = new PIXI.Sprite(store.get(path.image(d.image)));
            sp.anchor.set(0.5);
            sp.scale.set((TILE / SRC) * d.scale);
            sp.rotation = d.rotation;
            sp.position.set(d.x, d.y);
            decorations.addChild(sp);
        }

        this.land.addChild(shallow, ground, structures, decorations);
    }

    public scroll(dt: number): void {
        this.water.tilePosition.x += dt * 6;
        this.water.tilePosition.y += dt * 3;
    }
}
