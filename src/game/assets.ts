import * as PIXI from 'pixi.js';

const BASE = '/assets/png/default';

export const path = {
    tile: (id: number) => `${BASE}/tiles/tile_${id}.png`,
    ship: (id: number) => `${BASE}/ships/ship_${id}.png`,
    shipPart: (name: string) => `${BASE}/ship_parts/${name}.png`,
    effect: (name: string) => `${BASE}/effects/${name}.png`,
    hud: (name: string) => `${BASE}/ui/hud/${name}.png`,
    image: (key: string) => {
        if (key.startsWith('tile_')) return `${BASE}/tiles/${key}.png`;
        if (key.startsWith('dinghy_')) return `${BASE}/ships/${key}.png`;
        return `${BASE}/ship_parts/${key}.png`;
    },
};

export class TextureStore {
    private readonly textures = new Map<string, PIXI.Texture>();
    private readonly missing = new Set<string>();

    public async load(paths: Iterable<string>): Promise<void> {
        const pending = [...new Set(paths)].filter((p) => !this.textures.has(p));
        await Promise.all(
            pending.map(async (p) => {
                try {
                    this.textures.set(p, await PIXI.Assets.load<PIXI.Texture>(p));
                } catch (err) {
                    console.error('falha ao carregar', p, err);
                }
            })
        );
    }

    public get(p: string): PIXI.Texture {
        const texture = this.textures.get(p);
        if (texture) return texture;
        if (!this.missing.has(p)) {
            this.missing.add(p);
            console.warn('textura ausente:', p);
        }
        return PIXI.Texture.EMPTY;
    }

    public replace(p: string, texture: PIXI.Texture): void {
        this.textures.set(p, texture);
    }
}