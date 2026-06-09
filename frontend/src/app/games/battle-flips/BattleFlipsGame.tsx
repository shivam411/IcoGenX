// frontend/src/app/games/battle-flips/BattleFlipsGame.tsx
'use client';

import React, { useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

interface FlipperCardProps {
  letter: string;
  isRevealed: boolean;
  themeColor: string;
  label?: string;
}

function FlipperCard({ letter, isRevealed, themeColor, label }: FlipperCardProps) {
  return (
    <div
      className={`
        ${styles.flipperCard} 
        ${isRevealed ? styles.flipped : ''}
      `}
      style={{ '--accent-glow': themeColor } as React.CSSProperties}
    >
      <div className={styles.cardInner}>
        {/* Front of card (facedown/hidden state) */}
        <div className={styles.cardFront}>
          <span className={styles.frontText}>{label || '?'}</span>
        </div>
        {/* Back of card (faceup/revealed state) */}
        <div className={styles.cardBack} style={{ borderColor: themeColor }}>
          <span className={styles.backLetter}>{letter}</span>
        </div>
      </div>
    </div>
  );
}

function BattleFlipsBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [wordInput, setWordInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [setupError, setSetupError] = useState('');

  if (!gameState) return null;

  const setupPhase: boolean = gameState.setup_phase ?? true;
  const secretWords: string[] = gameState.secret_words || ['', ''];
  const revealedLetters: boolean[][] = gameState.revealed_letters || [[], []];
  const guessedLetters: string[] = gameState.guessed_letters || [];
  const lastEvent = gameState.last_event || 'Game in progress!';

  const playerIdx = playerNumber;
  const oppIdx = 1 - playerIdx;

  const isP1 = playerIdx === 0;
  const myColor = isP1 ? '#22d3ee' : '#fb7185';
  const oppColor = isP1 ? '#fb7185' : '#22d3ee';

  const myWord = secretWords[playerIdx] || '';
  const oppWordMasked = secretWords[oppIdx] || '';

  const handleWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = wordInput.trim().toUpperCase();
    if (clean.length < 3 || clean.length > 10) {
      setSetupError('Word must be between 3 and 10 letters.');
      return;
    }
    setSetupError('');
    sendAction({
      action: 'SetSecretWord',
      word: clean,
    });
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = guessInput.trim().toUpperCase();
    if (clean.length === 0) return;
    sendAction({
      action: 'GuessWord',
      word: clean,
    });
    setGuessInput('');
  };

  const handleLetterGuess = (char: string) => {
    if (!isMyTurn || gameOver || guessedLetters.includes(char)) return;
    sendAction({
      action: 'GuessLetter',
      letter: char,
    });
  };

  // Keyboard layout A-Z
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // 1. Setup Phase Screen
  if (setupPhase) {
    const hasSetWord = myWord.length > 0;
    return (
      <div className={styles.setupShell}>
        <div className={styles.setupCard}>
          <h2 className={styles.setupTitle}>Choose Your Secret Word</h2>
          <p className={styles.setupDesc}>
            Select a word related to the category. The game begins when both players submit.
          </p>

          {!hasSetWord ? (
            <form onSubmit={handleWordSubmit} className={styles.setupForm}>
              <input
                type="text"
                maxLength={10}
                placeholder="Enter 3-10 Letter Word"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                className={styles.setupInput}
              />
              <button type="submit" className={styles.setupBtn}>
                LOCK IN WORD
              </button>
              {setupError && <p className={styles.errorText}>{setupError}</p>}
            </form>
          ) : (
            <div className={styles.waitingState}>
              <div className={styles.spinner} />
              <p>Word locked: <strong className={styles.lockedWord}>{myWord}</strong></p>
              <p className={styles.waitingSub}>Waiting for {opponentName || 'opponent'} to lock in...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Play Phase Screen
  return (
    <div className={styles.boardShell}>
      {/* Event banner */}
      <div className={styles.statusBar}>
        <span className={styles.statusText}>{lastEvent}</span>
      </div>

      {/* Main Boards Section */}
      <div className={styles.gameArea}>
        {/* Opponent's Word (The Target to Guess) */}
        <div className={styles.wordCard} style={{ borderColor: oppColor }}>
          <div className={styles.cardHeader} style={{ background: `linear-gradient(135deg, ${oppColor}15, transparent)` }}>
            <span className={styles.dot} style={{ backgroundColor: oppColor }} />
            <span>{opponentName || 'Opponent'}'s Secret Word</span>
          </div>
          <div className={styles.flipperGrid}>
            {oppWordMasked.split('').map((char: string, idx: number) => {
              const isRevealed = char !== '?';
              return (
                <FlipperCard
                  key={`opp-char-${idx}`}
                  letter={isRevealed ? char : ''}
                  isRevealed={isRevealed}
                  themeColor={oppColor}
                />
              );
            })}
          </div>
        </div>

        {/* Your Word (Manage Double-reveals) */}
        <div className={styles.wordCard} style={{ borderColor: myColor }}>
          <div className={styles.cardHeader} style={{ background: `linear-gradient(135deg, ${myColor}15, transparent)` }}>
            <span className={styles.dot} style={{ backgroundColor: myColor }} />
            <span>Your Secret Word</span>
          </div>
          <div className={styles.flipperGrid}>
            {myWord.split('').map((char: string, idx: number) => {
              const isRevealed = revealedLetters[playerIdx]?.[idx] ?? false;
              return (
                <FlipperCard
                  key={`my-char-${idx}`}
                  letter={char}
                  isRevealed={true} // always show own letters
                  themeColor={myColor}
                  label={isRevealed ? '👀' : ''} // eye badge if opponent can see it
                />
              );
            })}
          </div>
          <div className={styles.revealedCounter}>
            Opponent knows {revealedLetters[playerIdx]?.filter((r: boolean) => r).length ?? 0} of {myWord.length} letters
          </div>
        </div>
      </div>

      {/* Interactive Controls Panel */}
      <div className={styles.controlsSection}>
        {/* Keyboard Input */}
        <div className={styles.keyboardContainer}>
          <div className={styles.sectionTitle}>
            {isMyTurn ? '🎯 CHOOSE A LETTER' : '⏳ OPPONENT IS GUESSING'}
          </div>
          <div className={styles.keyboardGrid}>
            {alphabet.map((char: string) => {
              const isGuessed = guessedLetters.includes(char);
              const disabled = !isMyTurn || isGuessed || gameOver;

              return (
                <button
                  key={`kbd-${char}`}
                  disabled={disabled}
                  onClick={() => handleLetterGuess(char)}
                  className={`
                    ${styles.keyBtn} 
                    ${isGuessed ? styles.keyUsed : ''}
                    ${isMyTurn && !isGuessed ? styles.keyActive : ''}
                  `}
                >
                  {char}
                </button>
              );
            })}
          </div>
        </div>

        {/* Solve Form */}
        <div className={styles.solveFormContainer}>
          <div className={styles.sectionTitle}>GUESS THE FULL WORD</div>
          <form onSubmit={handleGuessSubmit} className={styles.solveForm}>
            <input
              type="text"
              disabled={!isMyTurn || gameOver}
              placeholder={isMyTurn ? 'Type full word guess...' : 'Waiting for turn...'}
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value.replace(/[^a-zA-Z]/g, ''))}
              className={styles.solveInput}
            />
            <button
              type="submit"
              disabled={!isMyTurn || gameOver || guessInput.trim().length === 0}
              className={styles.solveBtn}
            >
              SOLVE!
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function BattleFlipsGamePage() {
  return (
    <GameTemplate
      gameType="battle_flips"
      gameName="Battle Flips"
      gameIcon="battle-flips"
      accentColor="#8b5cf6"
      winEmoji="📖"
      winTitle="Word Deciphered!"
      loseTitle="Setup Complete"
      drawTitle="Mutual Blowout"
    >
      {(props) => <BattleFlipsBoard {...props} />}
    </GameTemplate>
  );
}
