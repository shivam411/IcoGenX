/* frontend/src/app/games/higher-lower/HigherLowerGame.tsx */
'use client';

import { useEffect, useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import { getGameInfo } from '@/lib/gameMetadata';
import styles from './game.module.css';

interface GuessEntry {
  player: number;
  guess: number;
  hint: string;
}

const VARIANT_CONFIG = {
  sprint: {
    name: 'Higher or Lower: Sprint',
    rulesTitle: 'Sprint Rules',
  },
  classic: {
    name: 'Higher or Lower',
    rulesTitle: 'Classic Rules',
  },
  expert: {
    name: 'Higher or Lower: Expert',
    rulesTitle: 'Expert Rules',
  },
  code_breaker_number: {
    name: 'Code Breaker: Number Range',
    rulesTitle: 'Number Range Rules',
  },
};

export type HigherLowerVariant = keyof typeof VARIANT_CONFIG;

export function normalizeHigherLowerVariant(variant: string | undefined): HigherLowerVariant {
  if (variant === 'sprint' || variant === 'expert' || variant === 'code_breaker_number') return variant;
  return 'classic';
}

interface HigherLowerBoardProps extends GameBoardProps {
  variant: HigherLowerVariant;
}

function HigherLowerBoard({
  gameState,
  playerNumber,
  opponentName,
  isMyTurn,
  sendAction,
  gameOver,
  variant,
}: HigherLowerBoardProps) {
  const [guess, setGuess] = useState(50);

  const rangeLow: number = gameState?.rangeLow ?? 1;
  const rangeHigh: number = gameState?.rangeHigh ?? 100;
  const maxNumber: number = gameState?.maxNumber ?? 100;

  useEffect(() => {
    setGuess((current) => Math.min(Math.max(current, rangeLow), rangeHigh));
  }, [rangeLow, rangeHigh]);

  const guesses: GuessEntry[] = gameState.guesses || [];
  const opponentLabel = opponentName || 'Opponent';

  const handleGuess = () => {
    sendAction({ game: 'HigherLower', guess });
  };

  const fillLeft = ((rangeLow - 1) / maxNumber) * 100;
  const fillWidth = ((rangeHigh - rangeLow + 1) / maxNumber) * 100;

  return (
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
              {entry.player === playerNumber ? '🎮 You' : `👤 ${opponentLabel}`}
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
    <GameTemplate
      gameType="higher_lower"
      variant={normalizedVariant}
      gameName={gameName || config.name}
      gameIcon={gameIcon}
      accentColor={accentColor}
      winEmoji="🎯"
      winTitle="Nailed It!"
      loseTitle="So Close!"
    >
      {(props) => <HigherLowerBoard {...props} variant={normalizedVariant} />}
    </GameTemplate>
  );
}