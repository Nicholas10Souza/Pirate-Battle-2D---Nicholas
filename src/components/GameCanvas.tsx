import React, { useEffect, useRef, useState } from 'react';
import { Simulation } from '../game/Simulation';
import { GameRenderer } from '../game/Renderer';
import { SoundManager } from '../game/SoundManager';
import { useGame } from '../game/GameContext';
import { PauseModal, ResultModal } from './UIOverlays';
import { saveMatchResult } from '../services/api';

export const GameCanvas: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { config, screen, setScreen, setLastMatchResult } = useGame();
    const [hudStats, setHudStats] = useState({ health: 100, time: config.sessionTime, score: 0 });

    const simRef = useRef<Simulation | null>(null);
    const gameOverHandledRef = useRef<boolean>(false);

    const keysRef = useRef({
        forward: false,
        reverse: false,
        left: false,
        right: false,
    });

    useEffect(() => {
        if (!containerRef.current) return;

        const width = 960;
        const height = 540;
        const sim = new Simulation(width, height, config);
        simRef.current = sim;
        const renderer = new GameRenderer(sim);
        const sound = SoundManager.getInstance();

        sound.play('ocean_ambience_loop', 0.25);
        sound.play('game_start', 0.7);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (sim.state.isGameOver) return;
                const nextPaused = !sim.state.isPaused;
                sim.setPaused(nextPaused);
                setScreen(nextPaused ? 'PAUSED' : 'PLAYING');
                sound.play(nextPaused ? 'game_pause' : 'game_resume', 0.6);
                return;
            }

            if (sim.state.isPaused || sim.state.isGameOver) return;

            if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.forward = true;
            if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.reverse = true;
            if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = true;
            if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = true;

            if (['Space', 'KeyJ'].includes(e.code)) {
                if (sim.fireFront()) sound.play('cannon_fire_1', 0.8);
            }

            if (['KeyQ', 'KeyU'].includes(e.code)) {
                if (sim.fireBroadside('left')) sound.play('cannon_broadside', 0.9);
            }

            if (['KeyE', 'KeyI'].includes(e.code)) {
                if (sim.fireBroadside('right')) sound.play('cannon_broadside', 0.9);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.forward = false;
            if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.reverse = false;
            if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = false;
            if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        let isRunning = true;
        let lastTime = performance.now();
        let hudTimer = 0;

        async function start() {
            if (!containerRef.current) return;
            await renderer.init(containerRef.current, width, height);

            function gameLoop(now: number) {
                if (!isRunning) return;
                const dt = Math.min((now - lastTime) / 1000, 0.1);
                lastTime = now;

                sim.update(dt, keysRef.current, {
                    onEnemyDefeated: () => sound.play('ship_explosion_1', 0.9),
                    onPlayerHit: () => sound.play('ship_wood_hit_1', 0.8),
                });

                renderer.render(dt);

                hudTimer += dt;
                if (hudTimer >= 0.25) {
                    hudTimer = 0;
                    setHudStats({
                        health: Math.round(sim.state.player.health),
                        time: Math.ceil(sim.state.timeRemaining),
                        score: sim.state.score,
                    });

                    if (sim.state.isGameOver && !gameOverHandledRef.current) {
                        gameOverHandledRef.current = true;
                        const elapsed = Math.round(config.sessionTime - sim.state.timeRemaining);

                        setLastMatchResult({
                            score: sim.state.score,
                            reason: sim.state.gameOverReason,
                            timeElapsed: elapsed,
                        });

                        saveMatchResult(sim.state.score, elapsed, sim.state.gameOverReason);
                        sound.play(sim.state.gameOverReason === 'time_up' ? 'game_complete' : 'game_over', 0.8);
                        setScreen('GAME_OVER');
                    }
                }

                requestAnimationFrame(gameLoop);
            }

            requestAnimationFrame(gameLoop);
        }

        start();

        return () => {
            isRunning = false;
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            sound.stop('ocean_ambience_loop');
            renderer.destroy();
        };
    }, [config]);

    const resumeGame = () => {
        if (simRef.current) simRef.current.setPaused(false);
        setScreen('PLAYING');
    };

    const restartGame = () => {
        gameOverHandledRef.current = false;
        if (simRef.current) simRef.current.reset();
        setScreen('PLAYING');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const triggerFrontFire = () => {
        if (simRef.current?.fireFront()) SoundManager.getInstance().play('cannon_fire_1', 0.8);
    };

    const triggerBroadside = (side: 'left' | 'right') => {
        if (simRef.current?.fireBroadside(side)) SoundManager.getInstance().play('cannon_broadside', 0.9);
    };

    const healthRatio = Math.max(0, Math.min(1, hudStats.health / MAX_HEALTH));
    const healthFill = healthRatio > 0.6 ? 'green' : healthRatio > 0.3 ? 'amber' : 'red';
    const fillClipRight = 100 - ((30 + 196 * healthRatio) / 256) * 100;

    const press = (key: 'left' | 'right' | 'forward') => (down: boolean) => {
        keysRef.current[key] = down;
    };

    return (
        <div
            style={{
                position: 'relative',
                width: 960,
                height: 540,
                margin: '0 auto',
                boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
                borderRadius: 12,
                overflow: 'hidden',
                border: '3px solid #334155',
                userSelect: 'none',
                touchAction: 'none',
            }}
        >
            {/* Canvas PixiJS */}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {/* HUD superior */}
            <div
                style={{
                    position: 'absolute',
                    top: 12,
                    left: 16,
                    right: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 20,
                    pointerEvents: 'none',
                }}
            >
                {/* Barra de vida */}
                <div style={{ position: 'relative', width: 224, height: 42, marginLeft: 14 }}>
                    <img src={`${UI}/hud/health_frame.png`} alt="" style={fillParent} />
                    <img
                        src={`${UI}/hud/health_fill_${healthFill}.png`}
                        alt=""
                        style={{ ...fillParent, clipPath: `inset(0 ${fillClipRight}% 0 0)`, transition: 'clip-path 0.15s ease' }}
                    />
                    <img
                        src={`${UI}/hud/icon_heart.png`}
                        alt="Vida"
                        style={{ position: 'absolute', left: -16, top: -4, width: 44, height: 44 }}
                    />
                    <span style={{ ...hudText, ...fillParent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {hudStats.health} / {MAX_HEALTH}
                    </span>
                </div>

                {/* Pontuação, tempo e pausa */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CounterPanel icon="icon_score.png" value={String(hudStats.score)} />
                    <CounterPanel icon="icon_time.png" value={formatTime(hudStats.time)} />
                    <RoundButton
                        icon="icon_pause.png"
                        size={40}
                        title="Pausar (P / Esc)"
                        onPress={() => {
                            if (simRef.current) simRef.current.setPaused(true);
                            setScreen('PAUSED');
                        }}
                    />
                </div>
            </div>

            {/* Controles de navegação (inferior esquerdo) */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 24,
                    left: 24,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 10,
                    zIndex: 20,
                }}
            >
                <RoundButton icon="icon_turn_left.png" size={48} title="Leme bombordo (A)" hold={press('left')} />
                <div style={{ marginBottom: 16 }}>
                    <RoundButton icon="icon_forward.png" size={56} title="Velas (W)" hold={press('forward')} />
                </div>
                <RoundButton icon="icon_turn_right.png" size={48} title="Leme estibordo (D)" hold={press('right')} />
            </div>

            {/* Controles de artilharia (inferior direito) */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    zIndex: 20,
                }}
            >
                <RoundButton icon="icon_fire_front.png" size={54} title="Disparo frontal (Espaço / J)" onPress={triggerFrontFire} />
                <div style={{ display: 'flex', gap: 12 }}>
                    <RoundButton icon="icon_fire_left.png" size={48} title="Bordada esquerda (Q / U)" onPress={() => triggerBroadside('left')} />
                    <RoundButton icon="icon_fire_right.png" size={48} title="Bordada direita (E / I)" onPress={() => triggerBroadside('right')} />
                </div>
            </div>

            {/* Marca d'água */}
            <img
                src="/logo_jungle_gaming.svg"
                alt="Jungle Gaming"
                style={{
                    position: 'absolute',
                    bottom: 14,
                    right: 180,
                    height: 22,
                    width: 'auto',
                    opacity: 0.85,
                    pointerEvents: 'none',
                    zIndex: 10,
                    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.8))',
                }}
            />

            {/* Modais sobrepostos */}
            {screen === 'PAUSED' && (
                <div style={overlayStyle}>
                    <PauseModal onResume={resumeGame} />
                </div>
            )}

            {screen === 'GAME_OVER' && (
                <div style={overlayStyle}>
                    <ResultModal onRestart={restartGame} />
                </div>
            )}
        </div>
    );
};

const UI = '/assets/png/default/ui';
const MAX_HEALTH = 100;

const fillParent: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    display: 'block',
};

const hudText: React.CSSProperties = {
    color: '#fff7e6',
    fontSize: '0.8rem',
    fontWeight: 800,
    textShadow: '0 1px 3px #000',
};

const CounterPanel: React.FC<{ icon: string; value: string }> = ({ icon, value }) => (
    <div style={{ position: 'relative', width: 112, height: 39 }}>
        <img src={`${UI}/hud/counter_panel.png`} alt="" style={fillParent} />
        <img src={`${UI}/hud/${icon}`} alt="" style={{ position: 'absolute', left: 10, top: 5, width: 28, height: 28 }} />
        <span
            style={{
                ...hudText,
                position: 'absolute',
                left: 42,
                right: 12,
                top: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.95rem',
            }}
        >
            {value}
        </span>
    </div>
);

interface RoundButtonProps {
    icon: string;
    size: number;
    title: string;

    onPress?: () => void;

    hold?: (down: boolean) => void;
}

const RoundButton: React.FC<RoundButtonProps> = ({ icon, size, title, onPress, hold }) => {
    const [state, setState] = useState<'normal' | 'hover' | 'pressed'>('normal');

    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setState('pressed');
                hold?.(true);
                onPress?.();
            }}
            onPointerUp={() => {
                setState('hover');
                hold?.(false);
            }}
            onPointerCancel={() => {
                setState('normal');
                hold?.(false);
            }}
            onPointerEnter={() => setState((s) => (s === 'pressed' ? s : 'hover'))}
            onPointerLeave={() => {
                setState('normal');
                hold?.(false);
            }}
            style={{
                width: size,
                height: size,
                padding: 0,
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                background: `transparent url('${UI}/controls/button_round_${state}.png') no-repeat center / contain`,
                touchAction: 'none',
                pointerEvents: 'auto',
            }}
        >
            <img
                src={`${UI}/controls/${icon}`}
                alt=""
                draggable={false}
                style={{
                    position: 'absolute',
                    inset: '18%',
                    width: '64%',
                    height: '64%',
                    pointerEvents: 'none',
                    transform: state === 'pressed' ? 'translateY(1px)' : undefined,
                }}
            />
        </button>
    );
};

const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
};