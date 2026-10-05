export interface Vector2 {
    x: number;
    y: number;
}

export interface Entity {
    id: string;
    position: Vector2;
    velocity: Vector2;
    rotation: number;
    radius: number;
}

export interface ShipEntity extends Entity {
    health: number;
    maxHealth: number;
    speed: number;
    maxSpeed: number;
    turnSpeed: number;
}

export interface ProjectileEntity extends Entity {
    damage: number;
    lifeTime: number;
    owner: 'player' | 'enemy';
}

export interface IslandEntity {
    id: string;
    position: Vector2;
    radius: number;
}

export type EnemyType = 'chaser' | 'shooter';

export interface EnemyEntity extends ShipEntity {
    type: EnemyType;
    shootCooldown: number;
    shootInterval: number;
    detectionRange: number;
}

export interface GameConfig {
    sessionTime: number;
    spawnInterval: number;
    playerMaxSpeed: number;
    playerTurnSpeed: number;
    playerHealth: number;
    projectileSpeed: number;
}

export interface GameState {
    player: ShipEntity;
    enemies: EnemyEntity[];
    projectiles: ProjectileEntity[];
    islands: IslandEntity[];
    score: number;
    timeRemaining: number;
    isPaused: boolean;
    isGameOver: boolean;
    gameOverReason: 'time_up' | 'defeated' | null;
}