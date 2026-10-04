import * as PIXI from 'pixi.js';
import { Simulation } from './Simulation';

interface Particle {
    sprite: PIXI.Sprite | PIXI.Graphics;
    life: number;
    maxLife: number;
}

export class GameRenderer {
    public app: PIXI.Application;
    private sim: Simulation;
    private bgContainer: PIXI.Container;
    private shipContainer: PIXI.Container;
    private enemiesContainer: PIXI.Container;
    private projectilesContainer: PIXI.Container;
    private effectsContainer: PIXI.Container;
    private hudWorldContainer: PIXI.Container;

    private shipSprite: PIXI.Sprite | null = null;
    private playerHealthBar: PIXI.Container | null = null;
    private playerHealthFill: PIXI.Graphics | null = null;

    private chaserTexture: PIXI.Texture | null = null;
    private shooterTexture: PIXI.Texture | null = null;
    private explosionTexture: PIXI.Texture | null = null;
    private particles: Particle[] = [];

    private isInitialized = false;
    private isDestroyed = false;

    constructor(sim: Simulation) {
        this.sim = sim;
        this.app = new PIXI.Application();
        this.bgContainer = new PIXI.Container();
        this.shipContainer = new PIXI.Container();
        this.enemiesContainer = new PIXI.Container();
        this.projectilesContainer = new PIXI.Container();
        this.effectsContainer = new PIXI.Container();
        this.hudWorldContainer = new PIXI.Container();
    }

    public async init(viewportMount: HTMLDivElement, width: number, height: number): Promise<void> {
        await this.app.init({
            width,
            height,
            backgroundColor: 0x1f5f8b,
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

        this.app.stage.addChild(this.bgContainer);
        this.app.stage.addChild(this.effectsContainer);
        this.app.stage.addChild(this.enemiesContainer);
        this.app.stage.addChild(this.projectilesContainer);
        this.app.stage.addChild(this.shipContainer);
        this.app.stage.addChild(this.hudWorldContainer);

        await this.setupSprites(width, height);
    }

    private async setupSprites(width: number, height: number): Promise<void> {
        // 1. Carregamento robusto do Cenário de Fundo (ui_scene_background)
        const possibleBgPaths = [
            '/assets/ui_scene_background.jpg',
            '/ui_scene_background.jpg',
            '/assets/png/default/ui_scene_background.png',
            '/assets/png/default/ui_scene_background.jpg',
        ];

        let bgLoaded = false;
        for (const path of possibleBgPaths) {
            try {
                const bgTexture = await PIXI.Assets.load(path);
                const bgSprite = new PIXI.Sprite(bgTexture);
                bgSprite.width = width;
                bgSprite.height = height;
                this.bgContainer.addChild(bgSprite);
                bgLoaded = true;
                break;
            } catch {
                // Tenta o próximo caminho
            }
        }

        if (!bgLoaded) {
            const fallbackSea = new PIXI.Graphics();
            fallbackSea.rect(0, 0, width, height);
            fallbackSea.fill({ color: 0x226699 });
            this.bgContainer.addChild(fallbackSea);
        }

        // 2. Texturas das Embarcações
        try {
            const playerTexture = await PIXI.Assets.load('/assets/png/default/ships/ship_3.png');
            this.chaserTexture = await PIXI.Assets.load('/assets/png/default/ships/ship_2.png');
            this.shooterTexture = await PIXI.Assets.load('/assets/png/default/ships/ship_5.png');
            this.explosionTexture = await PIXI.Assets.load('/assets/png/default/effects/explosion_1.png');

            this.shipSprite = new PIXI.Sprite(playerTexture);
            this.shipSprite.anchor.set(0.5, 0.5);
            this.shipSprite.scale.set(0.52);
            this.shipContainer.addChild(this.shipSprite);
        } catch {
            const fallback = new PIXI.Graphics();
            fallback.poly([
                { x: 26, y: 0 },
                { x: -16, y: -14 },
                { x: -22, y: 0 },
                { x: -16, y: 14 },
            ]);
            fallback.fill({ color: 0xbe123c });
            this.shipContainer.addChild(fallback);
        }

        // 3. Barra de vida do jogador independente (não gira com o navio)
        this.playerHealthBar = new PIXI.Container();

        const hbBg = new PIXI.Graphics();
        hbBg.roundRect(-21, -3, 42, 6, 2);
        hbBg.fill({ color: 0x0f172a });
        hbBg.stroke({ width: 1.5, color: 0xb45309 });

        this.playerHealthFill = new PIXI.Graphics();
        this.playerHealthFill.roundRect(-20, -2, 40, 4, 1);
        this.playerHealthFill.fill({ color: 0x22c55e });

        this.playerHealthBar.addChild(hbBg);
        this.playerHealthBar.addChild(this.playerHealthFill);
        this.hudWorldContainer.addChild(this.playerHealthBar);
    }

    public spawnExplosion(x: number, y: number): void {
        if (!this.explosionTexture) return;
        const boom = new PIXI.Sprite(this.explosionTexture);
        boom.anchor.set(0.5, 0.5);
        boom.position.set(x, y);
        boom.scale.set(0.45);
        this.effectsContainer.addChild(boom);
        this.particles.push({ sprite: boom, life: 0.35, maxLife: 0.35 });
    }

    public render(dt: number = 0.016): void {
        if (!this.isInitialized || this.isDestroyed) return;

        const ship = this.sim.state.player;

        // Navio do Jogador
        this.shipContainer.position.set(ship.position.x, ship.position.y);
        this.shipContainer.rotation = ship.rotation + Math.PI / 2;

        // Barra de vida do jogador: posicionada sempre acima do navio, horizontal (rotação zero)
        if (this.playerHealthBar && this.playerHealthFill) {
            this.playerHealthBar.position.set(ship.position.x, ship.position.y - 38);
            const ratio = Math.max(0, ship.health / ship.maxHealth);
            this.playerHealthFill.clear();
            this.playerHealthFill.roundRect(-20, -2, 40 * ratio, 4, 1);
            this.playerHealthFill.fill({ color: ratio > 0.35 ? 0x22c55e : 0xef4444 });
        }

        // Inimigos com barras de vida independentes
        this.enemiesContainer.removeChildren();
        for (const e of this.sim.state.enemies) {
            const eContainer = new PIXI.Container();
            eContainer.position.set(e.position.x, e.position.y);
            eContainer.rotation = e.rotation + Math.PI / 2;

            const texture = e.type === 'chaser' ? this.chaserTexture : this.shooterTexture;
            if (texture) {
                const sprite = new PIXI.Sprite(texture);
                sprite.anchor.set(0.5, 0.5);
                sprite.scale.set(e.type === 'chaser' ? 0.46 : 0.54);
                eContainer.addChild(sprite);
            }

            this.enemiesContainer.addChild(eContainer);

            // Barra de vida do inimigo mantida na horizontal
            const eHb = new PIXI.Container();
            eHb.position.set(e.position.x, e.position.y - 34);

            const eBarBg = new PIXI.Graphics();
            eBarBg.roundRect(-17, -2.5, 34, 5, 2);
            eBarBg.fill({ color: 0x0f172a });
            eBarBg.stroke({ width: 1, color: 0x78350f });

            const eBarFill = new PIXI.Graphics();
            const pct = Math.max(0, e.health / e.maxHealth);
            eBarFill.roundRect(-16, -1.5, 32 * pct, 3, 1);
            eBarFill.fill({ color: 0xef4444 });

            eHb.addChild(eBarBg);
            eHb.addChild(eBarFill);
            this.enemiesContainer.addChild(eHb);
        }

        // Projéteis
        this.projectilesContainer.removeChildren();
        for (const p of this.sim.state.projectiles) {
            const tail = new PIXI.Graphics();
            const originX = p.position.x - Math.cos(p.rotation) * 16;
            const originY = p.position.y - Math.sin(p.rotation) * 16;
            tail.moveTo(p.position.x, p.position.y);
            tail.lineTo(originX, originY);
            tail.stroke({
                width: p.owner === 'player' ? 2.5 : 2,
                color: p.owner === 'player' ? 0xffffff : 0xfca5a5,
                alpha: 0.45,
            });

            const bullet = new PIXI.Graphics();
            bullet.circle(p.position.x, p.position.y, p.radius);
            bullet.fill({ color: p.owner === 'player' ? 0x1e293b : 0xb91c1c });
            bullet.stroke({ width: 1, color: p.owner === 'player' ? 0x94a3b8 : 0xf87171 });

            this.projectilesContainer.addChild(tail);
            this.projectilesContainer.addChild(bullet);
        }

        // Partículas de explosão
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const part = this.particles[i];
            part.life -= dt;
            part.sprite.alpha = part.life / part.maxLife;
            part.sprite.scale.x += dt * 0.35;
            part.sprite.scale.y += dt * 0.35;
            if (part.life <= 0) {
                this.effectsContainer.removeChild(part.sprite);
                part.sprite.destroy();
                this.particles.splice(i, 1);
            }
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