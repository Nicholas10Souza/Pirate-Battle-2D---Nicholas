import * as PIXI from 'pixi.js';
import { path } from './assets';
import type { TextureStore } from './assets';
import { ghostPath, SHIP_SCALE } from './ShipView';
import type { ShipKind } from './ShipView';

const EXPLOSION = [1, 2, 3].map((n) => path.effect(`explosion_${n}`));

const WRECK_PARTS = [
    ...[1, 2, 3, 4].map((n) => `wood_${n}`),
    ...[1, 2, 3, 4, 5, 6].map((n) => `crew_${n}`),
    ...[1, 2, 3].map((n) => `dinghy_small_${n}`),
];

export function effectPaths(): string[] {
    return [...EXPLOSION, ...WRECK_PARTS.map(path.image)];
}

const roll = (n: number): number => 1 + Math.floor(Math.random() * n);

interface Blast {
    sprite: PIXI.Sprite;
    life: number;
    maxLife: number;
    grow: number;
}

export class Explosions {
    private readonly layer: PIXI.Container;
    private readonly frames: PIXI.Texture[];
    private readonly active: Blast[] = [];

    constructor(layer: PIXI.Container, store: TextureStore) {
        this.layer = layer;
        this.frames = EXPLOSION.map((p) => store.get(p));
    }

    public spawn(x: number, y: number, size = 1): void {
        const sprite = new PIXI.Sprite(this.frames[0]);
        sprite.anchor.set(0.5);
        sprite.position.set(x, y);
        sprite.scale.set(1.1 * size);
        this.layer.addChild(sprite);
        const life = 0.45 * Math.max(size, 0.6);
        this.active.push({ sprite, life, maxLife: life, grow: 0.5 * size });
    }

    public update(dt: number): void {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const b = this.active[i];
            b.life -= dt;
            const progress = 1 - b.life / b.maxLife;
            b.sprite.texture = this.frames[Math.min(this.frames.length - 1, Math.floor(progress * this.frames.length))];
            b.sprite.alpha = Math.min(1, b.life / (b.maxLife * 0.4));
            b.sprite.scale.x += dt * b.grow;
            b.sprite.scale.y += dt * b.grow;
            if (b.life > 0) continue;
            b.sprite.destroy();
            this.active.splice(i, 1);
        }
    }
}

interface Drifter {
    sprite: PIXI.Sprite;
    vx: number;
    vy: number;
    spin: number;
}

interface Wreck {
    node: PIXI.Container;
    ghost: PIXI.Sprite;
    scale: number;
    drifters: Drifter[];
    crew: { sprite: PIXI.Sprite; ring: PIXI.Graphics }[];
    age: number;
}

const WRECK_LIFE = 4;
const SINK_TIME = 2.4;

// casco fantasma que afunda, destroços, marinheiros e um bote à deriva
export class Wrecks {
    private readonly layer: PIXI.Container;
    private readonly store: TextureStore;
    private readonly active: Wreck[] = [];

    constructor(layer: PIXI.Container, store: TextureStore) {
        this.layer = layer;
        this.store = store;
    }

    public spawn(ship: { kind: ShipKind; x: number; y: number; rotation: number }): void {
        const node = new PIXI.Container();
        const scale = SHIP_SCALE[ship.kind];
        const ghost = new PIXI.Sprite(this.store.get(ghostPath(ship.kind)));
        ghost.anchor.set(0.5);
        ghost.alpha = 0.8;
        ghost.scale.set(scale);
        ghost.position.set(ship.x, ship.y);
        ghost.rotation = ship.rotation + Math.PI / 2;
        node.addChild(ghost);

        const wreck: Wreck = { node, ghost, scale, drifters: [], crew: [], age: 0 };

        const drift = (key: string, spread: number, speed: number, spin: number): PIXI.Sprite => {
            const sprite = new PIXI.Sprite(this.store.get(path.image(key)));
            sprite.anchor.set(0.5);
            sprite.scale.set(1.1);
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * spread;
            sprite.position.set(ship.x + Math.cos(a) * r, ship.y + Math.sin(a) * r);
            sprite.rotation = Math.random() * Math.PI * 2;
            const b = Math.random() * Math.PI * 2;
            wreck.drifters.push({ sprite, vx: Math.cos(b) * speed, vy: Math.sin(b) * speed, spin: (Math.random() - 0.5) * spin });
            node.addChild(sprite);
            return sprite;
        };

        for (let i = 0; i < 5; i++) drift(`wood_${roll(4)}`, 24, 28, 4);
        drift(`dinghy_small_${roll(3)}`, 34, 8, 0.6);
        for (let i = 0; i < 3; i++) {
            const ring = new PIXI.Graphics();
            node.addChild(ring);
            wreck.crew.push({ ring, sprite: drift(`crew_${roll(6)}`, 36, 6, 1.5) });
        }

        this.layer.addChild(node);
        this.active.push(wreck);
    }

    public update(dt: number): void {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const w = this.active[i];
            w.age += dt;
            if (w.age >= WRECK_LIFE) {
                w.node.destroy({ children: true });
                this.active.splice(i, 1);
                continue;
            }
            const sinking = Math.min(1, w.age / SINK_TIME);
            w.ghost.alpha = 0.8 * (1 - sinking);
            w.ghost.scale.set(w.scale * (1 - 0.1 * sinking));

            const fade = Math.min(1, WRECK_LIFE - w.age);
            for (const d of w.drifters) {
                d.sprite.x += d.vx * dt;
                d.sprite.y += d.vy * dt;
                d.vx *= 1 - 0.8 * dt;
                d.vy *= 1 - 0.8 * dt;
                d.sprite.rotation += d.spin * dt;
                d.sprite.alpha = fade;
            }
            const pulse = (w.age * 1.2) % 1;
            for (const c of w.crew) {
                c.ring.clear().circle(0, 0, 9 + pulse * 6).stroke({ width: 1.5, color: 0xffffff, alpha: 0.6 * fade * (1 - pulse) });
                c.ring.position.set(c.sprite.x, c.sprite.y);
            }
        }
    }
}