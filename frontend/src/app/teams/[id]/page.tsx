'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from '../../app-shell.module.css';

interface Member {
  teamId: string;
  userId: string;
  role: 'captain' | 'player';
  joinedAt: number;
  user: { id: string; name: string; image?: string; isGuest: boolean } | null;
}
interface Match {
  id: string;
  teamId: string;
  gameId: string;
  roomCode: string;
  variant?: string;
  hostName: string;
  hostUserId: string;
  createdAt: number;
}
interface TeamDetail {
  team: { id: string; name: string; slug: string; description?: string; ownerId: string };
  membership: { role: 'captain' | 'player' } | null;
  members: Member[] | null;
  activeMatches: Match[] | null;
}

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const me = session?.user as { id?: string; name?: string } | undefined;
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Announce-match form
  const [gameId, setGameId] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${id}`);
      if (res.ok) setDetail(await res.json());
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void reload(); }, [reload]);

  const isCaptain = detail?.membership?.role === 'captain' || detail?.team.ownerId === me?.id;

  const handleJoin = async () => {
    await fetch(`/api/teams/${id}/members`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ joinSelf: true }) });
    await reload();
  };
  const handleLeave = async () => {
    await fetch(`/api/teams/${id}/members`, { method: 'DELETE' });
    await reload();
  };
  const handleSetRole = async (userId: string, role: 'captain' | 'player') => {
    await fetch(`/api/teams/${id}/members`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, role }) });
    await reload();
  };
  const handleRemove = async (userId: string) => {
    await fetch(`/api/teams/${id}/members?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    await reload();
  };
  const handleAnnounce = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`/api/teams/${id}/matches`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: gameId.trim(), roomCode: roomCode.trim().toUpperCase() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to announce');
      return;
    }
    setGameId(''); setRoomCode('');
    await reload();
  };
  const handleEndMatch = async (mid: string) => {
    await fetch(`/api/teams/${id}/matches?id=${encodeURIComponent(mid)}`, { method: 'DELETE' });
    await reload();
  };

  if (loading) return <div className={styles.shell}><div className={styles.empty}>Loading…</div></div>;
  if (!detail) return <div className={styles.shell}><div className={styles.empty}>Team not found</div></div>;

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{detail.team.name}</h1>
          <p className={styles.subtitle}>/{detail.team.slug}{detail.team.description ? ` — ${detail.team.description}` : ''}</p>
        </div>
        <div className={styles.row}>
          {detail.membership ? (
            <button className={styles.btnGhost} onClick={handleLeave}>Leave team</button>
          ) : (
            <button className={styles.btn} onClick={handleJoin}>Join team</button>
          )}
        </div>
      </div>

      {detail.membership && (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Live matches (spectator feed)</h2>
            {detail.activeMatches && detail.activeMatches.length > 0 ? (
              <div className={styles.cardGrid}>
                {detail.activeMatches.map(m => (
                  <div key={m.id} className={styles.card}>
                    <div className={styles.rowBetween}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{m.gameId}</div>
                        <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.6)' }}>Host: {m.hostName}</div>
                      </div>
                      <span className={`${styles.pill} ${styles.pillSuccess}`}>{m.roomCode}</span>
                    </div>
                    <div className={styles.row} style={{ marginTop: 12 }}>
                      <Link href={`/?room=${m.roomCode}`} className={styles.btn}>Spectate / join</Link>
                      {(m.hostUserId === me?.id || isCaptain) && (
                        <button className={styles.btnGhost} onClick={() => void handleEndMatch(m.id)}>End</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>No live matches. When a teammate starts a game they can announce it here.</div>
            )}

            <form className={styles.card} onSubmit={handleAnnounce} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              <h3 className={styles.sectionTitle}>Announce a match</h3>
              <div className={styles.row} style={{ gap: 12 }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className={styles.label}>Game id</label>
                  <input className={styles.input} placeholder="tic-tac-toe" value={gameId} onChange={e => setGameId(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label className={styles.label}>Room code</label>
                  <input className={styles.input} placeholder="ABCD" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} maxLength={8} />
                </div>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button className={styles.btn} type="submit" disabled={!gameId.trim() || !roomCode.trim()}>Announce</button>
                </div>
              </div>
              {error && <div className={styles.error}>{error}</div>}
            </form>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Members</h2>
            {detail.members && detail.members.length > 0 ? (
              <table className={styles.table}>
                <thead><tr><th>Name</th><th>Role</th><th>Joined</th><th /></tr></thead>
                <tbody>
                  {detail.members.map(m => (
                    <tr key={m.userId}>
                      <td>
                        {m.user?.name ?? m.userId}
                        {m.user?.isGuest && <span className={`${styles.pill} ${styles.pillMuted}`} style={{ marginLeft: 8 }}>guest</span>}
                        {m.userId === detail.team.ownerId && <span className={`${styles.pill}`} style={{ marginLeft: 8 }}>owner</span>}
                      </td>
                      <td>
                        {isCaptain && m.userId !== detail.team.ownerId ? (
                          <select className={styles.select} value={m.role} onChange={e => void handleSetRole(m.userId, e.target.value as 'captain' | 'player')}>
                            <option value="player">player</option>
                            <option value="captain">captain</option>
                          </select>
                        ) : (
                          <span className={`${styles.pill} ${m.role === 'captain' ? '' : styles.pillMuted}`}>{m.role}</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'rgba(229,231,235,0.6)' }}>{new Date(m.joinedAt).toLocaleDateString()}</td>
                      <td>
                        {isCaptain && m.userId !== detail.team.ownerId && (
                          <button className={`${styles.btnGhost} ${styles.btnSm}`} onClick={() => void handleRemove(m.userId)}>Remove</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>No members yet.</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
