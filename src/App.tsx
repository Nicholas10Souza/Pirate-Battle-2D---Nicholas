import React, { useEffect, useState, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GameProvider, useGame } from './game/GameContext';
import { GameCanvas } from './components/GameCanvas';
import { MainMenuModal, OptionsModal } from './components/UIOverlays';
import { CaptainsLogModal } from './components/CaptainsLogModal';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 1000 * 60,
        },
    },
});

const AppContent: React.FC = () => {
    const { screen } = useGame();
    const [fit, setFit] = useState(1);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const update = () => {
            if (!wrapperRef.current) return;
            const parent = wrapperRef.current.parentElement;
            if (parent) {
                // Calculates scale to fit 1024x600 inside the safe physical viewport
                setFit(Math.min(parent.clientWidth / 1024, parent.clientHeight / 600));
            }
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [screen]);

    if (screen === 'PLAYING' || screen === 'PAUSED' || screen === 'GAME_OVER') {
        return <GameCanvas />;
    }

    return (
        <div
            ref={wrapperRef}
            style={{
                position: 'relative',
                width: 1024,
                height: 600,
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
                border: '3px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                backgroundColor: '#1f5f8b',
                flexShrink: 0,
                transform: `scale(${fit})`,
                transformOrigin: 'center',
            }}
        >
            <img
                src="/ui_scene_background.png"
                onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.triedAssets) {
                        target.dataset.triedAssets = 'true';
                        target.src = '/ui_scene_background.png';
                    }
                }}
                alt=""
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    zIndex: 0,
                    display: 'block',
                }}
            />

            <div style={{ position: 'relative', zIndex: 10 }}>
                {screen === 'MENU' && <MainMenuModal />}
                {screen === 'OPTIONS' && <OptionsModal />}
                {screen === 'LOG' && <CaptainsLogModal />}
            </div>

            <div
                style={{
                    position: 'absolute',
                    bottom: 14,
                    right: 24,
                    zIndex: 20,
                    pointerEvents: 'none',
                }}
            >
                <img
                    src="/logo_jungle_gaming.svg"
                    onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.triedAssets) {
                            target.dataset.triedAssets = 'true';
                            target.src = '/assets/logo_jungle_gaming.svg';
                        }
                    }}
                    alt="Jungle Gaming"
                    style={{
                        height: '44px',
                        width: 'auto',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.85))',
                    }}
                />
            </div>
        </div>
    );
};

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <GameProvider>
                <main
                    className="app-main"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100vh',
                        width: '100vw',
                        background: '#070f1e',
                        paddingTop: 'env(safe-area-inset-top)',
                        paddingRight: 'env(safe-area-inset-right)',
                        paddingBottom: 'env(safe-area-inset-bottom)',
                        paddingLeft: 'env(safe-area-inset-left)',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                    }}
                >
                    <AppContent />
                    
                    <div className="orientation-warning">
                        <h2>Rotacione o aparelho</h2>
                        <p>O jogo foi projetado para o modo paisagem.</p>
                    </div>
                </main>
            </GameProvider>
        </QueryClientProvider>
    );
}