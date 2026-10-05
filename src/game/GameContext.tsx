import React, { createContext, useContext, useState } from 'react';
import { GameConfig } from './types';

export type GameScreen = 'MENU' | 'PLAYING' | 'PAUSED' | 'OPTIONS' | 'LOG' | 'GAME_OVER';

interface GameContextType {
    screen: GameScreen;
    setScreen: (screen: GameScreen) => void;
    config: GameConfig;
    updateConfig: (newConfig: Partial<GameConfig>) => void;
    lastMatchResult: { score: number; reason: 'time_up' | 'defeated' | null; timeElapsed: number } | null;
    setLastMatchResult: (result: { score: number; reason: 'time_up' | 'defeated' | null; timeElapsed: number } | null) => void;
}

const defaultConfig: GameConfig = {
    sessionTime: 120,
    spawnInterval: 3.0,
    playerMaxSpeed: 230,
    playerTurnSpeed: 3.4,
    playerHealth: 100,
    projectileSpeed: 440,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [screen, setScreen] = useState<GameScreen>('MENU');
    const [config, setConfig] = useState<GameConfig>(defaultConfig);
    const [lastMatchResult, setLastMatchResult] = useState<{ score: number; reason: 'time_up' | 'defeated' | null; timeElapsed: number } | null>(null);

    const updateConfig = (partial: Partial<GameConfig>) => {
        setConfig((prev: GameConfig) => ({ ...prev, ...partial }));
    };

    return (
        <GameContext.Provider
            value={{
                screen,
                setScreen,
                config,
                updateConfig,
                lastMatchResult,
                setLastMatchResult,
            }}
        >
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const ctx = useContext(GameContext);
    if (!ctx) throw new Error('useGame must be used within a GameProvider');
    return ctx;
};