'use client';

import { useState } from 'react';
import Lobby from '@/components/Lobby';
import { useGame } from '@/context/GameContext';
import styles from './game.module.css';
import Link from 'next/link';

interface Guess {
  guess: string;
  correct_position: number;
  correct_digit: number;
}

function CodeGuessBoard() {
  const { gameState, playerNumber, sendAction, gameOver, winner } = useGame();
  const [code, setCode] = useState('');

  if (!gameState) return null;

  const codesSet: boolean[] = gameState.codesSet;
  const myCodeSet = codesSet[playerNumber || 0];
  const bothSet = codesSet[0] && codesSet[1];
  const currentPlayer: number = gameState.currentPlayer;
  const isMyTurn = currentPlayer === playerNumber;

  const myGuesses: Guess[] = playerNumber === 0 ? gameState.player1Guesses : gameState.player2Guesses;
  const opGuesses: Guess[] = playerNumber === 0 ? gameState.player2Guesses : gameState.player1Guesses;

  const handleSubmit = () => {
    if (code.length !== 4) return;
    sendAction({ game: 'CodeGuess', guess: code });
    setCode('');
  };

  // Setup phase — set your secret code
  if (!myCodeSet) {
    return (
      <div className={styles.gameWrapper}>
        <Link href="/" className={`btn btn-ghost btn-sm ${styles.backBtn}`}>← Back</Link>
        <div className={`glass-card ${styles.setupPhase}`} style={{ padding: 40 }}>
          <h2 className={styles.setupTitle}>🔐 Set Your Secret Code</h2>
          <p className={styles.setupSub}>Choose a 4-digit number for your opponent to crack</p>
          <input
            className={`input ${styles.codeInput}`}
            type="text"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="____"
          />
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={code.length !== 4}
          >
            Lock Code 🔒
          </button>
        </div>
      </div>
    );
  }

  // Waiting for opponent to set code
  if (!bothSet) {
    return (
      <div className={styles.gameWrapper}>
        <Link href="/" className={`btn btn-ghost btn-sm ${styles.backBtn}`}>← Back</Link>
        <div className={`glass-card ${styles.waitingSetup}`}>
          <h3>Your code is set! ✅</h3>
          <p>Waiting for opponent to set their code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gameWrapper}>
      <Link href="/" className={`btn btn-ghost btn-sm ${styles.backBtn}`}>← Back</Link>

      <div className={styles.turnInfo}>
        {isMyTurn ? '🎯 Your turn to guess!' : '⏳ Opponent is guessing...'}
      </div>

      <div className={styles.gameArea}>
        {/* Your guesses */}
        <div className={styles.guessHistory}>
          {myGuesses.map((g: Guess, idx: number) => (
            <div key={idx} className={styles.guessRow}>
              <span className={styles.guessNumber}>{g.guess}</span>
              <div className={styles.guessResults}>
                <span className={styles.guessBull}>🟢 {g.correct_position}</span>
                <span className={styles.guessCow}>🟡 {g.correct_digit}</span>
              </div>
            </div>
          ))}
        </div>

        {isMyTurn && !gameOver && (
          <div className={styles.inputRow}>
            <input
              className="input"
              type="text"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4 digits"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button className="btn btn-primary" onClick={handleSubmit} disabled={code.length !== 4}>
              Guess
            </button>
          </div>
        )}

        <div className={styles.legend}>
          <span className={styles.legendItem}><span className={styles.dotGreen} /> Right place</span>
          <span className={styles.legendItem}><span className={styles.dotYellow} /> Wrong place</span>
        </div>
      </div>

      {gameOver && (
        <div className={styles.winOverlay}>
          <div className={`glass-card ${styles.winCard}`}>
            <span className={styles.winEmoji}>
              {winner?.includes(`${(playerNumber || 0) + 1}`) ? '🧠' : '😢'}
            </span>
            <h2 className={styles.winTitle}>
              {winner?.includes(`${(playerNumber || 0) + 1}`) ? 'Code Cracked!' : 'Code Broken!'}
            </h2>
            <p className={styles.winSub}>
              {winner?.includes(`${(playerNumber || 0) + 1}`)
                ? 'You cracked the code first!'
                : 'Opponent cracked your code!'}
            </p>
            <Link href="/" className="btn btn-primary">Play Again</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CodeGuessPage() {
  return (
    <Lobby gameType="code_guess" gameName="4-Digit Code Breaker" gameIcon="🔐" accentColor="#06b6d4">
      <CodeGuessBoard />
    </Lobby>
  );
}
