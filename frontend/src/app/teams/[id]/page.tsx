'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from '../../app-shell.module.css';

type TeamRole = 'captain' | 'manager' | 'player';

interface Member {
  teamId: string;
  userId: string;
  role: TeamRole;
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
  team: { id: string; name: string; slug: string; joinCode?: string; description?: string; ownerId: string };
  membership: { role: TeamRole } | null;
  members: Member[] | null;
  activeMatches: Match[] | null;
  canManage: boolean;
  canAssignLeadership: boolean;
  canAnnounce: boolean;
}

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const me = session?.user as { id?: string; name?: string; isGuest?: boolean } | undefined;
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rotatingCode, setRotatingCode] = useState(false);

  const [gameId, setGameId] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${id}`);
      if (res.ok) {
        setDetail(await res.json());
      } else {
        setDetail(null);
      }
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void reload(); }, [reload]);

  const handleJoin = async () => {
    setError('');
    const res = await fetch(`/api/teams/${id}/members`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ joinSelf: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to join team');
      return;
    }
    await reload();
  };

  const handleLeave = async () => {
    setError('');
    const res = await fetch(`/api/teams/${id}/members`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to leave team');
      return;
    }
    await reload();
  };

  const handleSetRole = async (userId: string, role: TeamRole) => {
    setError('');
    const res = await fetch(`/api/teams/${id}/members`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to update role');
      return;
    }
    await reload();
  };

  const handleRemove = async (userId: string) => {
    setError('');
    const res = await fetch(`/api/teams/${id}/members?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to remove member');
      return;
    }
    await reload();
  };

  const handleRotateCode = async () => {
    setError('');
    setNotice('');
    setRotatingCode(true);
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rotateJoinCode: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'Failed to rotate code');
      await reload();
      setNotice('New team code generated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRotatingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!detail?.team.joinCode) return;
    setError('');
    setNotice('');
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard copy is not supported in this browser');
      }
      await navigator.clipboard.writeText(detail.team.joinCode);
      setNotice('Team code copied.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to copy team code');
    }
  };

  const handleAnnounce = async (event: React.FormEvent) => {
    event.preventDefault();
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

  const handleEndMatch = async (matchId: string) => {
    setError('');
    const res = await fetch(`/api/teams/${id}/matches?id=${encodeURIComponent(matchId)}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to end match');
      return;
    }
    await reload();
  };

  if (loading) return <div className={styles.shell}><div className={styles.empty}>Loading...</div></div>;
  if (!detail) return <div className={styles.shell}><div className={styles.empty}>Team not found</div></div>;

  const isOwner = detail.team.ownerId === me?.id;
  const canViewPrivate = !!detail.members;
  const canLeave = !!detail.membership && !isOwner;
  const managerOnly = detail.membership?.role === 'manager';

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{detail.team.name}</h1>
          <p className={styles.subtitle}>/{detail.team.slug}{detail.team.description ? ` - ${detail.team.description}` : ''}</p>
        </div>
        <div className={styles.row}>
          {detail.membership && <span className={styles.pill}>{detail.membership.role}</span>}
          {!detail.membership && detail.canManage && <span className={styles.pill}>tournament manager access</span>}
          {canLeave && <button className={styles.btnGhost} onClick={handleLeave}>Leave team</button>}
          {!detail.membership && !detail.canManage && !me?.isGuest && (
            <button className={styles.btn} onClick={handleJoin}>Join team</button>
          )}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.success}>{notice}</div>}

      {detail.canManage && detail.team.joinCode && (
        <section className={styles.section}>
          <div className={styles.card}>
            <div className={styles.rowBetween}>
              <div>
                <h2 className={styles.sectionTitle}>Guest join code</h2>
                <p className={styles.mutedText}>Share this with players. They can use Play as guest with their name and this code.</p>
              </div>
              <div className={styles.row}>
                <div className={styles.codeBox}>{detail.team.joinCode}</div>
                <button className={styles.btnGhost} type="button" onClick={() => void handleCopyCode()}>Copy</button>
                <button className={styles.btnGhost} type="button" onClick={() => void handleRotateCode()} disabled={rotatingCode}>
                  {rotatingCode ? 'Rotating...' : 'New code'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {canViewPrivate ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Live matches (spectator feed)</h2>
            {detail.activeMatches && detail.activeMatches.length > 0 ? (
              <div className={styles.cardGrid}>
                {detail.activeMatches.map((match) => (
                  <div key={match.id} className={styles.card}>
                    <div className={styles.rowBetween}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{match.gameId}</div>
                        <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.6)' }}>Host: {match.hostName}</div>
                      </div>
                      <span className={`${styles.pill} ${styles.pillSuccess}`}>{match.roomCode}</span>
                    </div>
                    <div className={styles.row} style={{ marginTop: 12 }}>
                      <Link href={`/?room=${match.roomCode}`} className={styles.btn}>{managerOnly ? 'Spectate' : 'Spectate / join'}</Link>
                      {(match.hostUserId === me?.id || detail.canManage) && (
                        <button className={styles.btnGhost} onClick={() => void handleEndMatch(match.id)}>End</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>No live matches. When a teammate starts a game they can announce it here.</div>
            )}

            {detail.canAnnounce ? (
              <form className={styles.card} onSubmit={handleAnnounce} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                <h3 className={styles.sectionTitle}>Announce a match</h3>
                <div className={styles.row} style={{ gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label className={styles.label}>Game id</label>
                    <input className={styles.input} placeholder="tic-tac-toe" value={gameId} onChange={event => setGameId(event.target.value)} />
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label className={styles.label}>Room code</label>
                    <input className={styles.input} placeholder="ABCD" value={roomCode} onChange={event => setRoomCode(event.target.value.toUpperCase())} maxLength={8} />
                  </div>
                  <div style={{ alignSelf: 'flex-end' }}>
                    <button className={styles.btn} type="submit" disabled={!gameId.trim() || !roomCode.trim()}>Announce</button>
                  </div>
                </div>
              </form>
            ) : (
              <div className={styles.card} style={{ marginTop: 12 }}>
                <p className={styles.mutedText}>Team managers can support and end matches, but they are not player seats for team games.</p>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Members</h2>
            {detail.members && detail.members.length > 0 ? (
              <table className={styles.table}>
                <thead><tr><th>Name</th><th>Role</th><th>Joined</th><th /></tr></thead>
                <tbody>
                  {detail.members.map((member) => {
                    const canEditMember = member.userId !== detail.team.ownerId && detail.canAssignLeadership;
                    const canRemoveMember = member.userId !== detail.team.ownerId && detail.canManage && (detail.canAssignLeadership || member.role === 'player');
                    return (
                      <tr key={member.userId}>
                        <td>
                          {member.user?.name ?? member.userId}
                          {member.user?.isGuest && <span className={`${styles.pill} ${styles.pillMuted}`} style={{ marginLeft: 8 }}>guest</span>}
                          {member.userId === detail.team.ownerId && <span className={`${styles.pill}`} style={{ marginLeft: 8 }}>owner</span>}
                        </td>
                        <td>
                          {canEditMember ? (
                            <select className={styles.select} value={member.role} onChange={event => void handleSetRole(member.userId, event.target.value as TeamRole)}>
                              <option value="player">player</option>
                              <option value="captain">captain</option>
                              <option value="manager">manager</option>
                            </select>
                          ) : (
                            <span className={`${styles.pill} ${member.role === 'player' ? styles.pillMuted : ''}`}>{member.role}</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: 'rgba(229,231,235,0.6)' }}>{new Date(member.joinedAt).toLocaleDateString()}</td>
                        <td>
                          {canRemoveMember && (
                            <button className={`${styles.btnGhost} ${styles.btnSm}`} onClick={() => void handleRemove(member.userId)}>Remove</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>No members yet.</div>
            )}
          </section>
        </>
      ) : (
        <div className={styles.empty}>Join this team to see its roster and match feed.</div>
      )}
    </div>
  );
}