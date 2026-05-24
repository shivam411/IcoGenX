/* frontend/src/components/GameOverOverlay.tsx */
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import styles from './game-shared.module.css';

interface GameOverOverlayProps {
  winEmoji?: string;
  winTitle?: string;
  loseTitle?: string;
  drawTitle?: string;
  children?: React.ReactNode;
}

export default function GameOverOverlay({
  winEmoji,
  winTitle = 'You Win!',
  loseTitle = 'You Lose!',
  drawTitle = 'It\'s a Draw!',
  children,
}: GameOverOverlayProps) {
  const router = useRouter();
  const {
    winner,
    playerNumber,
    playerName,
    opponentName,
    allPlayerNames,
    matchFormat,
    gameOverReason,
    scores,
    playAgainRequested,
    opponentPlayAgainRequested,
    requestPlayAgain,
    leaveRoom,
  } = useGame();

  const getWinnerIndex = (w: string | null): number | null => {
    if (!w) return null;
    if (w.startsWith('Player ')) {
      const num = parseInt(w.slice('Player '.length), 10);
      if (!isNaN(num)) return num - 1;
    }
    return null;
  };

  const winnerIndex = getWinnerIndex(winner);
  const isDraw = winner === null || winnerIndex === null;
  const isWinner = !isDraw && winnerIndex === playerNumber;

  const winnerName = !isDraw && winnerIndex !== null
    ? (allPlayerNames[winnerIndex] || winner || `Player ${winnerIndex + 1}`)
    : '';

  const getWinnerDisplayName = () => {
    if (isDraw) return drawTitle;
    if (isWinner) return winTitle;
    return `${winnerName} Wins!`;
  };

  const defaultEmoji = isDraw ? '🤝' : isWinner ? '🎉' : '😢';
  const displayEmoji = winEmoji && isWinner ? winEmoji : defaultEmoji;

  const handleGoHome = () => {
    leaveRoom();
    router.push('/');
  };

  // Determine other players who want to play again
  const getPlayAgainStatusText = () => {
    if (!playAgainRequested) {
      if (opponentPlayAgainRequested) {
        return `${opponentName || 'Opponent'} wants to play again!`;
      }
      return null;
    }

    // I have voted, waiting for others
    if (matchFormat === 'series_5' && gameOverReason !== 'SeriesCompleted') {
      return 'Waiting for next game...';
    }
    return 'Waiting for other players...';
  };

  const statusText = getPlayAgainStatusText();

  return (
    <div className={styles.winOverlay} role="dialog" aria-modal="true" aria-labelledby="win-title">
      <div className={styles.winCard}>
        <span className={styles.winEmoji}>{displayEmoji}</span>
        <h2 id="win-title" className={styles.winTitle}>
          {getWinnerDisplayName()}
        </h2>

        <p className={styles.winSub}>
          {isDraw 
            ? 'A closely contested battle! Nobody was willing to yield.' 
            : isWinner 
            ? 'Superb gameplay! You outmaneuvered your opponents.' 
            : `${winnerName} claims victory in this round.`}
        </p>

        {/* Custom game-specific details (like times, guesses) */}
        {children}

        {/* Match / Series Scoreboard */}
        <div className={styles.matchResults}>
          <div className={styles.seriesHeader}>
            {matchFormat === 'series_5' 
              ? (gameOverReason === 'SeriesCompleted' ? '🏆 Series Complete' : '⚡ Series Progress') 
              : '📊 Match Score'}
          </div>
          <div className={styles.scoreRow}>
            <span className={`${styles.scorePlayer} ${styles.scorePlayerLeft} ${!isDraw && winnerIndex === 0 ? styles.scoreHighlight : ''}`}>
              {allPlayerNames[0] || playerName || 'Player 1'}
            </span>
            <span className={styles.scoreNumber}>
              {scores[0] ?? 0} - {scores[1] ?? 0}
            </span>
            <span className={`${styles.scorePlayer} ${styles.scorePlayerRight} ${!isDraw && winnerIndex === 1 ? styles.scoreHighlight : ''}`}>
              {allPlayerNames[1] || opponentName || 'Player 2'}
            </span>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={requestPlayAgain}
            disabled={playAgainRequested}
          >
            {playAgainRequested
              ? 'Ready'
              : matchFormat === 'series_5'
              ? (gameOverReason === 'SeriesCompleted' ? '🏆 Start New Series' : '⚡ Play Next Game')
              : '🔄 Play Again'}
          </button>

          {statusText && (
            <p className={styles.pendingVoteText}>{statusText}</p>
          )}

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleGoHome}
          >
            🏠 Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
