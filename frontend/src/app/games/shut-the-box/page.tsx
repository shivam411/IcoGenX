'use client';

import { useEffect, useState } from 'react';
import GameFrame from '@/components/GameFrame';
import Lobby from '@/components/Lobby';
import { useGame } from '@/context/GameContext';
import styles from './game.module.css';

const DIE_PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function hasCombinationSumming(values: number[], target: number) {
  function search(startIndex: number, sum: number): boolean {
    if (sum === target) return true;
    if (sum > target) return false;

    for (let idx = startIndex; idx < values.length; idx += 1) {
      if (search(idx + 1, sum + values[idx])) return true;
    }

    return false;
  }

  return search(0, 0);
}

function DieFace({ value, rolling }: { value: number; rolling: boolean }) {
  const activePips = new Set(DIE_PIPS[value] || []);

  return (
    <div className={`${styles.dieFace} ${rolling ? styles.dieFaceRolling : ''}`} aria-label={`Rolled ${value}`}>
      {Array.from({ length: 9 }, (_, idx) => (
        <span
          key={idx}
          className={`${styles.diePip} ${activePips.has(idx) ? styles.diePipActive : ''}`}
        />
      ))}
    </div>
  );
}

function ShutTheBoxBoard() {
  const { gameState, playerNumber, opponentName, sendAction, gameOver, winner } = useGame();
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [displayRoll, setDisplayRoll] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  const rules = (
    <ul>
      <li>Roll one die, then choose any unopened cards that add up to the rolled number.</li>
      <li>Your selected cards move forward automatically.</li>
      <li>Only the exact card values in your chosen combination pull matching opponent cards back. Matching the roll total alone does not.</li>
      <li>First player to move all six cards forward wins the round.</li>
    </ul>
  );

  if (!gameState) return null;

  const myCards: boolean[] = playerNumber === 0 ? gameState.player1Cards : gameState.player2Cards;
  const opCards: boolean[] = playerNumber === 0 ? gameState.player2Cards : gameState.player1Cards;
  const currentPlayer: number = gameState.currentPlayer;
  const isMyTurn = currentPlayer === playerNumber;
  const needsRoll: boolean = gameState.needsRoll;
  const lastRoll: number | null = gameState.lastRoll;

  const selectedSum = selectedCards.reduce((a, b) => a + b, 0);
  const opponentLabel = opponentName || 'Opponent';
  const rollOwnerLabel = isMyTurn ? 'You' : opponentLabel;
  const availableCards = myCards.reduce<number[]>((values, open, idx) => {
    if (!open) values.push(idx + 1);
    return values;
  }, []);
  const hasPlayableMove = lastRoll ? hasCombinationSumming(availableCards, lastRoll) : false;

  useEffect(() => {
    if (needsRoll) {
      setSelectedCards([]);
    }
  }, [needsRoll]);

  useEffect(() => {
    if (!lastRoll) {
      setRolling(false);
      setDisplayRoll(null);
      return;
    }

    setRolling(true);
    let nextFace = 1;
    const interval = window.setInterval(() => {
      nextFace = nextFace % 6 + 1;
      setDisplayRoll(nextFace);
    }, 85);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setDisplayRoll(lastRoll);
      setRolling(false);
    }, 750);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [lastRoll]);

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
    sendAction({ game: 'ShutTheBox', combination: selectedCards, target: 'self' });
    setSelectedCards([]);
  };

  const handleEndTurn = () => {
    sendAction({ game: 'ShutTheBox', combination: [], target: 'pass' });
    setSelectedCards([]);
  };

  const activeRoll = displayRoll ?? lastRoll ?? 1;

  return (
    <div className={styles.gameWrapper}>
      <GameFrame
        currentPlayer={currentPlayer}
        turnText={isMyTurn ? '🎯 Your turn!' : `⏳ ${opponentLabel}'s turn...`}
        rulesTitle="Dice Tug-of-War Rules"
        rules={rules}
      >
        <div className={styles.boardArea}>
          <div className={styles.playerSection}>
            <div className={styles.playerLabel}>
              👤 {opponentLabel} {playerNumber === 1 ? '(P1)' : '(P2)'}
            </div>
            <div className={`${styles.cardsRow} ${styles.cardsRowOpponent}`}>
              {opCards.map((open: boolean, idx: number) => (
                <div
                  key={idx}
                  className={`${styles.card} ${styles.cardOpponent} ${open ? styles.cardOpen : styles.cardClosed}`}
                >
                  <span className={styles.cardValue}>{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.divider}>VS</div>

          <div className={styles.playerSection}>
            <div className={styles.playerLabel}>
              🎮 You {playerNumber === 0 ? '(P1)' : '(P2)'}
            </div>
            <div className={`${styles.cardsRow} ${styles.cardsRowMine}`}>
              {myCards.map((open: boolean, idx: number) => (
                <div
                  key={idx}
                  className={`${styles.card} ${styles.cardMine} ${open ? styles.cardOpen : styles.cardClosed} ${
                    selectedCards.includes(idx + 1) ? styles.cardSelected : ''
                  }`}
                  onClick={() => {
                    if (isMyTurn && !needsRoll && !open && hasPlayableMove) {
                      toggleCard(idx + 1);
                    }
                  }}
                >
                  <span className={styles.cardValue}>{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.diceArea}>
            <div className={styles.diceStage}>
              <DieFace value={activeRoll} rolling={rolling} />
            </div>
            <div className={styles.diceLabel}>
              {lastRoll ? (
                <>{rollOwnerLabel} rolled a <strong>{lastRoll}</strong>{rolling ? '...' : ''}</>
              ) : (
                'Roll to choose which cards move this turn.'
              )}
            </div>

            {isMyTurn && (
              <>
                {needsRoll ? (
                  <button className="btn btn-primary btn-lg" onClick={handleRoll}>
                    🎲 Roll Dice
                  </button>
                ) : (
                  <>
                    {!hasPlayableMove && lastRoll && (
                      <div className={styles.sumDisplay}>
                        No available cards can make {lastRoll}. End your turn.
                      </div>
                    )}

                    {hasPlayableMove && selectedCards.length > 0 && (
                      <div className={styles.sumDisplay}>
                        Selected: {selectedCards.join(' + ')} = {selectedSum}
                        {selectedSum === lastRoll ? ' ✅' : ` (need ${lastRoll})`}
                      </div>
                    )}

                    <div className={styles.actionRow}>
                      {hasPlayableMove ? (
                        <button
                          className="btn btn-primary"
                          onClick={handleApply}
                          disabled={selectedSum !== lastRoll}
                        >
                          ✅ Advance Cards
                        </button>
                      ) : (
                        <button className="btn btn-primary" onClick={handleEndTurn}>
                          End Turn
                        </button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </GameFrame>

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
            <p className={styles.winSub}>Use the room controls to start the next round or switch variants.</p>
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
