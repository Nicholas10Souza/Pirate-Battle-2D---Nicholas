import * as PIXI from 'pixi.js';
import { path } from './assets';
import type { TextureStore } from './assets';
import type { Simulation } from './Simulation';

type ProjectileState = Simulation['state']['projectiles'][number];

const BALL = path.shipPart('cannon_ball');
const TRAIL = 18;

export const projectilePaths = (): string[] => [BALL];

interface View {
    ball: PIXI.Sprite;
    trail: PIXI.Graphics;
    x: number;
    y: number;
    life: number;
}

export class Projectiles {
    private readonly layer: PIXI.Container;
    private readonly store: TextureStore;
    private readonly views = new Map<string, View>();

    constructor(layer: PIXI.Container, store: TextureStore) {
        this.layer = layer;
        this.store = store;
    }

    private create(pr: ProjectileState): View {
        const ball = new PIXI.Sprite(this.store.get(BALL));
        ball.anchor.set(0.5);
        ball.scale.set(Math.max(1, (pr.radius * 2.4) / 10));
        const trail = new PIXI.Graphics();
        trail
            .moveTo(0, 0)
            .lineTo(-Math.cos(pr.rotation) * TRAIL, -Math.sin(pr.rotation) * TRAIL)
            .stroke({ width: 2.5, color: pr.owner === 'player' ? 0xffffff : 0xffd7d0, alpha: 0.55, cap: 'round' });
        this.layer.addChild(trail, ball);
        return { ball, trail, x: pr.position.x, y: pr.position.y, life: pr.lifeTime };
    }

    public sync(list: readonly ProjectileState[], impacts: boolean, onImpact: (x: number, y: number) => void): void {
        const seen = new Set<string>();
        for (const pr of list) {
            seen.add(pr.id);
            let view = this.views.get(pr.id);
            if (!view) {
                view = this.create(pr);
                this.views.set(pr.id, view);
            }
            view.x = pr.position.x;
            view.y = pr.position.y;
            view.life = pr.lifeTime;
            view.ball.position.set(view.x, view.y);
            view.trail.position.set(view.x, view.y);
        }
        for (const [id, view] of this.views) {
            if (seen.has(id)) continue;

            if (impacts && view.life > 0.06) onImpact(view.x, view.y);
            view.ball.destroy();
            view.trail.destroy();
            this.views.delete(id);
        }
    }
}