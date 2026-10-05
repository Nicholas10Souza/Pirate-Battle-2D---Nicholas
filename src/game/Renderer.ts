import * as PIXI from 'pixi.js';
import { Simulation } from './Simulation';
import { buildIslandMap } from './TileMap';

const BASE = '/assets/png/default';
const TILE = 48;
const TILE_SRC = 64;

const SHIP_SKIN = { player: 3, chaser: 2, shooter: 5 } as const;
const SHIP_SCALE = { player: 0.8, chaser: 0.72, shooter: 0.8 } as const;
const BAR = { w: 160, h: 40, fillX: 24, fillW: 112, scale: 0.42, offsetY: 58 };

const EXPLOSION_FRAMES = [1, 2, 3].map((n) => `${BASE}/effects/explosion_${n}.png`);

const url = {
    tile: (id: number) => `${BASE}/tiles/tile_${id}.png`,
    ship: (id: number) => `${BASE}/ships/ship_${id}.png`,
    cannonBall: `${BASE}/ship_parts/cannon_ball.png`,
    fire: [`${BASE}/effects/fire_1.png`, `${BASE}/effects/fire_2.png`],
    barFrame: `${BASE}/ui/hud/enemy_health_frame.png`,
    barGreen: `${BASE}/ui/hud/enemy_health_fill_green.png`,
    barRed: `${BASE}/ui/hud/enemy_health_fill_red.png`,
};

const TILE_IDS = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 17, 18, 19, 20, 21, 22, 23, 24, 25, 33, 34, 35, 38, 39, 40, 41,
    54, 55, 56, 57, 65, 66, 67, 68, 69, 70, 71, 72, 73,
];

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
    public lastX = 0;
    public lastY = 0;
    private age = Math.random() * 10;

    constructor(skin: PIXI.Texture, scale: number, bar: HealthBar, fireTextures: PIXI.Texture[]) {
        const sprite = new PIXI.Sprite(skin);
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
        this.body.position.set(x, y);
        this.body.rotation = rotation + Math.PI / 2;
        this.bar.view.position.set(x, y - BAR.offsetY * 0.6);
        this.bar.setRatio(ratio);

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
    private lastPlayerHealth = -1;
    private lastTimeRemaining = Infinity;

    private isInitialized = false;
    private isDestroyed = false;

    constructor(sim: Simulation) {
        this.sim = sim;
        this.app = new PIXI.Application();
    }

    private t(path: string): PIXI.Texture {
        return this.tex[path] ?? PIXI.Texture.EMPTY;
    }

    public async init(viewportMount: HTMLDivElement, width: number, height: number): Promise<void> {
        await this.app.init({
            width,
            height,
            backgroundColor: 0x1f9bd0,
            resolution: window.devicePixelRatio || 1,
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

        await this.loadTextures();
        if (this.isDestroyed) return;
        this.buildScene(width, height);
    }

    private async loadTextures(): Promise<void> {
        const paths = [
            ...TILE_IDS.map(url.tile),
            url.ship(SHIP_SKIN.player),
            url.ship(SHIP_SKIN.chaser),
            url.ship(SHIP_SKIN.shooter),
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
        this.water.tileScale.set(TILE / TILE_SRC);
        this.bgContainer.addChild(this.water);

        // ilhas
        this.buildIslands(width, height);

        // jogador
        this.playerView = this.makeShipView('player', url.barGreen);
        this.shipContainer.addChild(this.playerView.body);
        this.hudWorldContainer.addChild(this.playerView.bar.view);
    }

    private makeShipView(kind: 'player' | 'chaser' | 'shooter', barFill: string): ShipView {
        const bar = new HealthBar(this.t(url.barFrame), this.t(barFill));
        return new ShipView(
            this.t(url.ship(SHIP_SKIN[kind])),
            SHIP_SCALE[kind],
            bar,
            url.fire.map((p) => this.t(p))
        );
    }

    private buildIslands(width: number, height: number): void {
        this.islandsContainer.removeChildren().forEach((c) => c.destroy({ children: true }));
        const map = buildIslandMap(this.sim.state.islands, width, height, TILE);
        const s = TILE / TILE_SRC;

        const ground = new PIXI.Container();
        for (const cell of map.cells) {
            const sp = new PIXI.Sprite(this.t(url.tile(cell.tileId)));
            sp.scale.set(s);
            sp.position.set(cell.col * TILE, cell.row * TILE);
            ground.addChild(sp);
        }
        this.islandsContainer.addChild(ground);

        for (const d of map.decorations) {
            const sp = new PIXI.Sprite(this.t(url.tile(d.tileId)));
            sp.anchor.set(0.5);
            sp.scale.set(s * d.scale * 1.3);
            sp.rotation = d.rotation;
            sp.position.set(d.x, d.y);
            this.islandsContainer.addChild(sp);
        }
    }

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

        const restarted = state.timeRemaining > this.lastTimeRemaining;
        this.lastTimeRemaining = state.timeRemaining;

        this.syncEnemies(dt, restarted);
        this.syncProjectiles(restarted);
        this.updateEffects(dt);
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
            if (!silent) this.spawnExplosion(view.lastX, view.lastY, 1);
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