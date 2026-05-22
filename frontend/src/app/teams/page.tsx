'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from '../app-shell.module.css';

interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  joinCode?: string;
  description?: string;
  role: 'captain' | 'manager' | 'player';
  globalManager?: boolean;
  createdAt: number;
}

export default function TeamsPage() {
  const { status } = useSession();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams ?? []);
      } else {
        setTeams([]);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (status === 'authenticated') void reload(); else if (status === 'unauthenticated') setLoading(false); }, [status]);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: (slug || slugify(name)).trim(), description: description.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to create team');
      setName(''); setSlug(''); setDescription('');
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  };

  if (status === 'unauthenticated') {
    return (
      <div className={styles.shell}>
        <h1 className={styles.title}>Teams</h1>
        <p className={styles.subtitle}>Sign in to create and manage teams.</p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Teams</h1>
          <p className={styles.subtitle}>Group up with friends to spectate each other&apos;s matches and run mini-tournaments.</p>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your teams</h2>
        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : teams.length === 0 ? (
          <div className={styles.empty}>You&apos;re not on any teams yet. Create one below.</div>
        ) : (
          <div className={styles.cardGrid}>
            {teams.map(t => (
              <Link key={t.id} href={`/teams/${t.id}`} className={styles.cardLink}>
                <div className={styles.card}>
                  <div className={styles.rowBetween}>
                    <strong>{t.name}</strong>
                    <span className={`${styles.pill} ${t.role === 'captain' ? '' : styles.pillMuted}`}>{t.role}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.6)', marginTop: 4 }}>/{t.slug}</div>
                  {(t.role === 'captain' || t.role === 'manager') && t.joinCode && (
                    <div className={styles.codeLine} style={{ marginTop: 8 }}>
                      Join code <strong>{t.joinCode}</strong>
                    </div>
                  )}
                  {t.globalManager && <div style={{ marginTop: 8 }}><span className={styles.pill}>tournament manager access</span></div>}
                  {t.description && <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(229,231,235,0.8)' }}>{t.description}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Create a team</h2>
        <form className={styles.card} onSubmit={handleCreate} style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className={styles.label} htmlFor="t-name">Name</label>
            <input id="t-name" className={styles.input} value={name} onChange={e => setName(e.target.value)} maxLength={64} required />
          </div>
          <div>
            <label className={styles.label} htmlFor="t-slug">Slug (URL-friendly)</label>
            <input id="t-slug" className={styles.input} value={slug} placeholder={slugify(name) || 'awesome-team'} onChange={e => setSlug(e.target.value.toLowerCase())} maxLength={32} />
          </div>
          <div>
            <label className={styles.label} htmlFor="t-desc">Description (optional)</label>
            <textarea id="t-desc" className={styles.textarea} value={description} onChange={e => setDescription(e.target.value)} maxLength={280} />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div>
            <button type="submit" className={styles.btn} disabled={busy || !name.trim()}>{busy ? 'Creating…' : 'Create team'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
