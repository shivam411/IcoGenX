'use client';

import { useEffect, useState } from 'react';
import GameFrame from '@/components/GameFrame';
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
    rulesTitle: 'Sprint Rules',
    rules: (
      <ul>
        <li>Take turns guessing a hidden number inside the shrinking range.</li>
        <li>After each guess, the range updates higher or lower.</li>
        <li>Sprint uses a tighter 1 to 50 range, so reads matter fast.</li>
        <li>Hit the exact number first to win.</li>
      </ul>
    ),
  },
  classic: {
    name: 'Higher or Lower',
    rulesTitle: 'Classic Rules',
    rules: (
      <ul>
        <li>Guess the hidden number within the active range.</li>
        <li>Each hint narrows the range to higher or lower.</li>
        <li>Use the slider to stay inside the current valid window.</li>
        <li>Find the number before your opponent does.</li>
      </ul>
    ),
  },
  expert: {
    name: 'Higher or Lower: Expert',
    rulesTitle: 'Expert Rules',
    rules: (
      <ul>
        <li>The hidden number lives in a larger, tougher range.</li>
        <li>Every wrong guess still narrows the space, but bad jumps cost tempo.</li>
        <li>Read the full guess history before committing.</li>
        <li>First exact hit wins the round.</li>
      </ul>
    ),
  },
  code_breaker_number: {
    name: 'Code Breaker: Number Range',
    rulesTitle: 'Number Range Rules',
    rules: (
      <ul>
        <li>Track the visible range and keep each guess inside it.</li>
        <li>Every hint compresses the search window for both players.</li>
        <li>Efficient narrowing matters more than random shots.</li>
        <li>Guess the exact number first to win.</li>
      </ul>
    ),
  },
};

export type HigherLowerVariant = keyof typeof VARIANT_CONFIG;

export function normalizeHigherLowerVariant(variant: string | undefined): HigherLowerVariant {
  if (variant === 'sprint' || variant === 'expert' || variant === 'code_breaker_number') return variant;
  return 'classic';
}

function HigherLowerBoard({ variant }: { variant: HigherLowerVariant }) {
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
  const config = VARIANT_CONFIG[variant];

  return (
    <div className={styles.gameWrapper}>
      <GameFrame
        currentPlayer={currentPlayer}
        turnText={isMyTurn ? '🎯 Your turn to guess!' : '⏳ Opponent is guessing...'}
        rulesTitle={config.rulesTitle}
        rules={config.rules}
      >
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
      </GameFrame>

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
      <HigherLowerBoard variant={normalizedVariant} />
    </Lobby>
  );
}