import React from 'react';
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

    if (screen === 'PLAYING' || screen === 'PAUSED' || screen === 'GAME_OVER') {
        return <GameCanvas />;
    }

    return (
        <div
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
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100vh',
                        width: '100vw',
                        background: '#070f1e',
                    }}
                >
                    <AppContent />
                </main>
            </GameProvider>
        </QueryClientProvider>
    );
}