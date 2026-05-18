'use client';

import { useRouter } from 'next/navigation';
import GameSocialBar from './GameSocialBar';
import { useGameSocial } from '@/lib/useGameSocial';
import type { GameCatalogItem } from '@/lib/gameMetadata';
import styles from '../app/page.module.css';

interface Props {
  game: GameCatalogItem;
  onOpenVariants: (game: GameCatalogItem) => void;
}

/**
 * Single homepage card. Owns its own social state subscription so each card
 * fetches once and re-renders independently of its siblings.
 */
export default function GameCard({ game, onOpenVariants }: Props) {
  const router = useRouter();
  const { recordPlay } = useGameSocial(game.id);

  const handleOpen = () => {
    void recordPlay();
    if (game.variants) {
      onOpenVariants(game);
    } else {
      router.push(`/games/${game.id}`);
    }
  };

  return (
    <div
      onClick={handleOpen}
      className={`glass-card ${styles.gameCard}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      }}
    >
      <div className={styles.variantBadge}>
        {game.variants?.length ? `${game.variants.length} variants` : '1 mode'}
      </div>
      <div className={styles.cardBanner} style={{ background: game.gradient }}>
        <span>{game.icon}</span>
        <div className={styles.gameplayPreview}>
          <div className={styles.previewTitle}>Gameplay</div>
          <div className={styles.previewSteps}>
            {game.previewSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={`badge ${game.badgeClass}`} style={{ marginBottom: 10 }}>
          {game.category}
        </div>
        <h2 className={styles.cardTitle}>{game.name}</h2>
        <p className={styles.cardDesc}>{game.description}</p>
        <div className={styles.socialRow}>
          <GameSocialBar gameId={game.id} compact />
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.playerCount}>👥 {game.players}</span>
          <span className={`btn btn-primary btn-sm ${styles.playBtn}`}>Play Now →</span>
        </div>
      </div>
    </div>
  );
}
