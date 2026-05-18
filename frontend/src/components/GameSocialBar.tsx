'use client';

import { useGameSocial } from '@/lib/useGameSocial';
import styles from './GameSocialBar.module.css';

interface Props {
  gameId: string;
  /** Compact variant for use inside cards (smaller text, no labels). */
  compact?: boolean;
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

export default function GameSocialBar({ gameId, compact = false }: Props) {
  const { state, busy, toggleLike, toggleFavorite } = useGameSocial(gameId);
  const likes = state?.likes ?? 0;
  const favorites = state?.favorites ?? 0;
  const plays = state?.plays ?? 0;
  const liked = !!state?.liked;
  const favorited = !!state?.favorited;

  return (
    <div className={`${styles.bar} ${compact ? styles.compact : ''}`}>
      <button
        type="button"
        className={`${styles.btn} ${liked ? styles.btnActiveLike : ''}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggleLike(); }}
        disabled={busy}
        aria-pressed={liked}
        aria-label={liked ? `Unlike (${likes} likes)` : `Like (${likes} likes)`}
        title={liked ? 'Unlike' : 'Like'}
      >
        <span className={styles.icon} aria-hidden>{liked ? '♥' : '♡'}</span>
        <span className={styles.count}>{formatCount(likes)}</span>
      </button>
      <button
        type="button"
        className={`${styles.btn} ${favorited ? styles.btnActiveFav : ''}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggleFavorite(); }}
        disabled={busy}
        aria-pressed={favorited}
        aria-label={favorited ? `Remove from favorites (${favorites} favorites)` : `Add to favorites (${favorites} favorites)`}
        title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <span className={styles.icon} aria-hidden>{favorited ? '★' : '☆'}</span>
        <span className={styles.count}>{formatCount(favorites)}</span>
      </button>
      <div className={styles.plays} title={`${plays} plays`} aria-label={`${plays} plays`}>
        <span className={styles.icon} aria-hidden>▶</span>
        <span className={styles.count}>{formatCount(plays)}</span>
      </div>
    </div>
  );
}
