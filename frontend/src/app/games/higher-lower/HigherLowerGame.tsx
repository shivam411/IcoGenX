/* frontend/src/app/games/higher-lower/HigherLowerGame.tsx */
'use client';

import { useEffect, useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
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

function clampNumber(value: number, low: number, high: number) {
  return Math.min(Math.max(value, low), high);
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
  const [secretInput, setSecretInput] = useState('');

  const rangeLow: number = gameState?.rangeLow ?? 1;
  const rangeHigh: number = gameState?.rangeHigh ?? 100;
  const maxNumber: number = gameState?.maxNumber ?? 100;
  const mySecretSet: boolean = Boolean(gameState?.mySecretSet ?? gameState?.secretsSet?.[playerNumber]);
  const bothSecretsSet: boolean = Boolean(gameState?.bothSecretsSet ?? gameState?.secretsSet?.every(Boolean));

  useEffect(() => {
    setGuess((current) => clampNumber(current, rangeLow, rangeHigh));
  }, [rangeLow, rangeHigh]);

  const guesses: GuessEntry[] = gameState.guesses || [];
  const opponentLabel = opponentName || 'Opponent';

  const handleSecretSubmit = () => {
    const secret = parseInt(secretInput, 10);
    if (Number.isNaN(secret) || secret < 1 || secret > maxNumber) return;
    sendAction({ game: 'HigherLower', secret });
    setSecretInput('');
  };

  const handleGuess = () => {
    sendAction({ game: 'HigherLower', guess: clampNumber(guess, rangeLow, rangeHigh) });
  };

  const handleGuessInput = (value: string) => {
    const nextGuess = parseInt(value, 10);
    if (Number.isNaN(nextGuess)) return;
    setGuess(clampNumber(nextGuess, rangeLow, rangeHigh));
  };

  const fillLeft = ((rangeLow - 1) / maxNumber) * 100;
  const fillWidth = ((rangeHigh - rangeLow + 1) / maxNumber) * 100;

  if (!mySecretSet) {
    const secret = parseInt(secretInput, 10);
    const secretValid = !Number.isNaN(secret) && secret >= 1 && secret <= maxNumber;

    return (
      <div className={`glass-card ${styles.setupPhase}`}>
        <h2 className={styles.setupTitle}>Lock Your Number</h2>
        <p className={styles.setupSub}>Choose a secret number from 1 to {maxNumber} for {opponentLabel} to find.</p>
        <input
          className={`input ${styles.secretInput}`}
          type="number"
          min={1}
          max={maxNumber}
          value={secretInput}
          onChange={(event) => setSecretInput(event.target.value.replace(/\D/g, ''))}
          onKeyDown={(event) => event.key === 'Enter' && handleSecretSubmit()}
          placeholder={`1-${maxNumber}`}
        />
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={handleSecretSubmit}
          disabled={!secretValid}
        >
          Lock Number
        </button>
      </div>
    );
  }

  if (!bothSecretsSet) {
    return (
      <div className={`glass-card ${styles.waitingSetup}`}>
        <h3>Your number is locked.</h3>
        <p>Waiting for {opponentLabel} to lock theirs...</p>
      </div>
    );
  }

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
          <div className={styles.inputSection}>
            <input
              className={`input ${styles.numberInput}`}
              type="number"
              min={rangeLow}
              max={rangeHigh}
              value={guess}
              onChange={(event) => handleGuessInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleGuess()}
              aria-label="Guess number"
            />
            <button type="button" className="btn btn-primary btn-lg" onClick={handleGuess}>
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