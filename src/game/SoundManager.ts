export class SoundManager {
    private static instance: SoundManager;
    private soundBank: Map<string, HTMLAudioElement> = new Map();
    private muted: boolean = false;
    private masterVolume: number = 0.6;

    private constructor() {
        this.initAudioPool();
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    private initAudioPool(): void {
        const assetNames = [
            'cannon_broadside', 'cannon_fire_1', 'cannon_fire_2', 'cannon_fire_3',
            'cannonball_water_hit_1', 'cannonball_water_hit_2', 'game_complete',
            'game_over', 'game_pause', 'game_resume', 'game_start', 'health_low',
            'ocean_ambience_loop', 'score_point', 'ship_collision', 'ship_explosion_1',
            'ship_explosion_2', 'ship_sailing_loop', 'ship_sinking', 'ship_wood_hit_1',
            'ship_wood_hit_2', 'time_warning', 'ui_back', 'ui_click', 'ui_close',
            'ui_hover', 'ui_open'
        ];

        assetNames.forEach((file) => {
            const audio = new Audio(`/assets/sounds/${file}.wav`);
            audio.preload = 'auto';
            if (file.includes('loop')) {
                audio.loop = true;
            }
            this.soundBank.set(file, audio);
        });
    }

    public play(key: string, volumeScale: number = 1.0): void {
        if (this.muted) return;
        const clip = this.soundBank.get(key);
        if (!clip) return;

        clip.volume = Math.min(1.0, this.masterVolume * volumeScale);
        clip.currentTime = 0;
        clip.play().catch(() => {
            // Browsers block autoplay prior to first gesture
        });
    }

    public stop(key: string): void {
        const clip = this.soundBank.get(key);
        if (clip) {
            clip.pause();
            clip.currentTime = 0;
        }
    }

    public toggleMute(): boolean {
        this.muted = !this.muted;
        if (this.muted) {
            this.stop('ocean_ambience_loop');
            this.stop('ship_sailing_loop');
        } else {
            this.play('ocean_ambience_loop', 0.4);
        }
        return this.muted;
    }
}