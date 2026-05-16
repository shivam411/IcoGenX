'use client';

import { useEffect, useState } from 'react';
import Lobby from '@/components/Lobby';
import { useGame } from '@/context/GameContext';
import styles from './game.module.css';
import Link from 'next/link';

interface GuessEntry {
  player: number;
  guess: number;
  hint: string;
}

const VARIANT_CONFIG = {
  sprint: {
    name: 'Higher or Lower: Sprint',
    subtitle: 'Numbers 1-50',
  },
  classic: {
    name: 'Higher or Lower',
  },
  expert: {
    name: 'Higher or Lower: Expert',
  },
  code_breaker_number: {
    name: 'Code Breaker: Number Range',
  },
};

export type HigherLowerVariant = keyof typeof VARIANT_CONFIG;

export function normalizeHigherLowerVariant(variant: string | undefined): HigherLowerVariant {
  if (variant === 'sprint' || variant === 'expert' || variant === 'code_breaker_number') return variant;
  return 'classic';
}

function HigherLowerBoard() {
  const { gameState, playerNumber, sendAction, gameOver, winner } = useGame();
  const [guess, setGuess] = useState(50);

  const rangeLow: number = gameState?.rangeLow ?? 1;
  const rangeHigh: number = gameState?.rangeHigh ?? 100;
  const maxNumber: number = gameState?.maxNumber ?? 100;

  useEffect(() => {
    setGuess((current) => Math.min(Math.max(current, rangeLow), rangeHigh));
  }, [rangeLow, rangeHigh]);

  if (!gameState) return null;

  const guesses: GuessEntry[] = gameState.guesses;
  const currentPlayer: number = gameState.currentPlayer;
  const isMyTurn = currentPlayer === playerNumber;

  const handleGuess = () => {
    sendAction({ game: 'HigherLower', guess });
  };

  const fillLeft = ((rangeLow - 1) / maxNumber) * 100;
  const fillWidth = ((rangeHigh - rangeLow + 1) / maxNumber) * 100;

  return (
    <div className={styles.gameWrapper}>
      <Link href="/" className={`btn btn-ghost btn-sm ${styles.backBtn}`}>← Back</Link>

      <div className={styles.turnInfo}>
        {isMyTurn ? '🎯 Your turn to guess!' : '⏳ Opponent is guessing...'}
      </div>

      <div className={styles.gameArea}>
        <div className={styles.rangeBar}>
          <div
            className={styles.rangeFill}
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          >
            <span className={styles.rangeLabel}>{rangeLow} – {rangeHigh}</span>
          </div>
        </div>

        <div className={styles.rangeNumbers}>
          <span>1</span>
          <span>{maxNumber}</span>
        </div>

        {isMyTurn && !gameOver && (
          <>
            <div className={styles.sliderValue}>{guess}</div>
            <input
              type="range"
              min={rangeLow}
              max={rangeHigh}
              value={guess}
              onChange={(e) => setGuess(parseInt(e.target.value, 10))}
              className={styles.sliderInput}
            />
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button className="btn btn-primary btn-lg" onClick={handleGuess}>
                Submit Guess
              </button>
            </div>
          </>
        )}

        <div className={styles.guessHistory} style={{ marginTop: 24 }}>
          {[...guesses].reverse().map((entry: GuessEntry, idx: number) => (
            <div key={idx} className={styles.guessRow}>
              <span className={styles.guessPlayer}>
                {entry.player === playerNumber ? '🎮 You' : '👤 Opponent'}
              </span>
              <span className={styles.guessValue}>{entry.guess}</span>
              <span className={`${styles.guessHint} ${
                entry.hint === 'higher' ? styles.hintHigher :
                entry.hint === 'lower' ? styles.hintLower :
                styles.hintCorrect
              }`}>
                {entry.hint === 'higher' ? '⬆️ Higher' : entry.hint === 'lower' ? '⬇️ Lower' : '✅ Correct!'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {gameOver && (
        <div className={styles.winOverlay}>
          <div className={`glass-card ${styles.winCard}`}>
            <span className={styles.winEmoji}>
              {winner?.includes(`${(playerNumber || 0) + 1}`) ? '🎯' : '😢'}
            </span>
            <h2 className={styles.winTitle}>
              {winner?.includes(`${(playerNumber || 0) + 1}`) ? 'Nailed It!' : 'So Close!'}
            </h2>
            <p className={styles.winSub}>The number was found!</p>
            <Link href="/" className="btn btn-primary">Play Again</Link>
          </div>
        </div>
      )}
    </div>
  );
}

interface HigherLowerGamePageProps {
  variant?: string;
  gameName?: string;
  gameIcon?: string;
  accentColor?: string;
}

export default function HigherLowerGamePage({
  variant = 'classic',
  gameName,
  gameIcon = '🔢',
  accentColor = '#10b981',
}: HigherLowerGamePageProps) {
  const normalizedVariant = normalizeHigherLowerVariant(variant);
  const config = VARIANT_CONFIG[normalizedVariant];

  return (
    <Lobby
      gameType="higher_lower"
      variant={normalizedVariant}
      gameName={gameName || config.name}
      gameIcon={gameIcon}
      accentColor={accentColor}
    >
      <HigherLowerBoard />
    </Lobby>
  );
}