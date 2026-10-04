export interface RankingEntry {
    rank: number;
    captain: string;
    points: number;
    playedAt: string;
    isPlayer?: boolean;
}

export interface MatchHistoryEntry {
    id: string;
    date: string;
    points: number;
    duration: string;
    result: 'TIME UP' | 'DEFEATED';
}

// Mock inicial de ranking baseado no sample_ranking.jpg
const INITIAL_RANKINGS: RankingEntry[] = [
    { rank: 1, captain: 'Captain Flint', points: 38, playedAt: '08 SEP · 21:42' },
    { rank: 2, captain: 'Red Sparrow', points: 32, playedAt: '08 SEP · 20:18' },
    { rank: 3, captain: 'Captain Jack', points: 24, playedAt: '08 SEP · 19:36', isPlayer: true },
    { rank: 4, captain: 'Storm Rider', points: 21, playedAt: '08 SEP · 18:50' },
    { rank: 5, captain: 'Sea Wolf', points: 19, playedAt: '08 SEP · 18:24' },
    { rank: 6, captain: 'Blackbeard', points: 18, playedAt: '08 SEP · 17:10' },
    { rank: 7, captain: 'Anne Bonny', points: 15, playedAt: '08 SEP · 16:45' },
    { rank: 8, captain: 'Calico Jack', points: 12, playedAt: '08 SEP · 15:20' },
];

export const fetchRankings = async (page: number = 1, pageSize: number = 5): Promise<{ data: RankingEntry[]; totalPages: number }> => {
    // Simula latência de rede realista para o TanStack Query
    await new Promise((resolve) => setTimeout(resolve, 200));

    const start = (page - 1) * pageSize;
    const data = INITIAL_RANKINGS.slice(start, start + pageSize);
    const totalPages = Math.ceil(INITIAL_RANKINGS.length / pageSize);

    return { data, totalPages };
};

export const fetchMatchHistory = async (page: number = 1, pageSize: number = 5): Promise<{ data: MatchHistoryEntry[]; totalPages: number }> => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const savedHistory = localStorage.getItem('pirate_match_history');
    let history: MatchHistoryEntry[] = savedHistory ? JSON.parse(savedHistory) : [];

    if (history.length === 0) {
        // Mock inicial baseado no sample_history.jpg
        history = [
            { id: '1', date: '08 SEP · 19:36', points: 24, duration: '02:00', result: 'TIME UP' },
            { id: '2', date: '08 SEP · 19:28', points: 18, duration: '01:42', result: 'DEFEATED' },
            { id: '3', date: '08 SEP · 19:20', points: 22, duration: '02:00', result: 'TIME UP' },
            { id: '4', date: '08 SEP · 19:12', points: 11, duration: '01:18', result: 'DEFEATED' },
            { id: '5', date: '07 SEP · 22:05', points: 20, duration: '02:00', result: 'TIME UP' },
        ];
        localStorage.setItem('pirate_match_history', JSON.stringify(history));
    }

    const start = (page - 1) * pageSize;
    const data = history.slice(start, start + pageSize);
    const totalPages = Math.ceil(history.length / pageSize);

    return { data, totalPages };
};

export const saveMatchResult = (points: number, durationSeconds: number, reason: 'time_up' | 'defeated' | null): void => {
    const savedHistory = localStorage.getItem('pirate_match_history');
    const history: MatchHistoryEntry[] = savedHistory ? JSON.parse(savedHistory) : [];

    const mins = Math.floor(durationSeconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(durationSeconds % 60).toString().padStart(2, '0');

    const newEntry: MatchHistoryEntry = {
        id: Date.now().toString(),
        date: 'TODAY · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        points,
        duration: `${mins}:${secs}`,
        result: reason === 'time_up' ? 'TIME UP' : 'DEFEATED',
    };

    history.unshift(newEntry);
    localStorage.setItem('pirate_match_history', JSON.stringify(history));
};