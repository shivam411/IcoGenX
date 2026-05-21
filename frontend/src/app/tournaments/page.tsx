'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { GAME_CATALOG } from '@/lib/gameMetadata';
import styles from '../app-shell.module.css';

interface TournamentSummary {
  id: string;
  name: string;
  gameId: string;
  status: 'draft' | 'live' | 'completed';
  format: 'knockout';
  organizerId: string;
  teamId?: string;
  createdAt: number;
  participants: unknown[];
}

export default function TournamentsPage() {
  const { data: session } = useSession();
  const me = session?.user as { id?: string; role?: string } | undefined;
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [gameId, setGameId] = useState(GAME_CATALOG[0]?.id ?? '');
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [myRole, setMyRole] = useState<string>('player');
  const [myTeams, setMyTeams] = useState<Array<{ id: string; name: string; role: 'captain' | 'manager' | 'player' }>>([]);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tournaments');
      const data = await res.json();
      setTournaments(data.tournaments ?? []);
    } finally { setLoading(false); }
    const meRes = await fetch('/api/me');
    if (meRes.ok) {
      const data = await meRes.json();
      setMyRole(data.user?.role ?? 'player');
      setMyTeams(data.teams ?? []);
    }
  };
  useEffect(() => { void reload(); }, []);

  const canCreate = myRole === 'admin' || myRole === 'tournament_manager' || myTeams.some(t => t.role === 'captain' || t.role === 'manager');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), gameId, teamId: teamId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'failed');
      setName(''); setTeamId('');
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tournaments</h1>
          <p className={styles.subtitle}>Knockout brackets. Seed your participants and we&apos;ll generate matches; results auto-advance the winners.</p>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>All tournaments</h2>
        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : tournaments.length === 0 ? (
          <div className={styles.empty}>No tournaments yet.</div>
        ) : (
          <div className={styles.cardGrid}>
            {tournaments.map(t => (
              <Link key={t.id} href={`/tournaments/${t.id}`} className={styles.cardLink}>
                <div className={styles.card}>
                  <div className={styles.rowBetween}>
                    <strong>{t.name}</strong>
                    <span className={`${styles.pill} ${t.status === 'live' ? styles.pillSuccess : t.status === 'completed' ? styles.pillMuted : ''}`}>{t.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.6)', marginTop: 4 }}>{t.gameId} · {t.participants.length} entrants · {t.format}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {me && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Create a tournament</h2>
          {!canCreate ? (
            <div className={styles.empty}>You need an admin / tournament_manager role, or team leadership access, to create tournaments.</div>
          ) : (
            <form className={styles.card} onSubmit={handleCreate} style={{ display: 'grid', gap: 12 }}>
              <div>
                <label className={styles.label}>Name</label>
                <input className={styles.input} value={name} onChange={e => setName(e.target.value)} maxLength={96} required />
              </div>
              <div>
                <label className={styles.label}>Game</label>
                <select className={styles.select} value={gameId} onChange={e => setGameId(e.target.value)}>
                  {GAME_CATALOG.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className={styles.label}>Team (optional)</label>
                <select className={styles.select} value={teamId} onChange={e => setTeamId(e.target.value)}>
                  <option value="">— None —</option>
                  {myTeams.map(t => <option key={t.id} value={t.id}>{t.name}{t.role === 'captain' || t.role === 'manager' ? ` (${t.role})` : ''}</option>)}
                </select>
              </div>
              {error && <div className={styles.error}>{error}</div>}
              <div><button className={styles.btn} type="submit" disabled={busy || !name.trim()}>{busy ? 'Creating…' : 'Create'}</button></div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
