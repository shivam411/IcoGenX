'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { GAME_CATALOG } from '@/lib/gameMetadata';
import AdSlot from '@/components/AdSlot';

interface MeResponse {
  user: { id: string; name: string; image?: string; isGuest: boolean; createdAt?: number } | null;
  interactions: Array<{ gameId: string; liked: boolean; favorited: boolean; plays: number }>;
}

export default function ProfilePage() {
  const { status } = useSession();
  const [data, setData] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: MeResponse) => { if (!cancelled) setData(d); })
      .catch(err => { if (!cancelled) setError(String(err)); });
    return () => { cancelled = true; };
  }, [status]);

  if (status === 'loading') {
    return <main style={{ padding: 40, color: '#fff' }}>Loading…</main>;
  }

  if (status === 'unauthenticated') {
    return (
      <main style={{ padding: 40, color: '#fff', maxWidth: 600, margin: '0 auto' }}>
        <h1>Sign in to see your profile</h1>
        <p style={{ opacity: 0.7 }}>Sign in or play as guest from the header to see your favorites and play history.</p>
        <Link href="/" style={{ color: '#7c5cff' }}>← Back to games</Link>
      </main>
    );
  }

  const favorites = (data?.interactions ?? []).filter(i => i.favorited);
  const recent = (data?.interactions ?? []).filter(i => i.plays > 0).sort((a, b) => b.plays - a.plays).slice(0, 6);
  const liked = (data?.interactions ?? []).filter(i => i.liked);
  const gameById = new Map(GAME_CATALOG.map(g => [g.id, g]));

  return (
    <main style={{ padding: '32px 24px', color: '#fff', maxWidth: 960, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Your profile</h1>
        {data?.user && (
          <p style={{ opacity: 0.7, marginTop: 6 }}>
            {data.user.name}{data.user.isGuest ? ' (guest)' : ''}
          </p>
        )}
      </header>

      {error && <p style={{ color: '#ff5d8a' }}>Failed to load: {error}</p>}

      <Section title={`Favorites (${favorites.length})`} empty="Nothing favorited yet — tap the ☆ on any game.">
        {favorites.map(f => {
          const g = gameById.get(f.gameId);
          if (!g) return null;
          return <GameRow key={f.gameId} id={f.gameId} name={g.name} icon={g.icon} sub={`${f.plays} plays`} />;
        })}
      </Section>

      <Section title="Recently played" empty="No plays recorded yet.">
        {recent.map(r => {
          const g = gameById.get(r.gameId);
          if (!g) return null;
          return <GameRow key={r.gameId} id={r.gameId} name={g.name} icon={g.icon} sub={`${r.plays} plays`} />;
        })}
      </Section>

      <Section title={`Liked (${liked.length})`} empty="Nothing liked yet.">
        {liked.map(l => {
          const g = gameById.get(l.gameId);
          if (!g) return null;
          return <GameRow key={l.gameId} id={l.gameId} name={g.name} icon={g.icon} sub="♥" />;
        })}
      </Section>

      <AdSlot slotId="profile-rectangle" shape="rectangle" label="Profile rectangle" />
    </main>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const isEmpty = !children || (Array.isArray(children) && children.filter(Boolean).length === 0);
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, opacity: 0.85, margin: '0 0 12px' }}>{title}</h2>
      {isEmpty ? <p style={{ opacity: 0.5, fontSize: 14 }}>{empty}</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {children}
        </div>
      )}
    </section>
  );
}

function GameRow({ id, name, icon, sub }: { id: string; name: string; icon: string; sub: string }) {
  return (
    <Link
      href={`/games/${id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, textDecoration: 'none', color: '#fff',
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{name}</span>
        <span style={{ display: 'block', fontSize: 12, opacity: 0.6 }}>{sub}</span>
      </span>
    </Link>
  );
}
