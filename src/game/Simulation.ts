import { GameConfig, GameState, ProjectileEntity, EnemyEntity } from './types';

export class Simulation {
    public state: GameState;
    public config: GameConfig;
    private width: number;
    private height: number;
    private spawnTimer: number = 0;
    private frontCannonCooldown: number = 0;
    private leftCannonCooldown: number = 0;
    private rightCannonCooldown: number = 0;

    constructor(width: number, height: number, customConfig?: Partial<GameConfig>) {
        this.width = width;
        this.height = height;

        this.config = {
            sessionTime: customConfig?.sessionTime ?? 120,
            spawnInterval: customConfig?.spawnInterval ?? 3.0,
            playerMaxSpeed: 230,
            playerTurnSpeed: 3.4,
            playerHealth: 100,
            projectileSpeed: 440,
        };

        this.state = this.getInitialState();
    }

    private getInitialState(): GameState {
        return {
            player: {
                id: 'player',
                position: { x: this.width / 2, y: this.height / 2 },
                velocity: { x: 0, y: 0 },
                rotation: 0,
                radius: 26,
                speed: 0,
                maxSpeed: this.config.playerMaxSpeed,
                turnSpeed: this.config.playerTurnSpeed,
                health: this.config.playerHealth,
                maxHealth: this.config.playerHealth,
            },
            enemies: [],
            projectiles: [],
            islands: [
                // Fortaleza e terra no canto superior esquerdo
                { id: 'fort-1', position: { x: 190, y: 140 }, radius: 175 },
                { id: 'fort-pier', position: { x: 330, y: 90 }, radius: 110 },
                { id: 'fort-sand', position: { x: 190, y: 320 }, radius: 105 },

                // Ilha e litoral no canto inferior e direito
                { id: 'island-bottom-1', position: { x: 500, y: 690 }, radius: 170 },
                { id: 'island-bottom-2', position: { x: 820, y: 680 }, radius: 180 },
                { id: 'island-bottom-point', position: { x: 890, y: 550 }, radius: 115 },
            ],
            score: 0,
            timeRemaining: this.config.sessionTime,
            isPaused: false,
            isGameOver: false,
            gameOverReason: null,
        };
    }

    public update(
        dt: number,
        input: { forward: boolean; reverse: boolean; left: boolean; right: boolean },
        callbacks?: { onEnemyDefeated?: () => void; onPlayerHit?: () => void }
    ): void {
        if (this.state.isPaused || this.state.isGameOver) return;

        // 1. Cronômetro da sessão
        this.state.timeRemaining -= dt;
        if (this.state.timeRemaining <= 0) {
            this.state.timeRemaining = 0;
            this.state.isGameOver = true;
            this.state.gameOverReason = 'time_up';
            return;
        }

        // 2. Cooldowns de disparo do jogador
        if (this.frontCannonCooldown > 0) this.frontCannonCooldown -= dt;
        if (this.leftCannonCooldown > 0) this.leftCannonCooldown -= dt;
        if (this.rightCannonCooldown > 0) this.rightCannonCooldown -= dt;

        const ship = this.state.player;

        // 3. Movimentação do navio do jogador com inércia hidrodinâmica
        if (input.left) ship.rotation -= ship.turnSpeed * dt;
        if (input.right) ship.rotation += ship.turnSpeed * dt;

        if (input.forward) {
            ship.speed = Math.min(ship.speed + 200 * dt, ship.maxSpeed);
        } else if (input.reverse) {
            ship.speed = Math.max(ship.speed - 140 * dt, -ship.maxSpeed * 0.35);
        } else {
            ship.speed *= Math.pow(0.28, dt);
        }

        const nextX = ship.position.x + Math.cos(ship.rotation) * ship.speed * dt;
        const nextY = ship.position.y + Math.sin(ship.rotation) * ship.speed * dt;

        let blocked = false;
        for (const island of this.state.islands) {
            if (Math.hypot(nextX - island.position.x, nextY - island.position.y) < ship.radius + island.radius) {
                blocked = true;
                ship.speed = -ship.speed * 0.25;
                break;
            }
        }

        if (!blocked) {
            ship.position.x = Math.max(ship.radius, Math.min(this.width - ship.radius, nextX));
            ship.position.y = Math.max(ship.radius, Math.min(this.height - ship.radius, nextY));
        }

        // 4. Enemy spawning cycle
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.config.spawnInterval && this.state.enemies.length < 5) {
            this.spawnTimer = 0;
            this.spawnEnemy();
        }

        // 5. Enemy AI and updates
        for (let i = this.state.enemies.length - 1; i >= 0; i--) {
            const e = this.state.enemies[i];
            const dx = ship.position.x - e.position.x;
            const dy = ship.position.y - e.position.y;
            const dist = Math.hypot(dx, dy);
            const targetAngle = Math.atan2(dy, dx);

            // Rotação suave do inimigo em direção ao alvo
            let angleDiff = targetAngle - e.rotation;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            e.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), e.turnSpeed * dt);

            if (e.type === 'chaser') {
                // Chaser moves forward to ram
                e.speed = e.maxSpeed;
                e.position.x += Math.cos(e.rotation) * e.speed * dt;
                e.position.y += Math.sin(e.rotation) * e.speed * dt;

                // Ramming damage to player
                if (dist < ship.radius + e.radius) {
                    ship.health -= 25;
                    e.health = 0; // Se destrói ao abalroar
                    callbacks?.onPlayerHit?.();
                }
            } else if (e.type === 'shooter') {
                // Shooter maintains safe distance and fires
                if (dist > 280) {
                    e.speed = e.maxSpeed;
                } else if (dist < 180) {
                    e.speed = -e.maxSpeed * 0.5;
                } else {
                    e.speed *= Math.pow(0.2, dt);
                }

                e.position.x += Math.cos(e.rotation) * e.speed * dt;
                e.position.y += Math.sin(e.rotation) * e.speed * dt;

                e.shootCooldown -= dt;
                if (e.shootCooldown <= 0 && dist <= e.detectionRange) {
                    e.shootCooldown = e.shootInterval;
                    this.fireEnemyCannon(e);
                }
            }

            // Remove defeated enemies
            if (e.health <= 0) {
                this.state.enemies.splice(i, 1);
                this.state.score += e.type === 'chaser' ? 2 : 3;
                callbacks?.onEnemyDefeated?.();
            }
        }

        // 6. Projectile updates and collisions
        for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
            const p = this.state.projectiles[i];
            p.lifeTime -= dt;
            p.position.x += p.velocity.x * dt;
            p.position.y += p.velocity.y * dt;

            let hit = false;

            // Projectile collision with islands
            for (const island of this.state.islands) {
                if (Math.hypot(p.position.x - island.position.x, p.position.y - island.position.y) < p.radius + island.radius) {
                    hit = true;
                    break;
                }
            }

            // Player projectile hitting enemies
            if (!hit && p.owner === 'player') {
                for (const e of this.state.enemies) {
                    if (Math.hypot(p.position.x - e.position.x, p.position.y - e.position.y) < p.radius + e.radius) {
                        e.health -= p.damage;
                        hit = true;
                        break;
                    }
                }
            }

            // Enemy projectile hitting player
            if (!hit && p.owner === 'enemy') {
                if (Math.hypot(p.position.x - ship.position.x, p.position.y - ship.position.y) < p.radius + ship.radius) {
                    ship.health -= p.damage;
                    hit = true;
                    callbacks?.onPlayerHit?.();
                }
            }

            if (
                hit ||
                p.lifeTime <= 0 ||
                p.position.x < 0 || p.position.x > this.width ||
                p.position.y < 0 || p.position.y > this.height
            ) {
                this.state.projectiles.splice(i, 1);
            }
        }

        // 7. Player defeat
        if (ship.health <= 0) {
            ship.health = 0;
            this.state.isGameOver = true;
            this.state.gameOverReason = 'defeated';
        }
    }

    private spawnEnemy(): void {
        const isChaser = Math.random() > 0.45;
        // Spawn pelas bordas da arena
        const edge = Math.floor(Math.random() * 4);
        let x = 0;
        let y = 0;

        if (edge === 0) { x = Math.random() * this.width; y = -30; }
        else if (edge === 1) { x = this.width + 30; y = Math.random() * this.height; }
        else if (edge === 2) { x = Math.random() * this.width; y = this.height + 30; }
        else { x = -30; y = Math.random() * this.height; }

        this.state.enemies.push({
            id: `enemy-${Date.now()}-${Math.random()}`,
            type: isChaser ? 'chaser' : 'shooter',
            position: { x, y },
            velocity: { x: 0, y: 0 },
            rotation: 0,
            radius: isChaser ? 22 : 28,
            speed: 0,
            maxSpeed: isChaser ? 155 : 105,
            turnSpeed: isChaser ? 2.5 : 1.8,
            health: isChaser ? 45 : 75,
            maxHealth: isChaser ? 45 : 75,
            shootCooldown: 1.5,
            shootInterval: 2.2,
            detectionRange: 420,
        });
    }

    private fireEnemyCannon(e: EnemyEntity): void {
        const speed = this.config.projectileSpeed * 0.75;
        this.state.projectiles.push({
            id: `${Date.now()}-${Math.random()}`,
            position: {
                x: e.position.x + Math.cos(e.rotation) * (e.radius + 6),
                y: e.position.y + Math.sin(e.rotation) * (e.radius + 6),
            },
            velocity: {
                x: Math.cos(e.rotation) * speed,
                y: Math.sin(e.rotation) * speed,
            },
            rotation: e.rotation,
            radius: 4,
            damage: 15,
            lifeTime: 1.6,
            owner: 'enemy',
        });
    }

    public fireFront(): boolean {
        if (this.state.isPaused || this.state.isGameOver || this.frontCannonCooldown > 0) return false;
        const ship = this.state.player;
        const speed = this.config.projectileSpeed;
        const offset = ship.radius + 8;

        this.state.projectiles.push({
            id: `${Date.now()}-${Math.random()}`,
            position: {
                x: ship.position.x + Math.cos(ship.rotation) * offset,
                y: ship.position.y + Math.sin(ship.rotation) * offset,
            },
            velocity: {
                x: Math.cos(ship.rotation) * speed,
                y: Math.sin(ship.rotation) * speed,
            },
            rotation: ship.rotation,
            radius: 5,
            damage: 35,
            lifeTime: 1.5,
            owner: 'player',
        });

        this.frontCannonCooldown = 0.4;
        return true;
    }

    public fireBroadside(side: 'left' | 'right'): boolean {
        if (this.state.isPaused || this.state.isGameOver) return false;
        if (side === 'left' && this.leftCannonCooldown > 0) return false;
        if (side === 'right' && this.rightCannonCooldown > 0) return false;

        const ship = this.state.player;
        const fireAngle = side === 'left' ? ship.rotation - Math.PI / 2 : ship.rotation + Math.PI / 2;
        const forwardAngle = ship.rotation;
        const speed = this.config.projectileSpeed * 0.95;

        [-18, 0, 18].forEach((spacing) => {
            this.state.projectiles.push({
                id: `${Date.now()}-${Math.random()}`,
                position: {
                    x: ship.position.x + Math.cos(fireAngle) * (ship.radius * 0.65) + Math.cos(forwardAngle) * spacing,
                    y: ship.position.y + Math.sin(fireAngle) * (ship.radius * 0.65) + Math.sin(forwardAngle) * spacing,
                },
                velocity: {
                    x: Math.cos(fireAngle) * speed,
                    y: Math.sin(fireAngle) * speed,
                },
                rotation: fireAngle,
                radius: 4.5,
                damage: 25,
                lifeTime: 1.25,
                owner: 'player',
            });
        });

        if (side === 'left') this.leftCannonCooldown = 0.75;
        else this.rightCannonCooldown = 0.75;

        return true;
    }

    public setPaused(paused: boolean): void {
        this.state.isPaused = paused;
    }

    public reset(): void {
        this.state = this.getInitialState();
        this.spawnTimer = 0;
    }
}