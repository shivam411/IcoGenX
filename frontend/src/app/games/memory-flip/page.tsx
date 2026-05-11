'use client';

import { useState, useEffect } from 'react';
import Lobby from '@/components/Lobby';
import { useGame } from '@/context/GameContext';
import styles from './game.module.css';
import Link from 'next/link';

function MemoryFlipBoard() {
  const { gameState, playerNumber, sendAction, gameOver, winner } = useGame();
  const [wrongFlipIdx, setWrongFlipIdx] = useState<number | null>(null);

  useEffect(() => {
    if (gameState?.lastFlipCorrect === false) {
      setWrongFlipIdx(gameState.lastFlip);
      const timer = setTimeout(() => setWrongFlipIdx(null), 600);
      return () => clearTimeout(timer);
    }
  }, [gameState?.lastFlip, gameState?.lastFlipCorrect]);

  if (!gameState) return null;

  const visibleValues: (number | null)[] = gameState.visibleValues;
  const revealed: boolean[] = gameState.revealed;
  const nextExpected: number = gameState.nextExpected;
  const currentPlayer: number = gameState.currentPlayer;
  const isMyTurn = currentPlayer === playerNumber;
  const p1Progress: number = gameState.player1Progress;
  const p2Progress: number = gameState.player2Progress;

  const handleFlip = (idx: number) => {
    if (!isMyTurn || revealed[idx] || gameOver) return;
    sendAction({ game: 'MemoryFlip', card_index: idx });
  };

  return (
    <div className={styles.gameWrapper}>
      <Link href="/" className={`btn btn-ghost btn-sm ${styles.backBtn}`}>← Back</Link>

      <div className={styles.turnInfo}>
        {isMyTurn ? '🎯 Your turn — find the next card!' : '⏳ Opponent is flipping...'}
      </div>

      <div className={styles.progressBar}>
        <span className={styles.progressItem}>
          🎮 You: <strong>{playerNumber === 0 ? p1Progress : p2Progress}/9</strong>
        </span>
        <span className={styles.progressItem}>
          👤 Opponent: <strong>{playerNumber === 0 ? p2Progress : p1Progress}/9</strong>
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
                <div className={styles.flipFront}>
                  {val}
                </div>
                <div className={styles.flipBack} />
              </div>
            </div>
          );
        })}
      </div>

      {gameOver && (
        <div className={styles.winOverlay}>
          <div className={`glass-card ${styles.winCard}`}>
            <span className={styles.winEmoji}>
              {winner?.includes(`${(playerNumber || 0) + 1}`) ? '🧠' : '😢'}
            </span>
            <h2 className={styles.winTitle}>
              {winner?.includes(`${(playerNumber || 0) + 1}`) ? 'Perfect Memory!' : 'Outplayed!'}
            </h2>
            <p className={styles.winSub}>
              {winner?.includes(`${(playerNumber || 0) + 1}`)
                ? 'You flipped all cards in sequence!'
                : 'Opponent completed the sequence!'}
            </p>
            <Link href="/" className="btn btn-primary">Play Again</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemoryFlipPage() {
  return (
    <Lobby gameType="memory_flip" gameName="Sequence Memory Flip" gameIcon="🃏" accentColor="#ec4899">
      <MemoryFlipBoard />
    </Lobby>
  );
}
