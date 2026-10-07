import * as PIXI from 'pixi.js';
import { Simulation } from './Simulation';
import { buildIslandMap, cellOrigin, IslandMap, TILE } from './TileMap';

const BASE = '/assets/png/default';
const TILE_SRC = 64;
const WATER_SCALE = 3;
const TONE = 0xdbdbdb;
const GRASS_LUM = 125;

// ship_N: N, N+6 e N+12 são os estados de dano, N+18 é o casco fantasma
const SHIP_SKIN = { player: 3, chaser: 2, shooter: 5 } as const;
const SHIP_SCALE = { player: 0.8, chaser: 0.72, shooter: 0.8 } as const;

const BAR = { w: 160, h: 40, fillX: 24, fillW: 112, scale: 0.42, offsetY: 58 };

type ShipKind = 'player' | 'chaser' | 'shooter';

const WRECK_PARTS = [
    ...[1, 2, 3, 4].map((n) => `wood_${n}`),
    ...[1, 2, 3, 4, 5, 6].map((n) => `crew_${n}`),
    ...[1, 2, 3].map((n) => `dinghy_small_${n}`),
];

const EXPLOSION_FRAMES = [1, 2, 3].map((n) => `${BASE}/effects/explosion_${n}.png`);

const url = {
    tile: (id: number) => `${BASE}/tiles/tile_${id}.png`,
    ship: (id: number) => `${BASE}/ships/ship_${id}.png`,
    image: (key: string) => {
        if (key.startsWith('tile_')) return `${BASE}/tiles/${key}.png`;
        if (key.startsWith('dinghy_')) return `${BASE}/ships/${key}.png`;
        return `${BASE}/ship_parts/${key}.png`;
    },
    cannonBall: `${BASE}/ship_parts/cannon_ball.png`,
    fire: [`${BASE}/effects/fire_1.png`, `${BASE}/effects/fire_2.png`],
    barFrame: `${BASE}/ui/hud/enemy_health_frame.png`,
    barGreen: `${BASE}/ui/hud/enemy_health_fill_green.png`,
    barRed: `${BASE}/ui/hud/enemy_health_fill_red.png`,
};

class HealthBar {
    public readonly view = new PIXI.Container();
    private readonly mask = new PIXI.Graphics();
    private lastRatio = -1;

    constructor(frame: PIXI.Texture, fill: PIXI.Texture) {
        const fillSprite = new PIXI.Sprite(fill);
        fillSprite.mask = this.mask;
        this.view.addChild(new PIXI.Sprite(frame), fillSprite, this.mask);
        this.view.pivot.set(BAR.w / 2, BAR.h / 2);
        this.view.scale.set(BAR.scale);
        this.setRatio(1);
    }

    public setRatio(ratio: number): void {
        const r = Math.max(0, Math.min(1, ratio));
        if (r === this.lastRatio) return;
        this.lastRatio = r;
        this.mask.clear().rect(BAR.fillX, 0, BAR.fillW * r, BAR.h).fill(0xffffff);
    }
}

class ShipView {
    public readonly body = new PIXI.Container();
    public readonly bar: HealthBar;
    private readonly fire = new PIXI.Container();
    private readonly flames: PIXI.Sprite[] = [];
    public readonly kind: ShipKind;
    public lastX = 0;
    public lastY = 0;
    public lastRotation = 0;
    private age = Math.random() * 10;

    private readonly sprite: PIXI.Sprite;
    private readonly skins: PIXI.Texture[];

    constructor(kind: ShipKind, skins: PIXI.Texture[], scale: number, bar: HealthBar, fireTextures: PIXI.Texture[]) {
        this.kind = kind;
        this.skins = skins;
        const sprite = new PIXI.Sprite(skins[0]);
        this.sprite = sprite;
        sprite.anchor.set(0.5);
        sprite.scale.set(scale);
        this.body.addChild(sprite, this.fire);
        this.bar = bar;

        const spots = [[0, -14], [3, 10], [-4, 28]];
        spots.forEach(([x, y], i) => {
            const f = new PIXI.Sprite(fireTextures[i % fireTextures.length]);
            f.anchor.set(0.5, 0.85);
            f.position.set(x, y);
            this.fire.addChild(f);
            this.flames.push(f);
        });
        this.fire.visible = false;
    }

    public update(x: number, y: number, rotation: number, ratio: number, dt: number): void {
        this.lastX = x;
        this.lastY = y;
        this.lastRotation = rotation;
        this.body.position.set(x, y);
        this.body.rotation = rotation + Math.PI / 2;
        this.bar.view.position.set(x, y - BAR.offsetY * 0.6);
        this.bar.setRatio(ratio);
        this.sprite.texture = this.skins[ratio > 0.8 ? 0 : ratio > 0.45 ? 1 : 2];

        const burning = ratio < 0.5;
        this.fire.visible = burning;
        if (burning) {
            this.age += dt * 12;
            this.flames.forEach((f, i) => {
                const s = 0.9 + Math.sin(this.age + i * 1.7) * 0.2;
                f.scale.set(s, s * (1 + (0.5 - ratio)));
            });
        }
    }

    public destroy(): void {
        this.body.destroy({ children: true });
        this.bar.view.destroy({ children: true });
    }
}

interface ProjectileView {
    ball: PIXI.Sprite;
    trail: PIXI.Graphics;
    x: number;
    y: number;
    life: number;
}

interface Effect {
    sprite: PIXI.Sprite;
    frames: PIXI.Texture[];
    life: number;
    maxLife: number;
    grow: number;
}

export class GameRenderer {
    public app: PIXI.Application;
    private sim: Simulation;

    private bgContainer = new PIXI.Container();
    private islandsContainer = new PIXI.Container();
    private enemiesContainer = new PIXI.Container();
    private shipContainer = new PIXI.Container();
    private projectilesContainer = new PIXI.Container();
    private effectsContainer = new PIXI.Container();
    private hudWorldContainer = new PIXI.Container();

    private tex: Record<string, PIXI.Texture> = {};
    private water: PIXI.TilingSprite | null = null;
    private playerView: ShipView | null = null;
    private enemyViews = new Map<string, ShipView>();
    private projectileViews = new Map<string, ProjectileView>();
    private effects: Effect[] = [];
    private wrecks: { node: PIXI.Container; tick: (dt: number) => boolean }[] = [];
    private lastPlayerHealth = -1;
    private lastTimeRemaining = Infinity;
    private islandMap: IslandMap | null = null;

    private isInitialized = false;
    private isDestroyed = false;

    constructor(sim: Simulation) {
        this.sim = sim;
        this.app = new PIXI.Application();
    }

    private t(path: string): PIXI.Texture {
        const texture = this.tex[path];
        if (!texture) {
            console.warn('textura não carregada:', path);
            return PIXI.Texture.EMPTY;
        }
        return texture;
    }

    public async init(viewportMount: HTMLDivElement, width: number, height: number): Promise<void> {
        await this.app.init({
            width,
            height,
            backgroundColor: 0x1f9bd0,
            resolution: Math.max(window.devicePixelRatio || 1, 2), // canvas escalado por css
            autoDensity: true,
            antialias: true,
        });

        if (this.isDestroyed) {
            try {
                this.app.destroy(true, { children: true });
            } catch { }
            return;
        }

        this.isInitialized = true;
        viewportMount.appendChild(this.app.canvas);

        const stage = this.app.stage;
        stage.addChild(
            this.bgContainer,
            this.islandsContainer,
            this.enemiesContainer,
            this.shipContainer,
            this.projectilesContainer,
            this.effectsContainer,
            this.hudWorldContainer
        );

        this.islandMap = buildIslandMap();
        await this.loadTextures();
        if (this.isDestroyed) return;
        this.evenGrass();
        this.buildScene(width, height);
    }

    private async loadTextures(): Promise<void> {
        const tileIds = new Set<number>([73]);
        const map = this.islandMap;
        map?.shallows.forEach((c) => tileIds.add(c.tileId));
        map?.cells.forEach((c) => tileIds.add(c.tileId));
        map?.structures.forEach((c) => tileIds.add(c.tileId));

        const paths = [
            ...[...tileIds].map(url.tile),
            ...(map?.decorations.map((d) => url.image(d.image)) ?? []),
            ...WRECK_PARTS.map(url.image),
            ...Object.values(SHIP_SKIN).flatMap((id) => [0, 6, 12, 18].map((o) => url.ship(id + o))),
            url.cannonBall,
            ...url.fire,
            ...EXPLOSION_FRAMES,
            url.barFrame,
            url.barGreen,
            url.barRed,
        ];
        try {
            this.tex = (await PIXI.Assets.load<PIXI.Texture>(paths)) as Record<string, PIXI.Texture>;
        } catch (err) {

            console.error('[GameRenderer] falha ao carregar texturas:', err);
        }
    }

    private buildScene(width: number, height: number): void {
        // água
        this.water = new PIXI.TilingSprite({ texture: this.t(url.tile(73)), width, height });
        this.water.tileScale.set(WATER_SCALE);
        this.water.tint = TONE;
        this.bgContainer.addChild(this.water);
        this.islandsContainer.tint = TONE;

        // ilhas
        this.buildIslands();

        // jogador
        this.playerView = this.makeShipView('player', url.barGreen);
        this.shipContainer.addChild(this.playerView.body);
        this.hudWorldContainer.addChild(this.playerView.bar.view);
    }

    private makeShipView(kind: ShipKind, barFill: string): ShipView {
        const bar = new HealthBar(this.t(url.barFrame), this.t(barFill));
        return new ShipView(
            kind,
            [0, 6, 12].map((o) => this.t(url.ship(SHIP_SKIN[kind] + o))),
            SHIP_SCALE[kind],
            bar,
            url.fire.map((p) => this.t(p))
        );
    }

    private evenGrass(): void {
        const ids = new Set<number>(this.islandMap?.cells.map((c) => c.tileId));
        for (const id of ids) {
            const path = url.tile(id);
            const tex = this.tex[path];
            if (!tex) continue;
            const w = tex.width;
            const h = tex.height;
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
            this.tex[path] = PIXI.Texture.from(canvas);
        }
    }

    private buildIslands(): void {
        this.islandsContainer.removeChildren().forEach((c) => c.destroy({ children: true }));
        const map = this.islandMap;
        if (!map) return;
        const s = TILE / TILE_SRC;

        const shallow = new PIXI.Container();
        for (const cell of map.shallows) {
            const sp = new PIXI.Sprite(this.t(url.tile(cell.tileId)));
            const o = cellOrigin(cell.col, cell.row);
            sp.scale.set(s);
            sp.position.set(o.x, o.y);
            shallow.addChild(sp);
        }
        this.islandsContainer.addChild(shallow);

        const ground = new PIXI.Container();
        for (const cell of map.cells) {
            const sp = new PIXI.Sprite(this.t(url.tile(cell.tileId)));
            const o = cellOrigin(cell.col, cell.row);
            sp.scale.set(cell.flipX ? -s : s, cell.flipY ? -s : s);
            sp.position.set(o.x + (cell.flipX ? TILE : 0), o.y + (cell.flipY ? TILE : 0));
            ground.addChild(sp);
        }
        this.islandsContainer.addChild(ground);

        for (const cell of map.structures) {
            const sp = new PIXI.Sprite(this.t(url.tile(cell.tileId)));
            sp.scale.set(s);
            const o = cellOrigin(cell.col, cell.row);
            sp.position.set(o.x, o.y);
            this.islandsContainer.addChild(sp);
        }

        for (const d of map.decorations) {
            const sp = new PIXI.Sprite(this.t(url.image(d.image)));
            sp.anchor.set(0.5);
            sp.scale.set(s * d.scale);
            sp.rotation = d.rotation;
            sp.position.set(d.x, d.y);
            this.islandsContainer.addChild(sp);
        }
    }

    // size 1 = navio destruído, menor = acerto
    public spawnExplosion(x: number, y: number, size = 1): void {
        const frames = EXPLOSION_FRAMES.map((p) => this.t(p));
        const sprite = new PIXI.Sprite(frames[0]);
        sprite.anchor.set(0.5);
        sprite.position.set(x, y);
        sprite.scale.set(1.1 * size);
        this.effectsContainer.addChild(sprite);
        const life = 0.45 * Math.max(size, 0.6);
        this.effects.push({ sprite, frames, life, maxLife: life, grow: 0.5 * size });
    }

    private updateEffects(dt: number): void {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const fx = this.effects[i];
            fx.life -= dt;
            const progress = 1 - fx.life / fx.maxLife;
            const frame = Math.min(fx.frames.length - 1, Math.floor(progress * fx.frames.length));
            fx.sprite.texture = fx.frames[frame];
            fx.sprite.alpha = Math.min(1, fx.life / (fx.maxLife * 0.4));
            fx.sprite.scale.x += dt * fx.grow;
            fx.sprite.scale.y += dt * fx.grow;
            if (fx.life <= 0) {
                fx.sprite.destroy();
                this.effects.splice(i, 1);
            }
        }
    }

    // casco fantasma que afunda, destroços, marinheiros e um bote à deriva
    private sink(view: ShipView): void {
        const node = new PIXI.Container();
        const base = SHIP_SCALE[view.kind];
        const ghost = new PIXI.Sprite(this.t(url.ship(SHIP_SKIN[view.kind] + 18)));
        ghost.anchor.set(0.5);
        ghost.alpha = 0.8;
        ghost.scale.set(base);
        ghost.position.set(view.lastX, view.lastY);
        ghost.rotation = view.lastRotation + Math.PI / 2;
        node.addChild(ghost);

        const drifters: { sp: PIXI.Sprite; vx: number; vy: number; spin: number }[] = [];
        const drift = (key: string, spread: number, speed: number, spin: number): PIXI.Sprite => {
            const sp = new PIXI.Sprite(this.t(url.image(key)));
            sp.anchor.set(0.5);
            sp.scale.set(1.1);
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * spread;
            sp.position.set(view.lastX + Math.cos(a) * r, view.lastY + Math.sin(a) * r);
            sp.rotation = Math.random() * Math.PI * 2;
            const b = Math.random() * Math.PI * 2;
            drifters.push({ sp, vx: Math.cos(b) * speed, vy: Math.sin(b) * speed, spin: (Math.random() - 0.5) * spin });
            node.addChild(sp);
            return sp;
        };

        for (let i = 0; i < 5; i++) drift(`wood_${1 + Math.floor(Math.random() * 4)}`, 24, 28, 4);
        drift(`dinghy_small_${1 + Math.floor(Math.random() * 3)}`, 34, 8, 0.6);

        const crew: { sp: PIXI.Sprite; ring: PIXI.Graphics }[] = [];
        for (let i = 0; i < 3; i++) {
            const ring = new PIXI.Graphics();
            node.addChild(ring);
            crew.push({ ring, sp: drift(`crew_${1 + Math.floor(Math.random() * 6)}`, 36, 6, 1.5) });
        }

        const total = 4;
        let age = 0;
        this.wrecks.push({
            node,
            tick: (dt) => {
                age += dt;
                const sinking = Math.min(1, age / 2.4);
                ghost.alpha = 0.8 * (1 - sinking);
                ghost.scale.set(base * (1 - 0.1 * sinking));
                const fade = Math.min(1, total - age);
                for (const d of drifters) {
                    d.sp.x += d.vx * dt;
                    d.sp.y += d.vy * dt;
                    d.vx *= 1 - 0.8 * dt;
                    d.vy *= 1 - 0.8 * dt;
                    d.sp.rotation += d.spin * dt;
                    d.sp.alpha = fade;
                }
                for (const c of crew) {
                    const pulse = (age * 1.2) % 1;
                    c.ring.clear().circle(0, 0, 9 + pulse * 6).stroke({ width: 1.5, color: 0xffffff, alpha: 0.6 * fade * (1 - pulse) });
                    c.ring.position.set(c.sp.x, c.sp.y);
                }
                return age < total;
            },
        });
        this.effectsContainer.addChild(node);
    }

    private updateWrecks(dt: number): void {
        for (let i = this.wrecks.length - 1; i >= 0; i--) {
            if (this.wrecks[i].tick(dt)) continue;
            this.wrecks[i].node.destroy({ children: true });
            this.wrecks.splice(i, 1);
        }
    }

    public render(dt: number = 0.016): void {
        if (!this.isInitialized || this.isDestroyed || !this.playerView) return;
        const state = this.sim.state;

        if (this.water) {
            this.water.tilePosition.x += dt * 6;
            this.water.tilePosition.y += dt * 3;
        }

        const p = state.player;
        this.playerView.update(p.position.x, p.position.y, p.rotation, p.health / p.maxHealth, dt);
        if (this.lastPlayerHealth >= 0 && p.health < this.lastPlayerHealth) {
            this.spawnExplosion(p.position.x, p.position.y, 0.6);
        }
        this.lastPlayerHealth = p.health;

        // timeRemaining subiu: partida reiniciada
        const restarted = state.timeRemaining > this.lastTimeRemaining;
        this.lastTimeRemaining = state.timeRemaining;

        this.syncEnemies(dt, restarted);
        this.syncProjectiles(restarted);
        this.updateEffects(dt);
        this.updateWrecks(dt);
    }

    private syncEnemies(dt: number, silent: boolean): void {
        const seen = new Set<string>();
        for (const e of this.sim.state.enemies) {
            seen.add(e.id);
            let view = this.enemyViews.get(e.id);
            if (!view) {
                view = this.makeShipView(e.type, url.barRed);
                this.enemyViews.set(e.id, view);
                this.enemiesContainer.addChild(view.body);
                this.hudWorldContainer.addChild(view.bar.view);
            }
            view.update(e.position.x, e.position.y, e.rotation, e.health / e.maxHealth, dt);
        }
        for (const [id, view] of this.enemyViews) {
            if (seen.has(id)) continue;
            if (!silent) {
                this.spawnExplosion(view.lastX, view.lastY, 1);
                this.sink(view);
            }
            view.destroy();
            this.enemyViews.delete(id);
        }
    }

    private syncProjectiles(silent: boolean): void {
        const seen = new Set<string>();
        for (const pr of this.sim.state.projectiles) {
            seen.add(pr.id);
            let view = this.projectileViews.get(pr.id);
            if (!view) {
                const ball = new PIXI.Sprite(this.t(url.cannonBall));
                ball.anchor.set(0.5);
                const trail = new PIXI.Graphics();
                this.projectilesContainer.addChild(trail, ball);
                view = { ball, trail, x: pr.position.x, y: pr.position.y, life: pr.lifeTime };
                this.projectileViews.set(pr.id, view);
                ball.scale.set(Math.max(1, (pr.radius * 2.4) / 10));
                const len = 18;
                const ox = -Math.cos(pr.rotation) * len;
                const oy = -Math.sin(pr.rotation) * len;
                trail.moveTo(0, 0).lineTo(ox, oy).stroke({
                    width: 2.5,
                    color: pr.owner === 'player' ? 0xffffff : 0xffd7d0,
                    alpha: 0.55,
                    cap: 'round',
                });
            }
            view.x = pr.position.x;
            view.y = pr.position.y;
            view.life = pr.lifeTime;
            view.ball.position.set(pr.position.x, pr.position.y);
            view.trail.position.set(pr.position.x, pr.position.y);
        }
        for (const [id, view] of this.projectileViews) {
            if (seen.has(id)) continue;

            if (!silent && view.life > 0.06) this.spawnExplosion(view.x, view.y, 0.4);
            view.ball.destroy();
            view.trail.destroy();
            this.projectileViews.delete(id);
        }
    }

    public destroy(): void {
        this.isDestroyed = true;
        if (this.isInitialized) {
            try {
                this.app.destroy(true, { children: true });
            } catch { }
        }
    }
}
