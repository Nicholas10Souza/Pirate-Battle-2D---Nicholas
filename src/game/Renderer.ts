import * as PIXI from 'pixi.js';
import type { Simulation } from './Simulation';
import { TextureStore } from './assets';
import { buildIslandMap } from './TileMap';
import { Terrain, terrainPaths } from './Terrain';
import { ShipView, shipPaths } from './ShipView';
import type { ShipKind } from './ShipView';
import { Explosions, Wrecks, effectPaths } from './Effects';
import { Projectiles, projectilePaths } from './Projectiles';

const LAYERS = ['water', 'land', 'enemies', 'player', 'projectiles', 'effects', 'bars'] as const;
type Layer = (typeof LAYERS)[number];

export class GameRenderer {
    public app: PIXI.Application;

    private readonly sim: Simulation;
    private readonly store = new TextureStore();
    private readonly layers = {} as Record<Layer, PIXI.Container>;
    private readonly enemies = new Map<string, ShipView>();

    private terrain: Terrain | null = null;
    private player: ShipView | null = null;
    private explosions: Explosions | null = null;
    private wrecks: Wrecks | null = null;
    private projectiles: Projectiles | null = null;

    private lastPlayerHealth = -1;
    private lastTimeRemaining = Infinity;
    private started = false;
    private destroyed = false;

    constructor(sim: Simulation) {
        this.sim = sim;
        this.app = new PIXI.Application();
    }

    public async init(mount: HTMLDivElement, width: number, height: number): Promise<void> {
        await this.app.init({
            width,
            height,
            backgroundColor: 0x1f9bd0,
            resolution: Math.max(window.devicePixelRatio || 1, 2), // canvas escalado por css
            autoDensity: true,
            antialias: true,
        });

        if (this.destroyed) {
            try {
                this.app.destroy(true, { children: true });
            } catch { }
            return;
        }

        this.started = true;
        mount.appendChild(this.app.canvas);
        for (const name of LAYERS) {
            this.layers[name] = new PIXI.Container();
            this.app.stage.addChild(this.layers[name]);
        }

        const map = buildIslandMap(width, height);
        await this.store.load([...terrainPaths(map), ...shipPaths(), ...effectPaths(), ...projectilePaths()]);
        if (this.destroyed) return;

        this.terrain = new Terrain(map, this.store, width, height);
        this.layers.water.addChild(this.terrain.water);
        this.layers.land.addChild(this.terrain.land);

        this.explosions = new Explosions(this.layers.effects, this.store);
        this.wrecks = new Wrecks(this.layers.effects, this.store);
        this.projectiles = new Projectiles(this.layers.projectiles, this.store);
        this.player = this.addShip('player', 'green');
    }

    public spawnExplosion(x: number, y: number, size = 1): void {
        this.explosions?.spawn(x, y, size);
    }

    private addShip(kind: ShipKind, fill: 'green' | 'red'): ShipView {
        const view = new ShipView(kind, this.store, fill);
        this.layers[kind === 'player' ? 'player' : 'enemies'].addChild(view.body);
        this.layers.bars.addChild(view.bar.view);
        return view;
    }

    public render(dt: number = 0.016): void {
        const { terrain, player, explosions, wrecks, projectiles } = this;
        if (this.destroyed || !terrain || !player || !explosions || !wrecks || !projectiles) return;
        const state = this.sim.state;

        terrain.scroll(dt);

        const p = state.player;
        player.update(p.position.x, p.position.y, p.rotation, p.health / p.maxHealth, dt);
        if (this.lastPlayerHealth >= 0 && p.health < this.lastPlayerHealth) {
            explosions.spawn(p.position.x, p.position.y, 0.6);
        }
        this.lastPlayerHealth = p.health;

        const restarted = state.timeRemaining > this.lastTimeRemaining;
        this.lastTimeRemaining = state.timeRemaining;

        this.syncEnemies(dt, !restarted);
        projectiles.sync(state.projectiles, !restarted, (x, y) => explosions.spawn(x, y, 0.4));
        explosions.update(dt);
        wrecks.update(dt);
    }

    private syncEnemies(dt: number, effects: boolean): void {
        const seen = new Set<string>();
        for (const e of this.sim.state.enemies) {
            seen.add(e.id);
            let view = this.enemies.get(e.id);
            if (!view) {
                view = this.addShip(e.type, 'red');
                this.enemies.set(e.id, view);
            }
            view.update(e.position.x, e.position.y, e.rotation, e.health / e.maxHealth, dt);
        }
        for (const [id, view] of this.enemies) {
            if (seen.has(id)) continue;
            if (effects) {
                this.explosions?.spawn(view.x, view.y, 1);
                this.wrecks?.spawn({ kind: view.kind, x: view.x, y: view.y, rotation: view.rotation });
            }
            view.destroy();
            this.enemies.delete(id);
        }
    }

    public destroy(): void {
        this.destroyed = true;
        if (!this.started) return;
        try {
            this.app.destroy(true, { children: true });
        } catch { }
    }
}
