/* frontend/src/app/games/memory-flip/page.tsx */
'use client';

import { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function MemoryFlipBoard({
  gameState,
  playerNumber,
  opponentName,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [wrongFlipIdx, setWrongFlipIdx] = useState<number | null>(null);

  useEffect(() => {
    if (gameState?.lastFlipCorrect === false) {
      setWrongFlipIdx(gameState.lastFlip);
      const timer = setTimeout(() => setWrongFlipIdx(null), 600);
      return () => clearTimeout(timer);
    }
  }, [gameState?.lastFlip, gameState?.lastFlipCorrect]);

  const visibleValues: (number | null)[] = gameState.visibleValues;
  const revealed: boolean[] = gameState.revealed;
  const nextExpected: number = gameState.nextExpected;
  const p1Progress: number = gameState.player1Progress;
  const p2Progress: number = gameState.player2Progress;
  const opponentLabel = opponentName || 'Opponent';

  const handleFlip = (idx: number) => {
    if (!isMyTurn || revealed[idx] || gameOver) return;
    sendAction({ game: 'MemoryFlip', card_index: idx });
  };

  return (
    <div>
      <div className={styles.progressBar}>
        <span className={styles.progressItem}>
          🎮 You: <strong>{playerNumber === 0 ? p1Progress : p2Progress}/9</strong>
        </span>
        <span className={styles.progressItem}>
          👤 {opponentLabel}: <strong>{playerNumber === 0 ? p2Progress : p1Progress}/9</strong>
        </span>
      </div>

      <div className={styles.nextHint}>
        Looking for: <strong>{nextExpected}</strong>
      </div>

      <div className={styles.grid}>
        {visibleValues.map((val: number | null, idx: number) => {
          const isRevealed = revealed[idx];
          const isWrong = wrongFlipIdx === idx;

          return (
            <div
              key={idx}
              className={`${styles.flipCard} ${isRevealed ? styles.flipped : ''} ${isWrong ? styles.wrongFlip : ''}`}
              onClick={() => handleFlip(idx)}
            >
              <div className={styles.flipCardInner}>
                <div className={styles.flipFront}>{val}</div>
                <div className={styles.flipBack} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MemoryFlipPage() {
  return (
    <GameTemplate
      gameType="memory_flip"
      gameName="Sequence Memory Flip"
      gameIcon="memory-flip"
      accentColor="#ec4899"
      winEmoji="🧠"
      winTitle="Perfect Memory!"
      loseTitle="Outplayed!"
    >
      {(props) => <MemoryFlipBoard {...props} />}
    </GameTemplate>
  );
}
