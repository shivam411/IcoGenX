'use client';

import { useRouter } from 'next/navigation';
import GameSocialBar from './GameSocialBar';
import GameIcon from './GameIcon';
import { useGameSocial } from '@/lib/useGameSocial';
import type { GameCatalogItem } from '@/lib/gameMetadata';
import styles from '../app/page.module.css';

interface Props {
  game: GameCatalogItem;
  onOpenVariants: (game: GameCatalogItem) => void;
  onNotifyComingSoon?: (game: GameCatalogItem) => void;
}

/**
 * Single homepage card. Owns its own social state subscription so each card
 * fetches once and re-renders independently of its siblings.
 */
export default function GameCard({ game, onOpenVariants, onNotifyComingSoon }: Props) {
  const router = useRouter();
  const { recordPlay } = useGameSocial(game.id);
  const previewLead = game.rules[0] || game.description;
  const previewSteps = game.previewSteps.slice(0, 3);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (game.isComingSoon) {
      if (onNotifyComingSoon) {
        onNotifyComingSoon(game);
      }
      return;
    }
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
      className={`glass-card ${styles.gameCard} ${game.featured ? styles.featuredCard : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (game.isComingSoon) {
            if (onNotifyComingSoon) onNotifyComingSoon(game);
          } else {
            handleOpen(e as unknown as React.MouseEvent);
          }
        }
      }}
    >
      <div className={styles.variantBadge}>
        {game.isComingSoon ? 'Coming Soon 🔒' : game.variants?.length ? `${game.variants.length} variants` : '1 mode'}
      </div>
      <div className={styles.cardBanner} style={{ background: game.gradient }}>
        <GameIcon icon={game.icon} className={styles.cardIcon} />
        <div className={styles.previewScene} aria-hidden>
          <div className={styles.previewArena}>
            {Array.from({ length: 6 }).map((_, index) => (
              <span key={index} className={styles.previewNode} />
            ))}
          </div>
          <div className={styles.previewTimeline}>
            {previewSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>
        <div className={styles.gameplayPreview}>
          <div className={styles.previewTitle}>How It Plays</div>
          <p className={styles.previewLead}>{previewLead}</p>
          <div className={styles.previewSteps}>
            {game.previewSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.tagRow}>
          <span className={`badge ${game.badgeClass}`}>
            {game.category}
          </span>
          <span className={`${styles.difficultyBadge} ${styles[game.difficulty]}`}>
            {game.difficulty}
          </span>
        </div>
        <h2 className={styles.cardTitle}>
          {game.name}
          {game.isComingSoon && <span className={styles.comingSoonTag}>Soon</span>}
        </h2>
        <p className={styles.cardDesc}>{game.description}</p>
        <div className={styles.socialRow}>
          {!game.isComingSoon && <GameSocialBar gameId={game.id} compact />}
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.playerCount}>👥 {game.playerLabel}</span>
          <span className={styles.estTime}>⏱️ {game.estimatedTime}</span>
          <span className={`btn ${game.isComingSoon ? 'btn-ghost' : 'btn-primary'} btn-sm ${styles.playBtn}`}>
            {game.isComingSoon ? 'Info' : 'Play Now →'}
          </span>
        </div>
      </div>
    </div>
  );
}
