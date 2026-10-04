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
                width: '740px',
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

            {/* Abas Alternáveis */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <button
                    onClick={() => handleTabChange('RANKING')}
                    style={{
                        width: '136px',
                        height: '40px',
                        border: 'none',
                        background: `url('${tab === 'RANKING' ? '/assets/png/default/ui/menu/button_primary_pressed.png' : '/assets/png/default/ui/menu/button_secondary_normal.png'}') no-repeat center/contain`,
                        color: '#fef08a',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        letterSpacing: '1px',
                    }}
                >
                    RANKING
                </button>
                <button
                    onClick={() => handleTabChange('HISTORY')}
                    style={{
                        width: '136px',
                        height: '40px',
                        border: 'none',
                        background: `url('${tab === 'HISTORY' ? '/assets/png/default/ui/menu/button_primary_pressed.png' : '/assets/png/default/ui/menu/button_secondary_normal.png'}') no-repeat center/contain`,
                        color: '#fef08a',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        letterSpacing: '1px',
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

            {/* Tabela de Dados Perfeitamente Alinhada */}
            <div
                style={{
                    width: '100%',
                    maxWidth: '560px',
                    minHeight: '210px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    boxSizing: 'border-box',
                    border: '1px solid rgba(51, 65, 85, 0.6)',
                }}
            >
                {tab === 'RANKING' ? (
                    <div>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '48px 1fr 64px 110px',
                                color: '#94a3b8',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                paddingBottom: '6px',
                                borderBottom: '1px solid #334155',
                            }}
                        >
                            <span>RANK</span>
                            <span>CAPTAIN</span>
                            <span style={{ textAlign: 'center' }}>POINTS</span>
                            <span style={{ textAlign: 'right' }}>PLAYED</span>
                        </div>
                        {loadingRanking ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                                Carregando marés...
                            </div>
                        ) : (
                            rankingData?.data.map((r) => (
                                <div
                                    key={r.rank}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '48px 1fr 64px 110px',
                                        alignItems: 'center',
                                        padding: '7px 0',
                                        fontSize: '0.82rem',
                                        color: r.isPlayer ? '#fde047' : '#f8fafc',
                                        fontWeight: r.isPlayer ? 800 : 500,
                                        borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                                    }}
                                >
                                    <span>{r.rank.toString().padStart(2, '0')}</span>
                                    <span>
                                        {r.rank === 1 && <span style={{ color: '#fde047', marginRight: '4px' }}>★</span>}
                                        {r.captain}{' '}
                                        {r.isPlayer && (
                                            <span
                                                style={{
                                                    fontSize: '0.62rem',
                                                    background: '#eab308',
                                                    color: '#000',
                                                    padding: '1px 4px',
                                                    borderRadius: '3px',
                                                    marginLeft: '4px',
                                                    fontWeight: 800,
                                                }}
                                            >
                                                YOU
                                            </span>
                                        )}
                                    </span>
                                    <span style={{ textAlign: 'center' }}>{r.points}</span>
                                    <span style={{ textAlign: 'right', color: '#94a3b8' }}>{r.playedAt}</span>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '130px 60px 80px 1fr',
                                color: '#94a3b8',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                paddingBottom: '6px',
                                borderBottom: '1px solid #334155',
                            }}
                        >
                            <span>DATE</span>
                            <span style={{ textAlign: 'center' }}>POINTS</span>
                            <span style={{ textAlign: 'center' }}>DURATION</span>
                            <span style={{ textAlign: 'right' }}>RESULT</span>
                        </div>
                        {loadingHistory ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                                Consultando o diário de bordo...
                            </div>
                        ) : (
                            historyData?.data.map((h) => (
                                <div
                                    key={h.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '130px 60px 80px 1fr',
                                        alignItems: 'center',
                                        padding: '7px 0',
                                        fontSize: '0.82rem',
                                        color: '#f8fafc',
                                        borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                                    }}
                                >
                                    <span>{h.date}</span>
                                    <span style={{ textAlign: 'center', color: '#fef08a', fontWeight: 700 }}>
                                        {h.points}
                                    </span>
                                    <span style={{ textAlign: 'center' }}>{h.duration}</span>
                                    <span
                                        style={{
                                            textAlign: 'right',
                                            color: h.result === 'TIME UP' ? '#86efac' : '#fca5a5',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {h.result}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Paginação */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0 8px 0' }}>
                <button
                    disabled={page <= 1}
                    onClick={() => {
                        sound.play('ui_click');
                        setPage((p) => Math.max(1, p - 1));
                    }}
                    style={{
                        width: '26px',
                        height: '26px',
                        border: 'none',
                        background: 'transparent',
                        cursor: page <= 1 ? 'default' : 'pointer',
                        opacity: page <= 1 ? 0.3 : 1,
                        color: '#fef08a',
                        fontWeight: 'bold',
                    }}
                >
                    ◀
                </button>
                <span style={{ color: '#cbd5e1', fontSize: '0.72rem', fontWeight: 700 }}>
                    PAGE {page} OF {totalPages}
                </span>
                <button
                    disabled={page >= totalPages}
                    onClick={() => {
                        sound.play('ui_click');
                        setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    style={{
                        width: '26px',
                        height: '26px',
                        border: 'none',
                        background: 'transparent',
                        cursor: page >= totalPages ? 'default' : 'pointer',
                        opacity: page >= totalPages ? 0.3 : 1,
                        color: '#fef08a',
                        fontWeight: 'bold',
                    }}
                >
                    ▶
                </button>
            </div>

            <WoodButton label="MAIN MENU" onClick={() => setScreen('MENU')} width={170} height={50} />
        </div>
    );
};