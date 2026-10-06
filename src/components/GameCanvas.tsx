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

    const [fit, setFit] = useState(1);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const update = () => {
            if (!wrapperRef.current) return;
            const parent = wrapperRef.current.parentElement;
            if (parent) {
                setFit(Math.min(parent.clientWidth / 960, parent.clientHeight / 540));
            } else {
                setFit(Math.min(window.innerWidth / 960, window.innerHeight / 540));
            }
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

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
            ref={wrapperRef}
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
                flexShrink: 0,
                transform: `scale(${fit})`,
                transformOrigin: 'center',
            }}
        >
            {/* Canvas PixiJS */}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {/* Vida */}
            <img src={`${UI}/hud/icon_heart.png`} alt="Vida" style={{ ...abs(15, 18), width: 29.5, height: 29.5, zIndex: 20 }} />
            <div style={{ ...abs(49, 16.5), width: 172, height: 32.3, zIndex: 20, pointerEvents: 'none' }}>
                <img src={`${UI}/hud/health_frame.png`} alt="" style={fillParent} />
                <img
                    src={`${UI}/hud/health_fill_${healthFill}.png`}
                    alt=""
                    style={{ ...fillParent, clipPath: `inset(0 ${fillClipRight}% 0 0)`, transition: 'clip-path 0.15s ease' }}
                />
                <span style={{ ...hudText, position: 'absolute', left: 20, width: 132, top: 0, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {hudStats.health} / {MAX_HEALTH}
                </span>
            </div>

            {/* Pontuação, tempo e pausa */}
            <CounterPanel left={705.4} icon="icon_score.png" value={String(hudStats.score)} />
            <CounterPanel left={807.3} icon="icon_time.png" value={formatTime(hudStats.time)} />
            <div style={{ ...abs(908.7, 15), zIndex: 20 }}>
                <RoundButton
                    icon="icon_pause.png"
                    size={36}
                    title="Pausar (P / Esc)"
                    onPress={() => {
                        if (simRef.current) simRef.current.setPaused(true);
                        setScreen('PAUSED');
                    }}
                />
            </div>

            {/* Controles de navegação */}
            <div style={{ ...absB(15.5, 28), zIndex: 20 }}>
                <RoundButton icon="icon_turn_left.png" size={40} title="Leme bombordo (A)" hold={press('left')} />
            </div>
            <div style={{ ...absB(60, 52), zIndex: 20 }}>
                <RoundButton icon="icon_forward.png" size={40} title="Velas (W)" hold={press('forward')} />
            </div>
            <div style={{ ...absB(104.8, 28), zIndex: 20 }}>
                <RoundButton icon="icon_turn_right.png" size={40} title="Leme estibordo (D)" hold={press('right')} />
            </div>

            {/* Controles de artilharia */}
            <div style={{ ...absB(860, 52), zIndex: 20 }}>
                <RoundButton icon="icon_fire_front.png" size={40} title="Disparo frontal (Espaço / J)" onPress={triggerFrontFire} />
            </div>
            <div style={{ ...absB(815.5, 28), zIndex: 20 }}>
                <RoundButton icon="icon_fire_left.png" size={40} title="Bordada esquerda (Q / U)" onPress={() => triggerBroadside('left')} />
            </div>
            <div style={{ ...absB(904.8, 28), zIndex: 20 }}>
                <RoundButton icon="icon_fire_right.png" size={40} title="Bordada direita (E / I)" onPress={() => triggerBroadside('right')} />
            </div>

            {/* Marca d'água: o svg tem margem transparente, então recorto só o desenho */}
            <div
                style={{
                    ...absB(847.5, 119),
                    width: 65.6,
                    height: 20.8,
                    backgroundImage: "url('/logo_jungle_gaming.svg')",
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '76.16px 38.08px',
                    backgroundPosition: '-5.58px -8.37px',
                    pointerEvents: 'none',
                    zIndex: 10,
                }}
            />

            {/* Modais */}
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

const abs = (left: number, top: number): React.CSSProperties => ({ position: 'absolute', left, top });
const absB = (left: number, bottom: number): React.CSSProperties => ({ position: 'absolute', left, bottom });

const fillParent: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    display: 'block',
};

const hudText: React.CSSProperties = {
    color: '#fff7e6',
    fontSize: '10.5px',
    fontWeight: 800,
    textShadow: '0 1px 2px #000',
};

const CounterPanel: React.FC<{ left: number; icon: string; value: string }> = ({ left, icon, value }) => (
    <div style={{ ...abs(left, 16.2), width: 93.3, height: 32.6, zIndex: 20, pointerEvents: 'none' }}>
        <img src={`${UI}/hud/counter_panel.png`} alt="" style={fillParent} />
        <div
            style={{
                position: 'absolute',
                left: 2.3,
                right: 2.3,
                top: 3.5,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
            }}
        >
            <img src={`${UI}/hud/${icon}`} alt="" style={{ width: 20, height: 20 }} />
            <span style={{ ...hudText, fontSize: '14px', lineHeight: 1 }}>{value}</span>
        </div>
    </div>
);

interface RoundButtonProps {
    icon: string;
    size: number;
    title: string;
    // tiros, pausa
    onPress?: () => void;
    // leme e velas
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
                display: 'block',
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
                    inset: '30%',
                    width: '40%',
                    height: '40%',
                    pointerEvents: 'none',
                    transform: state === 'pressed' ? 'translateY(0.5px)' : undefined,
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