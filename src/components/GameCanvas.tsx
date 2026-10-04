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

        // Resolução nativa 16:9 alinhada com os mockups
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
            }}
        >
            {/* HUD Superior Oficial */}
            <div
                style={{
                    position: 'absolute',
                    top: 14,
                    left: 18,
                    right: 18,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 20,
                    pointerEvents: 'none',
                }}
            >
                {/* Barra de Vida Superior Esquerda */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '2px solid #b45309',
                        borderRadius: '24px',
                        padding: '4px 14px 4px 8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.7)',
                    }}
                >
                    <span style={{ fontSize: '1.2rem', marginRight: '6px' }}>❤️</span>
                    <div
                        style={{
                            position: 'relative',
                            width: '120px',
                            height: '14px',
                            background: '#0f172a',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #475569',
                        }}
                    >
                        <div
                            style={{
                                width: `${Math.max(0, hudStats.health)}%`,
                                height: '100%',
                                background:
                                    hudStats.health > 35
                                        ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                        : 'linear-gradient(90deg, #ef4444, #dc2626)',
                                transition: 'width 0.15s ease',
                            }}
                        />
                    </div>
                    <span
                        style={{
                            color: '#f8fafc',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            marginLeft: '8px',
                            textShadow: '0 1px 3px #000',
                        }}
                    >
                        {hudStats.health} / 100
                    </span>
                </div>

                {/* Pontuação, Tempo e Pausa */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(15, 23, 42, 0.85)',
                            border: '2px solid #b45309',
                            borderRadius: '20px',
                            padding: '4px 14px',
                            color: '#fef08a',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
                        }}
                    >
                        <span style={{ color: '#facc15' }}>★</span>
                        <span>{hudStats.score}</span>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(15, 23, 42, 0.85)',
                            border: '2px solid #b45309',
                            borderRadius: '20px',
                            padding: '4px 14px',
                            color: '#f8fafc',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
                        }}
                    >
                        <span>🕒</span>
                        <span>{formatTime(hudStats.time)}</span>
                    </div>

                    <button
                        onClick={() => {
                            if (simRef.current) simRef.current.setPaused(true);
                            setScreen('PAUSED');
                        }}
                        style={{
                            pointerEvents: 'auto',
                            width: '40px',
                            height: '40px',
                            border: 'none',
                            background: "transparent url('/assets/png/default/ui/controls/button_round_normal.png') no-repeat center/contain",
                            cursor: 'pointer',
                            color: '#fef3c7',
                            fontWeight: 900,
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textShadow: '0 2px 4px #000',
                        }}
                    >
                        ⏸
                    </button>
                </div>
            </div>

            {/* Canvas PixiJS */}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {/* Controles de Leme/Vela (Inferior Esquerdo) */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 24,
                    left: 24,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '10px',
                    zIndex: 20,
                }}
            >
                <button
                    onMouseDown={() => (keysRef.current.left = true)}
                    onMouseUp={() => (keysRef.current.left = false)}
                    onTouchStart={() => (keysRef.current.left = true)}
                    onTouchEnd={() => (keysRef.current.left = false)}
                    style={roundButtonStyle}
                    title="Leme Bombordo (A)"
                >
                    ↶
                </button>

                <button
                    onMouseDown={() => (keysRef.current.forward = true)}
                    onMouseUp={() => (keysRef.current.forward = false)}
                    onTouchStart={() => (keysRef.current.forward = true)}
                    onTouchEnd={() => (keysRef.current.forward = false)}
                    style={{ ...roundButtonStyle, width: '56px', height: '56px', marginBottom: '16px' }}
                    title="Velas (W)"
                >
                    ↑
                </button>

                <button
                    onMouseDown={() => (keysRef.current.right = true)}
                    onMouseUp={() => (keysRef.current.right = false)}
                    onTouchStart={() => (keysRef.current.right = true)}
                    onTouchEnd={() => (keysRef.current.right = false)}
                    style={roundButtonStyle}
                    title="Leme Estibordo (D)"
                >
                    ↷
                </button>
            </div>

            {/* Controles de Artilharia (Inferior Direito) */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 20,
                }}
            >
                <button
                    onClick={triggerFrontFire}
                    style={{ ...roundButtonStyle, width: '54px', height: '54px' }}
                    title="Disparo Frontal (Espaço / J)"
                >
                    🎯
                </button>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => triggerBroadside('left')}
                        style={roundButtonStyle}
                        title="Bordoada Esquerda (Q / U)"
                    >
                        ◀◀
                    </button>
                    <button
                        onClick={() => triggerBroadside('right')}
                        style={roundButtonStyle}
                        title="Bordoada Direita (E / I)"
                    >
                        ▶▶
                    </button>
                </div>
            </div>

            {/* Watermark */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 175,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: 0.75,
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    letterSpacing: '1px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                    zIndex: 10,
                }}
            >
                <span>🐵</span> JUNGLE GAMING
            </div>

            {/* Modais Sobrepostos */}
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

const roundButtonStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    border: 'none',
    background: "transparent url('/assets/png/default/ui/controls/button_round_normal.png') no-repeat center/contain",
    color: '#fef3c7',
    fontSize: '1.25rem',
    fontWeight: 900,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textShadow: '0 2px 4px rgba(0,0,0,0.9)',
    outline: 'none',
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