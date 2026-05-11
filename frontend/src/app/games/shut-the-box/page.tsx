'use client';

import { useState } from 'react';
import Lobby from '@/components/Lobby';
import { useGame } from '@/context/GameContext';
import styles from './game.module.css';
import Link from 'next/link';

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function ShutTheBoxBoard() {
  const { gameState, playerNumber, sendAction, gameOver, winner } = useGame();
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [target, setTarget] = useState<'self' | 'opponent'>('self');

  if (!gameState) return null;

  const myCards: boolean[] = playerNumber === 0 ? gameState.player1Cards : gameState.player2Cards;
  const opCards: boolean[] = playerNumber === 0 ? gameState.player2Cards : gameState.player1Cards;
  const currentPlayer: number = gameState.currentPlayer;
  const isMyTurn = currentPlayer === playerNumber;
  const needsRoll: boolean = gameState.needsRoll;
  const lastRoll: number | null = gameState.lastRoll;

  const selectedSum = selectedCards.reduce((a, b) => a + b, 0);

  const toggleCard = (value: number) => {
    setSelectedCards(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleRoll = () => {
    sendAction({ game: 'ShutTheBox', combination: [], target: 'self' });
  };

  const handleApply = () => {
    if (selectedSum !== lastRoll) return;
    sendAction({ game: 'ShutTheBox', combination: selectedCards, target });
    setSelectedCards([]);
  };

  const handlePass = () => {
    sendAction({ game: 'ShutTheBox', combination: [], target: 'self' });
    setSelectedCards([]);
  };

  return (
    <div className={styles.gameWrapper}>
      <Link href="/" className={`btn btn-ghost btn-sm ${styles.backBtn}`}>← Back</Link>

      <div className={styles.turnInfo}>
        {isMyTurn ? '🎯 Your turn!' : '⏳ Opponent\'s turn...'}
      </div>

      <div className={styles.boardArea}>
        {/* Opponent cards */}
        <div className={styles.playerSection}>
          <div className={styles.playerLabel}>
            👤 Opponent {playerNumber === 1 ? '(P1)' : '(P2)'}
          </div>
          <div className={styles.cardsRow}>
            {opCards.map((open: boolean, idx: number) => (
              <div
                key={idx}
                className={`${styles.card} ${open ? styles.cardOpen : styles.cardClosed} ${
                  target === 'opponent' && selectedCards.includes(idx + 1) ? styles.cardSelected : ''
                }`}
                onClick={() => {
                  if (isMyTurn && !needsRoll && target === 'opponent' && open) {
                    toggleCard(idx + 1);
                  }
                }}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.divider}>VS</div>

        {/* My cards */}
        <div className={styles.playerSection}>
          <div className={styles.playerLabel}>
            🎮 You {playerNumber === 0 ? '(P1)' : '(P2)'}
          </div>
          <div className={styles.cardsRow}>
            {myCards.map((open: boolean, idx: number) => (
              <div
                key={idx}
                className={`${styles.card} ${open ? styles.cardOpen : styles.cardClosed} ${
                  target === 'self' && selectedCards.includes(idx + 1) ? styles.cardSelected : ''
                }`}
                onClick={() => {
                  if (isMyTurn && !needsRoll && target === 'self' && !open) {
                    toggleCard(idx + 1);
                  }
                }}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Dice Area */}
        <div className={styles.diceArea}>
          {lastRoll && (
            <div className={styles.diceValue}>{DICE_FACES[lastRoll]}</div>
          )}
          {lastRoll && (
            <div className={styles.diceLabel}>
              You rolled a <strong>{lastRoll}</strong>
            </div>
          )}

          {isMyTurn && (
            <>
              {needsRoll ? (
                <button className="btn btn-primary btn-lg" onClick={handleRoll}>
                  🎲 Roll Dice
                </button>
              ) : (
                <>
                  <div className={styles.targetToggle}>
                    <button
                      className={`${styles.toggleBtn} ${target === 'self' ? styles.toggleBtnActive : ''}`}
                      onClick={() => { setTarget('self'); setSelectedCards([]); }}
                    >
                      Open My Cards
                    </button>
                    <button
                      className={`${styles.toggleBtn} ${target === 'opponent' ? styles.toggleBtnActive : ''}`}
                      onClick={() => { setTarget('opponent'); setSelectedCards([]); }}
                    >
                      Push Opponent
                    </button>
                  </div>

                  {selectedCards.length > 0 && (
                    <div className={styles.sumDisplay}>
                      Selected: {selectedCards.join(' + ')} = {selectedSum}
                      {selectedSum === lastRoll ? ' ✅' : ` (need ${lastRoll})`}
                    </div>
                  )}

                  <div className={styles.actionRow}>
                    <button
                      className="btn btn-primary"
                      onClick={handleApply}
                      disabled={selectedSum !== lastRoll}
                    >
                      ✅ Confirm
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {gameOver && (
        <div className={styles.winOverlay}>
          <div className={`glass-card ${styles.winCard}`}>
            <span className={styles.winEmoji}>
              {winner?.includes(`${(playerNumber || 0) + 1}`) ? '🎉' : '😢'}
            </span>
            <h2 className={styles.winTitle}>
              {winner?.includes(`${(playerNumber || 0) + 1}`) ? 'You Win!' : 'You Lose!'}
            </h2>
            <p className={styles.winSub}>{winner} opened all cards!</p>
            <Link href="/" className="btn btn-primary">Play Again</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShutTheBoxPage() {
  return (
    <Lobby gameType="shut_the_box" gameName="Dice Tug-of-War" gameIcon="🎲" accentColor="#f97316">
      <ShutTheBoxBoard />
    </Lobby>
  );
}
