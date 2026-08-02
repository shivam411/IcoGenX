// frontend/src/app/games/in-a-nutshell/InANutshellGame.tsx
'use client';

import React, { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

interface NutshellCard {
  category: string;
  clues: string[];
  answer: string;
}

function InANutshellBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [guessInput, setGuessInput] = useState('');

  if (!gameState) return null;

  const scores: number[] = gameState.scores || [0, 0];
  const currentCard: NutshellCard | null = gameState.current_card || null;
  const revealedTabs: boolean[] = gameState.revealed_tabs || [];
  const lockedOut: boolean[] = gameState.locked_out || [false, false];
  const currentTurnPlayer: number = gameState.current_player ?? 0;
  const lastEvent: string = gameState.last_event || 'Roll to begin!';
  
  const playerIdx = playerNumber;
  const oppIdx = 1 - playerIdx;

  const isP1 = playerIdx === 0;
  const myColor = isP1 ? '#22d3ee' : '#fb7185';
  const oppColor = isP1 ? '#fb7185' : '#22d3ee';

  const myScore = scores[playerIdx] ?? 0;
  const oppScore = scores[oppIdx] ?? 0;
  const isMeLocked = lockedOut[playerIdx] ?? false;
  const isOppLocked = lockedOut[oppIdx] ?? false;

  const handlePullTab = (tabIdx: number) => {
    if (!isMyTurn || gameOver || revealedTabs[tabIdx]) return;
    sendAction({
      action: 'PullTab',
      tab_idx: tabIdx,
    });
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || gameOver || isMeLocked || !guessInput.trim()) return;

    sendAction({
      action: 'SubmitGuess',
      guess: guessInput.trim(),
    });
    setGuessInput('');
  };

  const handlePassTurn = () => {
    if (!isMyTurn || gameOver) return;
    sendAction({
      action: 'PassTurn',
    });
  };

  return (
    <div className={styles.boardShell}>
      {/* Event banner */}
      <div className={styles.statusBar}>
        <span className={styles.statusText}>{lastEvent}</span>
      </div>

      {/* Main Splits */}
      <div className={styles.gameArea}>
        {/* The Sliding Tab Trivia Card */}
        <div className={styles.triviaCard}>
          {currentCard ? (
            <div className={styles.cardFrame}>
              <div className={styles.cardHeader}>
                <span className={styles.categoryBadge}>{currentCard.category}</span>
                <span className={styles.cardTopicTitle}>Trivia Card</span>
              </div>

              {/* Shutter Windows list */}
              <div className={styles.shuttersGrid}>
                {currentCard.clues.map((word, idx) => {
                  const isOpen = revealedTabs[idx] ?? false;
                  const canPull = isMyTurn && !isOpen && !gameOver;

                  return (
                    <div
                      key={`clue-${idx}`}
                      onClick={() => canPull && handlePullTab(idx)}
                      className={`
                        ${styles.shutterSlot}
                        ${canPull ? styles.shutterActionable : ''}
                      `}
                    >
                      <span className={styles.shutterIndex}>{idx + 1}</span>

                      {/* The Text underneath */}
                      <div className={styles.clueTextWrapper}>
                        {isOpen ? (
                          <span className={styles.clueWord}>{word}</span>
                        ) : (
                          <span className={styles.cluePlaceholder}>PULL TAB</span>
                        )}
                      </div>

                      {/* Sliding Shutter Door Overlay */}
                      <div
                        className={`
                          ${styles.shutterDoor} 
                          ${isOpen ? styles.shutterDoorOpen : ''}
                        `}
                      >
                        <div className={styles.shutterHandle}>
                          <div className={styles.gripLines} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.noCard}>No Active Card</div>
          )}
        </div>

        {/* Console control panel */}
        <div className={styles.consoleContainer}>
          {/* Score dashboards */}
          <div className={styles.scoreBoardRow}>
            <div className={styles.scoreBlock} style={{ borderColor: myColor }}>
              <span className={styles.scoreName}>You</span>
              <span className={styles.scoreValue}>{myScore} pts</span>
              {isMeLocked && <span className={styles.lockedBadge}>LOCKED</span>}
            </div>

            <div className={styles.scoreBlock} style={{ borderColor: oppColor }}>
              <span className={styles.scoreName}>
                {allPlayerNames[oppIdx] || opponentName || 'Opponent'}
              </span>
              <span className={styles.scoreValue}>{oppScore} pts</span>
              {isOppLocked && <span className={styles.lockedBadge}>LOCKED</span>}
            </div>
          </div>

          {/* Action inputs */}
          <div className={styles.controlsBox}>
            {isMyTurn && !gameOver && !isMeLocked && (
              <form onSubmit={handleGuessSubmit} className={styles.guessForm}>
                <input
                  type="text"
                  placeholder="Type your guess..."
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  className={styles.guessInput}
                />
                <button type="submit" className={styles.submitBtn}>
                  SUBMIT GUESS
                </button>
              </form>
            )}

            {isMyTurn && !gameOver && (
              <button onClick={handlePassTurn} className={styles.passBtn}>
                PASS TURN
              </button>
            )}

            {isMeLocked && !gameOver && (
              <div className={styles.lockoutText}>
                🚫 Locked out of guessing for this card! Wait for the next one.
              </div>
            )}

            {!isMyTurn && !gameOver && (
              <div className={styles.waitingText}>
                Waiting for {allPlayerNames[oppIdx] || opponentName || 'Opponent'}...
              </div>
            )}

            {gameOver && (
              <div className={styles.gameFinishedText}>
                Match Finished!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InANutshellGamePage() {
  return (
    <GameTemplate
      gameType="in_a_nutshell"
      gameName="In a Nutshell"
      gameIcon="in-a-nutshell"
      accentColor="#10b981"
      winEmoji="🥜"
      winTitle="Trivia Champion!"
      loseTitle="Runner Up"
      drawTitle="Tie Game"
    >
      {(props) => <InANutshellBoard {...props} />}
    </GameTemplate>
  );
}
