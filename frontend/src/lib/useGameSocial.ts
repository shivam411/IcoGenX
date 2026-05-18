'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SocialState {
  likes: number;
  plays: number;
  favorites: number;
  liked: boolean;
  favorited: boolean;
}

export type SocialAction = 'like' | 'unlike' | 'favorite' | 'unfavorite' | 'play';

const cache = new Map<string, SocialState>();
const subscribers = new Map<string, Set<(s: SocialState) => void>>();

function setCached(gameId: string, state: SocialState) {
  cache.set(gameId, state);
  subscribers.get(gameId)?.forEach(fn => fn(state));
}

async function fetchSocial(gameId: string): Promise<SocialState> {
  const res = await fetch(`/api/games/${gameId}/social`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`social_fetch_failed_${res.status}`);
  const data = await res.json();
  return {
    likes: data.social?.likes ?? 0,
    plays: data.social?.plays ?? 0,
    favorites: data.social?.favorites ?? 0,
    liked: !!data.interaction?.liked,
    favorited: !!data.interaction?.favorited,
  };
}

async function mutate(gameId: string, action: SocialAction): Promise<SocialState> {
  const res = await fetch(`/api/games/${gameId}/social`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(`social_mutate_failed_${res.status}`);
  const data = await res.json();
  return {
    likes: data.social?.likes ?? 0,
    plays: data.social?.plays ?? 0,
    favorites: data.social?.favorites ?? 0,
    liked: !!data.interaction?.liked,
    favorited: !!data.interaction?.favorited,
  };
}

export function useGameSocial(gameId: string) {
  const [state, setState] = useState<SocialState | null>(() => cache.get(gameId) ?? null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sub = (s: SocialState) => { if (!cancelled) setState(s); };
    if (!subscribers.has(gameId)) subscribers.set(gameId, new Set());
    subscribers.get(gameId)!.add(sub);

    const cached = cache.get(gameId);
    if (cached) setState(cached);
    fetchSocial(gameId)
      .then(s => { if (!cancelled) setCached(gameId, s); })
      .catch(err => console.warn('[social] fetch failed', err));

    return () => {
      cancelled = true;
      subscribers.get(gameId)?.delete(sub);
    };
  }, [gameId]);

  const toggleLike = useCallback(async () => {
    const current = cache.get(gameId);
    if (busy) return;
    setBusy(true);
    try {
      const next = await mutate(gameId, current?.liked ? 'unlike' : 'like');
      setCached(gameId, next);
    } catch (err) {
      console.warn('[social] like failed', err);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [gameId, busy]);

  const toggleFavorite = useCallback(async () => {
    const current = cache.get(gameId);
    if (busy) return;
    setBusy(true);
    try {
      const next = await mutate(gameId, current?.favorited ? 'unfavorite' : 'favorite');
      setCached(gameId, next);
    } catch (err) {
      console.warn('[social] favorite failed', err);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [gameId, busy]);

  const recordPlay = useCallback(async () => {
    try {
      const next = await mutate(gameId, 'play');
      setCached(gameId, next);
    } catch (err) {
      console.warn('[social] play failed', err);
    }
  }, [gameId]);

  return { state, busy, toggleLike, toggleFavorite, recordPlay };
}

/** Test-only: clear shared cache. */
export function __resetSocialCacheForTests() {
  cache.clear();
  subscribers.clear();
}
