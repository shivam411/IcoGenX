'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from '../app-shell.module.css';

interface Snapshot {
  totalUsers: number; totalGuests: number; totalTeams: number; totalTournaments: number;
  totalActiveMatches: number; totalPlays: number; totalLikes: number; totalFavorites: number;
  topGames: Array<{ gameId: string; plays: number; likes: number; favorites: number }>;
}
interface UserRow { id: string; name: string; email?: string; isGuest: boolean; role?: string; createdAt: number; }
interface Team { id: string; name: string; slug: string; }
interface Tournament { id: string; name: string; gameId: string; status: string; }
interface ActiveMatch { id: string; teamId: string; gameId: string; roomCode: string; hostName: string; }

export default function AdminPage() {
  const { data: session } = useSession();
  const me = session?.user as { id?: string; role?: string } | undefined;
  const isAdmin = me?.role === 'admin';
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [overview, setOverview] = useState<{ teams: Team[]; tournaments: Tournament[]; activeMatches: ActiveMatch[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const reload = async () => {
    setLoading(true); setErr('');
    try {
      const [aRes, uRes, oRes] = await Promise.all([
        fetch('/api/admin/analytics'),
        fetch('/api/admin/users'),
        fetch('/api/admin/overview'),
      ]);
      if (aRes.ok) setSnapshot((await aRes.json()).snapshot); else setErr('analytics: ' + aRes.status);
      if (uRes.ok) setUsers((await uRes.json()).users); else if (uRes.status === 403) setUsers([]);
      if (oRes.ok) setOverview(await oRes.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, []);

  const setRole = async (userId: string, role: string) => {
    await fetch('/api/admin/users', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, role }) });
    await reload();
  };

  if (!me) return <div className={styles.shell}><div className={styles.empty}>Sign in to view admin tools.</div></div>;

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin &amp; analytics</h1>
          <p className={styles.subtitle}>Your role: <span className={styles.pill}>{me.role ?? 'player'}</span></p>
        </div>
      </div>
      {err && <div className={styles.error}>{err}</div>}
      {loading && <div className={styles.empty}>Loading…</div>}

      {snapshot && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Platform stats</h2>
          <div className={styles.statGrid}>
            <Stat label="Users" value={snapshot.totalUsers} />
            <Stat label="Guests" value={snapshot.totalGuests} />
            <Stat label="Teams" value={snapshot.totalTeams} />
            <Stat label="Tournaments" value={snapshot.totalTournaments} />
            <Stat label="Live matches" value={snapshot.totalActiveMatches} />
            <Stat label="Total plays" value={snapshot.totalPlays} />
            <Stat label="Likes" value={snapshot.totalLikes} />
            <Stat label="Favorites" value={snapshot.totalFavorites} />
          </div>
        </section>
      )}

      {snapshot && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Top games</h2>
          {snapshot.topGames.length === 0 ? (
            <div className={styles.empty}>No plays recorded yet.</div>
          ) : (
            <table className={styles.table}>
              <thead><tr><th>Game</th><th>Plays</th><th>Likes</th><th>Favorites</th></tr></thead>
              <tbody>
                {snapshot.topGames.map(g => (
                  <tr key={g.gameId}><td>{g.gameId}</td><td>{g.plays}</td><td>{g.likes}</td><td>{g.favorites}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {overview && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Active matches</h2>
          {overview.activeMatches.length === 0 ? (
            <div className={styles.empty}>None.</div>
          ) : (
            <table className={styles.table}>
              <thead><tr><th>Room</th><th>Game</th><th>Host</th><th>Team</th></tr></thead>
              <tbody>
                {overview.activeMatches.map(m => (
                  <tr key={m.id}><td>{m.roomCode}</td><td>{m.gameId}</td><td>{m.hostName}</td><td><Link href={`/teams/${m.teamId}`}>{m.teamId.slice(0, 8)}</Link></td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {isAdmin && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>User roles</h2>
          {users.length === 0 ? (
            <div className={styles.empty}>No users yet.</div>
          ) : (
            <table className={styles.table}>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}{u.isGuest && <span className={`${styles.pill} ${styles.pillMuted}`} style={{ marginLeft: 6 }}>guest</span>}</td>
                    <td style={{ fontSize: 12, color: 'rgba(229,231,235,0.6)' }}>{u.email ?? '—'}</td>
                    <td>
                      {u.isGuest ? <span className={`${styles.pill} ${styles.pillMuted}`}>player</span> : (
                        <select className={styles.select} value={u.role ?? 'player'} onChange={e => void setRole(u.id, e.target.value)}>
                          <option value="player">player</option>
                          <option value="tournament_manager">tournament_manager</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'rgba(229,231,235,0.6)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statValue}>{value.toLocaleString()}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}
