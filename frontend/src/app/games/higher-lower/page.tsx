'use client';

import { useState } from 'react';
import Lobby from '@/components/Lobby';
import { useGame } from '@/context/GameContext';
import styles from './game.module.css';
import Link from 'next/link';

interface GuessEntry {
  player: number;
  guess: number;
  hint: string;
}

function HigherLowerBoard() {
  const { gameState, playerNumber, sendAction, gameOver, winner } = useGame();
  const [guess, setGuess] = useState(50);

  if (!gameState) return null;

  const rangeLow: number = gameState.rangeLow;
  const rangeHigh: number = gameState.rangeHigh;
  const guesses: GuessEntry[] = gameState.guesses;
  const currentPlayer: number = gameState.currentPlayer;
  const isMyTurn = currentPlayer === playerNumber;

  const handleGuess = () => {
    sendAction({ game: 'HigherLower', guess });
  };

  // Calculate range fill for visual bar
  const fillLeft = ((rangeLow - 1) / 100) * 100;
  const fillWidth = ((rangeHigh - rangeLow + 1) / 100) * 100;

  return (
    <div className={styles.gameWrapper}>
      <Link href="/" className={`btn btn-ghost btn-sm ${styles.backBtn}`}>← Back</Link>

      <div className={styles.turnInfo}>
        {isMyTurn ? '🎯 Your turn to guess!' : '⏳ Opponent is guessing...'}
      </div>

      <div className={styles.gameArea}>
        {/* Range Bar */}
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
          <span>100</span>
        </div>

        {/* Slider */}
        {isMyTurn && !gameOver && (
          <>
            <div className={styles.sliderValue}>{guess}</div>
            <input
              type="range"
              min={rangeLow}
              max={rangeHigh}
              value={guess}
              onChange={(e) => setGuess(parseInt(e.target.value))}
              className={styles.sliderInput}
            />
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button className="btn btn-primary btn-lg" onClick={handleGuess}>
                Submit Guess
              </button>
            </div>
          </>
        )}

        {/* Guess History */}
        <div className={styles.guessHistory} style={{ marginTop: 24 }}>
          {[...guesses].reverse().map((g: GuessEntry, idx: number) => (
            <div key={idx} className={styles.guessRow}>
              <span className={styles.guessPlayer}>
                {g.player === playerNumber ? '🎮 You' : '👤 Opponent'}
              </span>
              <span className={styles.guessValue}>{g.guess}</span>
              <span className={`${styles.guessHint} ${
                g.hint === 'higher' ? styles.hintHigher :
                g.hint === 'lower' ? styles.hintLower :
                styles.hintCorrect
              }`}>
                {g.hint === 'higher' ? '⬆️ Higher' : g.hint === 'lower' ? '⬇️ Lower' : '✅ Correct!'}
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

export default function HigherLowerPage() {
  return (
    <Lobby gameType="higher_lower" gameName="Higher or Lower" gameIcon="🔢" accentColor="#10b981">
      <HigherLowerBoard />
    </Lobby>
  );
}
