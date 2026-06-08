'use client';

import { useGame } from '@/context/GameContext';
import { getGameCatalogItem, getGameInfo } from '@/lib/gameMetadata';
import GameIcon from './GameIcon';
import styles from './GameInviteBanner.module.css';

export default function GameInviteBanner() {
  const { activeInvite, acceptGameInvite, declineGameInvite } = useGame();

  if (!activeInvite) return null;

  const game = getGameCatalogItem(activeInvite.gameType);
  const gameInfo = getGameInfo(activeInvite.gameType, activeInvite.variant);
  const variant = game?.variants?.find((item) => item.id === activeInvite.variant);
  const gameName = game?.name || activeInvite.gameType;
  const variantText = variant ? ` (${variant.name})` : activeInvite.variant ? ` (${activeInvite.variant})` : '';
  const inviteIcon = gameInfo?.icon || variant?.icon || game?.icon || activeInvite.gameType;

  return (
    <div className={styles.container} role="alert" aria-live="assertive">
      <div className={styles.banner}>
        <div className={styles.glow} />
        <div className={styles.content}>
          <div className={styles.avatar}>
            <span className={styles.avatarInitial}>
              {activeInvite.fromName.charAt(0).toUpperCase()}
            </span>
          </div>
          <GameIcon icon={inviteIcon} className={styles.gameIcon} />
          <div className={styles.details}>
            <h4 className={styles.title}>Game Invitation</h4>
            <p className={styles.message}>
              <strong className={styles.highlight}>{activeInvite.fromName}</strong> invites you to play{' '}
              <span className={styles.game}>{gameName}{variantText}</span>!
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.acceptBtn}
            onClick={() => acceptGameInvite(activeInvite)}
          >
            Accept
          </button>
          <button
            type="button"
            className={styles.declineBtn}
            onClick={() => declineGameInvite(activeInvite.inviteId)}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
