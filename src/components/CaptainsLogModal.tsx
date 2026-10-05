import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRankings, fetchMatchHistory } from '../services/api';
import { useGame } from '../game/GameContext';
import { WoodButton } from './UIOverlays';
import { SoundManager } from '../game/SoundManager';

export const CaptainsLogModal: React.FC = () => {
    const { setScreen } = useGame();
    const [tab, setTab] = useState<'RANKING' | 'HISTORY'>('RANKING');
    const [page, setPage] = useState<number>(1);
    const sound = SoundManager.getInstance();

    const { data: rankingData, isLoading: loadingRanking } = useQuery({
        queryKey: ['rankings', page],
        queryFn: () => fetchRankings(page, 5),
        enabled: tab === 'RANKING',
    });

    const { data: historyData, isLoading: loadingHistory } = useQuery({
        queryKey: ['matchHistory', page],
        queryFn: () => fetchMatchHistory(page, 5),
        enabled: tab === 'HISTORY',
    });

    const handleTabChange = (newTab: 'RANKING' | 'HISTORY') => {
        sound.play('ui_click');
        setTab(newTab);
        setPage(1);
    };

    const totalPages = tab === 'RANKING' ? (rankingData?.totalPages ?? 1) : (historyData?.totalPages ?? 1);

    return (
        <div
            style={{
                position: 'relative',
                width: '880px',
                minHeight: '520px',
                backgroundImage: `url('/assets/png/default/ui/menu/panel_menu.png')`,
                backgroundSize: '100% 100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '38px 72px',
                boxSizing: 'border-box',
                userSelect: 'none',
            }}
        >
            <h2
                style={{
                    color: '#fed7aa',
                    letterSpacing: '2px',
                    fontSize: '1.45rem',
                    marginBottom: '12px',
                    textShadow: '0 2px 4px #000',
                }}
            >
                CAPTAIN'S LOG
            </h2>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', justifyContent: 'center' }}>
                <button
                    onClick={() => handleTabChange('RANKING')}
                    style={{
                        width: '142px',
                        height: '40px',
                        border: 'none',
                        backgroundImage: tab === 'RANKING'
                            ? `url('/assets/png/default/ui/menu/button_primary_pressed.png')`
                            : `url('/assets/png/default/ui/menu/button_secondary_normal.png')`,
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: 'transparent',
                        color: tab === 'RANKING' ? '#422006' : '#ffffff',
                        fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
                        fontWeight: 900,
                        cursor: 'pointer',
                        fontSize: '10px',
                        letterSpacing: '0.5px',
                        textShadow: tab === 'RANKING' ? 'none' : '0px 1px 2px rgba(0, 0, 0, 0.95)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textTransform: 'uppercase',
                        transform: tab === 'RANKING' ? 'scale(0.96)' : 'scale(1)',
                        transition: 'all 0.1s ease'
                    }}
                >
                    RANKING
                </button>
                <button
                    onClick={() => handleTabChange('HISTORY')}
                    style={{
                        width: '142px',
                        height: '40px',
                        border: 'none',
                        backgroundImage: tab === 'HISTORY'
                            ? `url('/assets/png/default/ui/menu/button_primary_pressed.png')`
                            : `url('/assets/png/default/ui/menu/button_secondary_normal.png')`,
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: 'transparent',
                        color: tab === 'HISTORY' ? '#422006' : '#ffffff',
                        fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
                        fontWeight: 900,
                        cursor: 'pointer',
                        fontSize: '10px',
                        letterSpacing: '0.5px',
                        textShadow: tab === 'HISTORY' ? 'none' : '0px 1px 2px rgba(0, 0, 0, 0.95)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textTransform: 'uppercase',
                        transform: tab === 'HISTORY' ? 'scale(0.96)' : 'scale(1)',
                        transition: 'all 0.1s ease'
                    }}
                >
                    MATCH HISTORY
                </button>
            </div>

            <div
                style={{
                    color: '#cbd5e1',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    marginBottom: '10px',
                    letterSpacing: '1px',
                }}
            >
                {tab === 'RANKING'
                    ? '120 SECOND BATTLES · 3 SECOND SPAWN INTERVAL'
                    : 'CAPTAIN JACK · YOUR RECENT BATTLES'}
            </div>

            <div style={{ width: '100%', maxWidth: '740px', flex: 1, display: 'flex', flexDirection: 'column', marginTop: '12px' }}>
                {tab === 'RANKING' ? (
                    <div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 2fr 1fr 1fr',
                            padding: '0 16px',
                            marginBottom: '8px',
                            color: '#94a3b8',
                            fontSize: '8px',
                            letterSpacing: '1px',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                        }}>
                            <span>Rank</span>
                            <span>Captain</span>
                            <span style={{ textAlign: 'center' }}>Points</span>
                            <span style={{ textAlign: 'right' }}>Played</span>
                        </div>

                        {loadingRanking ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '10px', fontWeight: 700, letterSpacing: '1px' }}>
                                LOADING RANKINGS...
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {rankingData?.data.map((r, index) => (
                                    <div key={r.rank} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 2fr 1fr 1fr',
                                        padding: '10px 16px',
                                        backgroundColor: r.isPlayer ? 'rgba(234, 179, 8, 0.12)' : (index % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'transparent'),
                                        border: r.isPlayer ? '1px solid rgba(234, 179, 8, 0.25)' : '1px solid transparent',
                                        borderRadius: '4px',
                                        alignItems: 'center',
                                        fontSize: '11px',
                                        fontWeight: r.isPlayer ? 800 : 700,
                                        fontFamily: 'system-ui, -apple-system, sans-serif'
                                    }}>
                                        <span style={{ color: r.isPlayer ? '#fde047' : '#e2e8f0' }}>
                                            {r.rank.toString().padStart(2, '0')}
                                        </span>
                                        <span style={{ color: r.isPlayer ? '#fde047' : '#e2e8f0', display: 'flex', alignItems: 'center' }}>
                                            {r.rank === 1 && <span style={{ color: '#fde047', marginRight: '6px' }}>★</span>}
                                            {r.captain}
                                            {r.isPlayer && (
                                                <span style={{ fontSize: '7px', background: '#eab308', color: '#000', padding: '2px 4px', borderRadius: '3px', marginLeft: '6px', fontWeight: 900 }}>
                                                    YOU
                                                </span>
                                            )}
                                        </span>
                                        <span style={{ textAlign: 'center', color: '#facc15' }}>{r.points}</span>
                                        <span style={{ textAlign: 'right', color: '#94a3b8' }}>{r.playedAt}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr',
                            padding: '0 16px',
                            marginBottom: '8px',
                            color: '#94a3b8',
                            fontSize: '8px',
                            letterSpacing: '1px',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                        }}>
                            <span>Date</span>
                            <span style={{ textAlign: 'center' }}>Points</span>
                            <span style={{ textAlign: 'center' }}>Duration</span>
                            <span style={{ textAlign: 'right' }}>Result</span>
                        </div>

                        {loadingHistory ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '10px', fontWeight: 700, letterSpacing: '1px' }}>
                                LOADING HISTORY...
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {historyData?.data.map((h, index) => (
                                    <div key={h.id} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr',
                                        padding: '10px 16px',
                                        backgroundColor: index === 0 ? 'rgba(234, 179, 8, 0.12)' : (index % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'transparent'),
                                        border: index === 0 ? '1px solid rgba(234, 179, 8, 0.25)' : '1px solid transparent',
                                        borderRadius: '4px',
                                        alignItems: 'center',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        fontFamily: 'system-ui, -apple-system, sans-serif'
                                    }}>
                                        <span style={{ color: '#e2e8f0' }}>{h.date}</span>
                                        <span style={{ textAlign: 'center', color: '#facc15' }}>{h.points}</span>
                                        <span style={{ textAlign: 'center', color: '#e2e8f0' }}>{h.duration}</span>
                                        <span style={{
                                            textAlign: 'right',
                                            color: h.result === 'TIME UP' ? '#bef264' : '#fca5a5'
                                        }}>
                                            {h.result}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', margin: '16px 0' }}>
                <button
                    disabled={page <= 1}
                    onClick={() => {
                        sound.play('ui_click');
                        setPage((p) => Math.max(1, p - 1));
                    }}
                    style={{
                        ...roundAdjustStyle,
                        opacity: page <= 1 ? 0.3 : 1,
                        cursor: page <= 1 ? 'default' : 'pointer'
                    }}
                >
                    <span style={{ fontSize: '15px', color: '#fef3c7', textShadow: '0 2px 4px rgba(0,0,0,0.9)', marginLeft: '-2px' }}>
                        ◀
                    </span>
                </button>
                <span style={{ color: '#cbd5e1', fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    PAGE {page} OF {totalPages}
                </span>
                <button
                    disabled={page >= totalPages}
                    onClick={() => {
                        sound.play('ui_click');
                        setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    style={{
                        ...roundAdjustStyle,
                        opacity: page >= totalPages ? 0.3 : 1,
                        cursor: page >= totalPages ? 'default' : 'pointer'
                    }}
                >
                    <span style={{ fontSize: '15px', color: '#fef3c7', textShadow: '0 2px 4px rgba(0,0,0,0.9)', marginRight: '-2px' }}>
                        ▶
                    </span>
                </button>
            </div>

            <div style={{ paddingBottom: '10px' }}>
                <WoodButton label="MAIN MENU" onClick={() => setScreen('MENU')} width={210} height={54} />
            </div>
        </div>
    );
};

const roundAdjustStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    border: 'none',
    background: "transparent url('/assets/png/default/ui/controls/button_round_normal.png') no-repeat center/contain",
    color: '#fef3c7',
    fontSize: '12px',
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textShadow: '0 2px 4px rgba(0,0,0,0.9)',
    outline: 'none',
};