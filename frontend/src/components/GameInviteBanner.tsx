'use client';

import { useGame } from '@/context/GameContext';
import styles from './GameInviteBanner.module.css';

export default function GameInviteBanner() {
  const { activeInvite, acceptGameInvite, declineGameInvite } = useGame();

  if (!activeInvite) return null;

  const gameNames: Record<string, string> = {
    tic_tac_toe: 'Tic-Tac-Toe',
    bluff_card: 'Bluff Card',
    memory_flip: 'Sequence Memory Flip',
    higher_lower: 'Higher / Lower',
    stop_clock: 'Stop-Clock',
    shut_the_box: 'Dice Tug-of-War',
    code_guess: 'Code Breaker',
  };

  const gameName = gameNames[activeInvite.gameType] || activeInvite.gameType;
  const variantText = activeInvite.variant ? ` (${activeInvite.variant})` : '';

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
            onClick={() => declineGameInvite(activeInvite.inviteId, activeInvite.fromUserId)}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
