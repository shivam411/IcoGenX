'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Celebration } from '@/components/Celebration';
import styles from '../../app-shell.module.css';

interface Participant { id: string; name: string; seed: number; userId?: string; teamId?: string; }
interface Match { id: string; round: number; slot: number; p1Id: string | null; p2Id: string | null; winnerId: string | null; scoreP1?: number; scoreP2?: number; roomCode?: string; }
interface Tournament {
  id: string; name: string; gameId: string; format: 'knockout'; status: 'draft' | 'live' | 'completed';
  organizerId: string; teamId?: string;
  participants: Participant[]; matches: Match[];
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const me = session?.user as { id?: string; role?: string } | undefined;
  const [t, setT] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftParticipants, setDraftParticipants] = useState<Participant[]>([]);
  const [newName, setNewName] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const celebratedRef = useRef(false);

  const getTournamentWinnerName = () => {
    if (!t || t.status !== 'completed' || !t.matches || t.matches.length === 0) return null;
    const highestRound = Math.max(...t.matches.map(m => m.round));
    const finalMatch = t.matches.find(m => m.round === highestRound);
    if (!finalMatch || !finalMatch.winnerId) return null;
    return t.participants.find(p => p.id === finalMatch.winnerId)?.name || 'Champion';
  };

  const championName = getTournamentWinnerName();

  useEffect(() => {
    if (t?.status === 'completed' && championName) {
      if (!celebratedRef.current) {
        setShowCelebration(true);
        celebratedRef.current = true;
      }
    } else {
      celebratedRef.current = false;
      setShowCelebration(false);
    }
  }, [t?.status, championName]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      const data = await res.json();
      setT(data.tournament);
      setDraftParticipants(data.tournament?.participants ?? []);
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void reload(); }, [reload]);

  const canManage = !!t && (t.organizerId === me?.id || me?.role === 'admin' || me?.role === 'tournament_manager');

  const patch = async (body: Record<string, unknown>) => {
    setError('');
    const res = await fetch(`/api/tournaments/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'failed');
      return;
    }
    await reload();
  };

  const addParticipant = () => {
    const n = newName.trim(); if (!n) return;
    setDraftParticipants(prev => [...prev, { id: `tmp_${Date.now()}`, name: n, seed: prev.length + 1 }]);
    setNewName('');
  };
  const removeParticipant = (pid: string) => setDraftParticipants(prev => prev.filter(p => p.id !== pid).map((p, i) => ({ ...p, seed: i + 1 })));
  const moveParticipant = (idx: number, dir: -1 | 1) => {
    setDraftParticipants(prev => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next.map((p, i) => ({ ...p, seed: i + 1 }));
    });
  };
  const saveParticipants = (regenerate: boolean) => patch({ participants: draftParticipants, regenerate });

  const matchesByRound = (() => {
    if (!t) return new Map<number, Match[]>();
    const m = new Map<number, Match[]>();
    for (const x of t.matches) {
      const arr = m.get(x.round) ?? [];
      arr.push(x); m.set(x.round, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.slot - b.slot);
    return m;
  })();
  const participantName = (pid: string | null) => {
    if (!pid) return <span style={{ color: 'rgba(229,231,235,0.4)' }}>—</span>;
    return t?.participants.find(p => p.id === pid)?.name ?? pid;
  };

  if (loading) return <div className={styles.shell}><div className={styles.empty}>Loading…</div></div>;
  if (!t) return <div className={styles.shell}><div className={styles.empty}>Not found</div></div>;

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t.name}</h1>
          <p className={styles.subtitle}>{t.gameId} · {t.format} · <span className={`${styles.pill} ${t.status === 'live' ? styles.pillSuccess : ''}`}>{t.status}</span></p>
        </div>
        {canManage && (
          <div className={styles.row}>
            {t.status === 'draft' && <button className={styles.btn} onClick={() => void patch({ status: 'live' })}>Start (live)</button>}
            {t.status === 'live' && <button className={styles.btn} onClick={() => void patch({ status: 'completed' })}>Mark completed</button>}
            {t.status === 'completed' && <button className={styles.btnGhost} onClick={() => void patch({ status: 'live' })}>Reopen</button>}
          </div>
        )}
      </div>
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Participants &amp; seeds</h2>
        <div className={styles.card}>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {draftParticipants.map((p, idx) => (
              <li key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span>{p.name}</span>
                {canManage && (
                  <div className={styles.row}>
                    <button className={`${styles.btnGhost} ${styles.btnSm}`} onClick={() => moveParticipant(idx, -1)} disabled={idx === 0}>↑</button>
                    <button className={`${styles.btnGhost} ${styles.btnSm}`} onClick={() => moveParticipant(idx, +1)} disabled={idx === draftParticipants.length - 1}>↓</button>
                    <button className={`${styles.btnGhost} ${styles.btnSm}`} onClick={() => removeParticipant(p.id)}>✕</button>
                  </div>
                )}
              </li>
            ))}
            {draftParticipants.length === 0 && <li style={{ color: 'rgba(229,231,235,0.5)', listStyle: 'none' }}>No participants yet.</li>}
          </ol>
          {canManage && (
            <>
              <div className={styles.row} style={{ marginTop: 12, gap: 8 }}>
                <input className={styles.input} style={{ maxWidth: 280 }} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Participant name" />
                <button className={styles.btnGhost} onClick={addParticipant} disabled={!newName.trim()}>Add</button>
              </div>
              <div className={styles.row} style={{ marginTop: 12, gap: 8 }}>
                <button className={styles.btnGhost} onClick={() => void saveParticipants(false)}>Save order</button>
                <button className={styles.btn} onClick={() => void saveParticipants(true)} disabled={draftParticipants.length < 2}>Save &amp; generate bracket</button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Bracket</h2>
        {matchesByRound.size === 0 ? (
          <div className={styles.empty}>No bracket yet — add at least 2 participants then click &quot;Save &amp; generate bracket&quot;.</div>
        ) : (
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
            {Array.from(matchesByRound.keys()).sort((a, b) => a - b).map(round => (
              <div key={round} style={{ minWidth: 240 }}>
                <h3 className={styles.sectionTitle} style={{ fontSize: 13 }}>Round {round}</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {matchesByRound.get(round)!.map(m => {
                    const editable = canManage && m.p1Id && m.p2Id && t.status !== 'completed';
                    return (
                      <div key={m.id} className={styles.card} style={{ padding: 10 }}>
                        {[['p1', m.p1Id, m.scoreP1], ['p2', m.p2Id, m.scoreP2]].map((row, i) => {
                          const [, pid, score] = row as ['p1' | 'p2', string | null, number | undefined];
                          const isWinner = pid && m.winnerId === pid;
                          return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', opacity: pid ? 1 : 0.5, fontWeight: isWinner ? 700 : 400 }}>
                              <span>{participantName(pid)}</span>
                              <span style={{ fontSize: 12, color: 'rgba(229,231,235,0.6)' }}>{score ?? ''}</span>
                            </div>
                          );
                        })}
                        {editable && (
                          <div className={styles.row} style={{ marginTop: 8 }}>
                            <button className={`${styles.btnGhost} ${styles.btnSm}`} onClick={() => void patch({ matchId: m.id, patch: { winnerId: m.p1Id } })}>{participantName(m.p1Id)} wins</button>
                            <button className={`${styles.btnGhost} ${styles.btnSm}`} onClick={() => void patch({ matchId: m.id, patch: { winnerId: m.p2Id } })}>{participantName(m.p2Id)} wins</button>
                            {m.winnerId && <button className={`${styles.btnGhost} ${styles.btnSm}`} onClick={() => void patch({ matchId: m.id, patch: { winnerId: null } })}>Reset</button>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {showCelebration && championName && (
        <Celebration
          type="tournament"
          winnerName={championName}
          onComplete={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}
