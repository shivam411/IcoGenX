/* frontend/src/app/games/code-guess/page.tsx */
'use client';

import { useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

interface Guess {
  guess: string;
  correct_position: number;
  correct_digit: number;
}

function CodeGuessBoard({
  gameState,
  playerNumber,
  opponentName,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [code, setCode] = useState('');

  const codesSet: boolean[] = gameState.codesSet || [false, false];
  const myCodeSet = codesSet[playerNumber];
  const bothSet = codesSet.every(v => v);
  const opponentLabel = opponentName || 'Opponent';

  const myGuesses: Guess[] = playerNumber === 0 ? (gameState.player1Guesses || []) : (gameState.player2Guesses || []);

  const handleSubmit = () => {
    if (code.length !== 4) return;
    sendAction({ game: 'CodeGuess', guess: code });
    setCode('');
  };

  // Setup phase — set your secret code
  if (!myCodeSet) {
    return (
      <div className={`glass-card ${styles.setupPhase}`} style={{ padding: 40, margin: '40px auto', maxWidth: '440px', textAlign: 'center' }}>
        <h2 className={styles.setupTitle}>🔐 Set Your Secret Code</h2>
        <p className={styles.setupSub}>Choose a 4-digit number for {opponentLabel} to crack</p>
        <input
          className={`input ${styles.codeInput}`}
          type="text"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="____"
          style={{ display: 'block', margin: '20px auto', textAlign: 'center', fontSize: '1.8rem', letterSpacing: '4px', width: '160px' }}
        />
        <div style={{ padding: '0 20px', marginBottom: '24px' }}>
          <input
            type="range"
            min={0}
            max={9999}
            value={parseInt(code, 10) || 0}
            onChange={(e) => setCode(e.target.value.padStart(4, '0'))}
            style={{ width: '100%' }}
            aria-label="Code slider"
          />
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSubmit}
          disabled={code.length !== 4}
        >
          Lock Code 🔒
        </button>
      </div>
    );
  }

  // Waiting for opponent to set code
  if (!bothSet) {
    return (
      <div className={`glass-card ${styles.waitingSetup}`} style={{ padding: 40, margin: '40px auto', maxWidth: '440px', textAlign: 'center' }}>
        <h3>Your code is set! ✅</h3>
        <p>Waiting for {opponentLabel} to set their code...</p>
      </div>
    );
  }

  return (
    <div className={styles.gameArea}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
          <div style={{ padding: '0 8px' }}>
            <input
              type="range"
              min={0}
              max={9999}
              value={parseInt(code, 10) || 0}
              onChange={(e) => setCode(e.target.value.padStart(4, '0'))}
              style={{ width: '100%' }}
              aria-label="Guess slider"
            />
          </div>
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
        </div>
      )}

      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.dotGreen} /> Right place</span>
        <span className={styles.legendItem}><span className={styles.dotYellow} /> Wrong place</span>
      </div>
    </div>
  );
}

export default function CodeGuessPage() {
  return (
    <GameTemplate
      gameType="code_guess"
      gameName="Code Breaker"
      gameIcon="code-guess"
      accentColor="#06b6d4"
      winEmoji="🧠"
      winTitle="Code Cracked!"
      loseTitle="Code Broken!"
    >
      {(props) => <CodeGuessBoard {...props} />}
    </GameTemplate>
  );
}
