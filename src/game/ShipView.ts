import * as PIXI from 'pixi.js';
import { path } from './assets';
import type { TextureStore } from './assets';

export type ShipKind = 'player' | 'chaser' | 'shooter';

export const SHIP_SKIN: Record<ShipKind, number> = { player: 3, chaser: 2, shooter: 5 };
export const SHIP_SCALE: Record<ShipKind, number> = { player: 0.8, chaser: 0.72, shooter: 0.8 };

const DAMAGE_STEP = 6;
const GHOST_STEP = 18;

const BAR = { w: 160, h: 40, fillX: 24, fillW: 112, scale: 0.42, lift: 35 };
const FLAMES: [number, number][] = [[0, -14], [3, 10], [-4, 28]];

export const ghostPath = (kind: ShipKind): string => path.ship(SHIP_SKIN[kind] + GHOST_STEP);

export function shipPaths(): string[] {
    const offsets = [0, DAMAGE_STEP, DAMAGE_STEP * 2, GHOST_STEP];
    return [
        ...Object.values(SHIP_SKIN).flatMap((id) => offsets.map((o) => path.ship(id + o))),
        path.effect('fire_1'),
        path.effect('fire_2'),
        path.hud('enemy_health_frame'),
        path.hud('enemy_health_fill_green'),
        path.hud('enemy_health_fill_red'),
    ];
}

class HealthBar {
    public readonly view = new PIXI.Container();
    private readonly mask = new PIXI.Graphics();
    private last = -1;

    constructor(frame: PIXI.Texture, fill: PIXI.Texture) {
        const fillSprite = new PIXI.Sprite(fill);
        fillSprite.mask = this.mask;
        this.view.addChild(new PIXI.Sprite(frame), fillSprite, this.mask);
        this.view.pivot.set(BAR.w / 2, BAR.h / 2);
        this.view.scale.set(BAR.scale);
        this.set(1);
    }

    public set(ratio: number): void {
        const r = Math.max(0, Math.min(1, ratio));
        if (r === this.last) return;
        this.last = r;
        this.mask.clear().rect(BAR.fillX, 0, BAR.fillW * r, BAR.h).fill(0xffffff);
    }
}

export class ShipView {
    public readonly kind: ShipKind;
    public readonly body = new PIXI.Container();
    public readonly bar: HealthBar;
    public x = 0;
    public y = 0;
    public rotation = 0;

    private readonly sprite: PIXI.Sprite;
    private readonly skins: PIXI.Texture[];
    private readonly fire = new PIXI.Container();
    private readonly flames: PIXI.Sprite[] = [];
    private age = Math.random() * 10;

    constructor(kind: ShipKind, store: TextureStore, fill: 'green' | 'red') {
        this.kind = kind;
        this.skins = [0, DAMAGE_STEP, DAMAGE_STEP * 2].map((o) => store.get(path.ship(SHIP_SKIN[kind] + o)));
        this.bar = new HealthBar(store.get(path.hud('enemy_health_frame')), store.get(path.hud(`enemy_health_fill_${fill}`)));

        this.sprite = new PIXI.Sprite(this.skins[0]);
        this.sprite.anchor.set(0.5);
        this.sprite.scale.set(SHIP_SCALE[kind]);
        this.body.addChild(this.sprite, this.fire);

        const fireFrames = [store.get(path.effect('fire_1')), store.get(path.effect('fire_2'))];
        FLAMES.forEach(([x, y], i) => {
            const f = new PIXI.Sprite(fireFrames[i % fireFrames.length]);
            f.anchor.set(0.5, 0.85);
            f.position.set(x, y);
            this.fire.addChild(f);
            this.flames.push(f);
        });
        this.fire.visible = false;
    }

    public update(x: number, y: number, rotation: number, ratio: number, dt: number): void {
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.body.position.set(x, y);
        this.body.rotation = rotation + Math.PI / 2;
        this.bar.view.position.set(x, y - BAR.lift);
        this.bar.set(ratio);
        this.sprite.texture = this.skins[ratio > 0.8 ? 0 : ratio > 0.45 ? 1 : 2];

        this.fire.visible = ratio < 0.5;
        if (!this.fire.visible) return;
        this.age += dt * 12;
        this.flames.forEach((f, i) => {
            const s = 0.9 + Math.sin(this.age + i * 1.7) * 0.2;
            f.scale.set(s, s * (1 + (0.5 - ratio)));
        });
    }

    public destroy(): void {
        this.body.destroy({ children: true });
        this.bar.view.destroy({ children: true });
    }
}