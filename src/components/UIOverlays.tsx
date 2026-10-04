import React from 'react';
import { useGame } from '../game/GameContext';
import { SoundManager } from '../game/SoundManager';

export const WoodPanel: React.FC<{
    children: React.ReactNode;
    width?: number;
    height?: number;
}> = ({ children, width = 480, height = 480 }) => (
    <div
        style={{
            position: 'relative',
            width: `${width}px`,
            height: `${height}px`,
            backgroundImage: `url('/assets/png/default/ui/menu/panel_menu.png')`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '34px 44px',
            boxSizing: 'border-box',
            userSelect: 'none',
            filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.6))',
        }}
    >
        {children}
    </div>
);

export const WoodButton: React.FC<{
    label: string;
    onClick: () => void;
    width?: number;
    height?: number;
    disabled?: boolean;
}> = ({ label, onClick, width = 280, height = 62, disabled = false }) => {
    const sound = SoundManager.getInstance();

    return (
        <button
            disabled={disabled}
            onClick={() => {
                sound.play('ui_click', 0.8);
                onClick();
            }}
            onMouseEnter={() => sound.play('ui_hover', 0.4)}
            style={{
                width: `${width}px`,
                height: `${height}px`,
                backgroundImage: `url('/assets/png/default/ui/menu/button_primary_normal.png')`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                color: '#3e1804',
                fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
                fontSize: '18px',
                fontWeight: 900,
                letterSpacing: '1.5px',
                textShadow: '0px 1px 1px rgba(255, 255, 255, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '3px 0',
                transition: 'transform 0.08s ease',
                opacity: disabled ? 0.6 : 1,
                textTransform: 'uppercase',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
            {label}
        </button>
    );
};

export const WoodSecondaryButton: React.FC<{
    label: string;
    onClick: () => void;
    width?: number;
    height?: number;
}> = ({ label, onClick, width = 142, height = 40 }) => {
    const sound = SoundManager.getInstance();

    return (
        <button
            onClick={() => {
                sound.play('ui_click', 0.8);
                onClick();
            }}
            onMouseEnter={() => sound.play('ui_hover', 0.4)}
            style={{
                width: `${width}px`,
                height: `${height}px`,
                backgroundImage: `url('/assets/png/default/ui/menu/button_secondary_normal.png')`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#ffffff',
                fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
                fontSize: '9px',
                fontWeight: 900,
                letterSpacing: '0.5px',
                textShadow: '0px 1px 2px rgba(0, 0, 0, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.08s ease',
                textTransform: 'uppercase',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
            {label}
        </button>
    );
};

export const MainMenuModal: React.FC = () => {
    const { setScreen } = useGame();

    return (
        <WoodPanel width={480} height={480}>
            <img
                src="/assets/png/default/ui/menu/title_pirate_battle.png"
                alt="Pirate Battle"
                style={{ width: '310px', height: 'auto', marginBottom: '2px' }}
            />
            <p
                style={{
                    color: '#ffffff',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                    fontSize: '8px',
                    letterSpacing: '2px',
                    fontWeight: 700,
                    margin: '2px 0 16px 0',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
                    textTransform: 'uppercase',
                }}
            >
                SET SAIL. TAKE COMMAND.
            </p>

            <WoodButton label="PLAY" onClick={() => setScreen('PLAYING')} width={280} height={62} />
            <WoodButton label="OPTIONS" onClick={() => setScreen('OPTIONS')} width={280} height={62} />

            <div
                style={{
                    margin: '12px 0 6px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <img
                    src="/assets/png/default/ships/ship_2.png"
                    alt="Pirate Ship"
                    style={{ width: '36px', height: 'auto' }}
                />
                <span
                    style={{
                        color: '#e2e8f0',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                        fontSize: '9px',
                        fontWeight: 600,
                        marginTop: '6px',
                        letterSpacing: '0.5px',
                        textShadow: '0 1px 3px rgba(0, 0, 0, 0.95)',
                    }}
                >
                    Navigate the islands. Survive the battle.
                </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', marginBottom: '8px' }}>
                <WoodSecondaryButton
                    label="RANKING"
                    onClick={() => setScreen('LOG')}
                    width={136}
                    height={40}
                />
                <WoodSecondaryButton
                    label="MATCH HISTORY"
                    onClick={() => setScreen('LOG')}
                    width={154}
                    height={40}
                />
            </div>
        </WoodPanel>
    );
};

export const OptionsModal: React.FC = () => {
    const { setScreen, config, updateConfig } = useGame();
    const sound = SoundManager.getInstance();

    return (
        <WoodPanel width={480} height={480}>
            <h2
                style={{
                    color: '#ffffff',
                    fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
                    letterSpacing: '2px',
                    fontSize: '24px',
                    margin: '14px 0 28px 0',
                    textShadow: '0 2px 4px #000',
                }}
            >
                OPTIONS
            </h2>

            <div style={{ width: '100%', marginBottom: '28px', textAlign: 'center' }}>
                <span style={{ color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', fontSize: '12px', fontWeight: 700 }}>Game session time</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', marginTop: '12px' }}>
                    <button
                        onClick={() => {
                            sound.play('ui_click');
                            updateConfig({ sessionTime: Math.max(60, config.sessionTime - 30) });
                        }}
                        style={roundAdjustStyle}
                    >
                        -
                    </button>
                    <span style={{ color: '#fef08a', fontFamily: '"Arial Black", "Segoe UI Black", sans-serif', fontSize: '22px', fontWeight: 900, minWidth: '75px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                        {config.sessionTime} s
                    </span>
                    <button
                        onClick={() => {
                            sound.play('ui_click');
                            updateConfig({ sessionTime: Math.min(180, config.sessionTime + 30) });
                        }}
                        style={roundAdjustStyle}
                    >
                        +
                    </button>
                </div>
            </div>

            <div style={{ width: '100%', marginBottom: '38px', textAlign: 'center' }}>
                <span style={{ color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', fontSize: '12px', fontWeight: 700 }}>Enemy spawn time</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', marginTop: '12px' }}>
                    <button
                        onClick={() => {
                            sound.play('ui_click');
                            updateConfig({ spawnInterval: Math.max(1.5, config.spawnInterval - 0.5) });
                        }}
                        style={roundAdjustStyle}
                    >
                        -
                    </button>
                    <span style={{ color: '#fef08a', fontFamily: '"Arial Black", "Segoe UI Black", sans-serif', fontSize: '22px', fontWeight: 900, minWidth: '75px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                        {config.spawnInterval} s
                    </span>
                    <button
                        onClick={() => {
                            sound.play('ui_click');
                            updateConfig({ spawnInterval: Math.min(6.0, config.spawnInterval + 0.5) });
                        }}
                        style={roundAdjustStyle}
                    >
                        +
                    </button>
                </div>
            </div>

            <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
                <WoodButton label="MAIN MENU" onClick={() => setScreen('MENU')} width={280} height={62} />
            </div>
        </WoodPanel>
    );
};

export const PauseModal: React.FC<{ onResume: () => void }> = ({ onResume }) => {
    const { setScreen } = useGame();

    return (
        <WoodPanel width={460} height={460}>
            <h2
                style={{
                    color: '#ffffff',
                    fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
                    letterSpacing: '2px',
                    fontSize: '26px',
                    margin: '12px 0 4px 0',
                    textShadow: '0 2px 4px #000',
                }}
            >
                PAUSED
            </h2>
            <p style={{ color: '#cbd5e1', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', fontSize: '12px', marginBottom: '30px' }}>Ready when you are.</p>

            <WoodButton label="RESUME" onClick={onResume} width={280} height={62} />
            <WoodButton label="OPTIONS" onClick={() => setScreen('OPTIONS')} width={280} height={62} />
            <WoodButton label="MAIN MENU" onClick={() => setScreen('MENU')} width={280} height={62} />
        </WoodPanel>
    );
};

export const ResultModal: React.FC<{ onRestart: () => void }> = ({ onRestart }) => {
    const { setScreen, lastMatchResult } = useGame();

    const isWin = lastMatchResult?.reason === 'time_up';
    const elapsed = lastMatchResult?.timeElapsed ?? 0;
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    const formattedDuration = `${mins}:${secs}`;

    return (
        <WoodPanel width={460} height={480}>
            <h2
                style={{
                    color: '#ffffff',
                    fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
                    letterSpacing: '2px',
                    fontSize: '24px',
                    marginBottom: '16px',
                    textShadow: '0 2px 4px #000',
                }}
            >
                BATTLE COMPLETE
            </h2>

            <div
                style={{
                    color: '#fef08a',
                    fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
                    fontSize: '68px',
                    fontWeight: 900,
                    textShadow: '0 4px 14px rgba(0, 0, 0, 0.85)',
                    margin: '4px 0',
                }}
            >
                {lastMatchResult?.score ?? 0}
            </div>

            <div
                style={{
                    color: '#e2e8f0',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    margin: '6px 0 36px 0',
                }}
            >
                POINTS · {formattedDuration} · {isWin ? 'TIME UP' : 'DEFEATED'}
            </div>

            <WoodButton label="PLAY AGAIN" onClick={onRestart} width={280} height={62} />
            <WoodButton label="MAIN MENU" onClick={() => setScreen('MENU')} width={280} height={62} />
        </WoodPanel>
    );
};

const roundAdjustStyle: React.CSSProperties = {
    width: '42px',
    height: '42px',
    background: "transparent url('/assets/png/default/ui/controls/button_round_normal.png') no-repeat center/contain",
    border: 'none',
    cursor: 'pointer',
    color: '#fef3c7',
    fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
    fontSize: '22px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
};