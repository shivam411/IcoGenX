/* frontend/src/app/games/black-hole/page.tsx */
'use client';

import { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

// Helper coordinate mappings matching the Rust backend
const getRowCol = (idx: number) => {
  if (idx === 0) return [0, 0];
  if (idx <= 2) return [1, idx - 1];
  if (idx <= 5) return [2, idx - 3];
  if (idx <= 9) return [3, idx - 6];
  if (idx <= 14) return [4, idx - 10];
  return [5, idx - 15];
};

const getIndex = (row: number, col: number) => {
  if (col > row) return null;
  switch (row) {
    case 0: return 0;
    case 1: return 1 + col;
    case 2: return 3 + col;
    case 3: return 6 + col;
    case 4: return 10 + col;
    case 5: return 15 + col;
    default: return null;
  }
};

const getNeighbors = (idx: number): number[] => {
  const [r, c] = getRowCol(idx);
  const neighbors: number[] = [];

  // Same row
  if (c > 0) {
    const n = getIndex(r, c - 1);
    if (n !== null) neighbors.push(n);
  }
  const nRight = getIndex(r, c + 1);
  if (nRight !== null) neighbors.push(nRight);

  // Row above
  if (r > 0) {
    if (c > 0) {
      const n = getIndex(r - 1, c - 1);
      if (n !== null) neighbors.push(n);
    }
    const n = getIndex(r - 1, c);
    if (n !== null) neighbors.push(n);
  }

  // Row below
  if (r < 5) {
    const n = getIndex(r + 1, c);
    if (n !== null) neighbors.push(n);
    const nRight = getIndex(r + 1, c + 1);
    if (nRight !== null) neighbors.push(nRight);
  }

  return neighbors;
};

// Row structures to render cells in centered lines
const PYRAMID_ROWS = [
  [0],
  [1, 2],
  [3, 4, 5],
  [6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20]
];

function BlackHoleBoard({
  gameState,
  playerNumber,
  opponentName,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Reset local token selection when turn changes
  useEffect(() => {
    setSelectedToken(null);
  }, [isMyTurn]);

  if (!gameState) return null;

  const board: (Option<[number, number]>)[] = gameState.board || [];
  const variant: string = gameState.variant || 'classic';
  const currentTurnPlayer = gameState.current_player;
  const blackHoleIndex: number | null = typeof gameState.black_hole_index === 'number' ? gameState.black_hole_index : null;
  const scores: number[] = gameState.scores || [0, 0];
  const lastEvent: string | null = gameState.last_event || null;
  const opponentLabel = opponentName || 'Opponent';

  // Hands / Next tokens
  const classicNextVal: number[] = gameState.classic_next_val || [1, 1];
  const chaosHands: number[][] = gameState.chaos_hands || [[], []];

  // Active player's own lists
  const myPlayerIdx = playerNumber ?? 0;
  const myNextClassicVal = classicNextVal[myPlayerIdx];
  const myChaosHand = chaosHands[myPlayerIdx] || [];

  const showWarning = (msg: string) => {
    setWarningMsg(msg);
    const timer = setTimeout(() => setWarningMsg(null), 2000);
    return () => clearTimeout(timer);
  };

  const adjacentIndices = blackHoleIndex !== null ? getNeighbors(blackHoleIndex) : [];

  const handleCellClick = (idx: number) => {
    if (gameOver) return;
    if (!isMyTurn) {
      showWarning('Not your turn.');
      return;
    }
    if (board[idx]) {
      showWarning('Cell is already occupied.');
      return;
    }

    let finalVal = 0;
    if (variant === 'chaos') {
      if (selectedToken === null) {
        showWarning('Select a token from your hand first!');
        return;
      }
      finalVal = selectedToken;
    } else {
      finalVal = myNextClassicVal;
    }

    sendAction({
      action: 'BlackHolePlace',
      cell: idx,
      value: finalVal,
    });

    setSelectedToken(null);
  };

  const getCellLabel = (idx: number) => {
    const item = board[idx];
    if (idx === blackHoleIndex) return null;
    if (item && Array.isArray(item)) {
      return item[1]; // Value
    }
    // Hover preview
    if (isMyTurn && !board[idx] && !gameOver) {
      if (variant === 'chaos' && selectedToken !== null) {
        return selectedToken;
      }
      if (variant === 'classic') {
        return myNextClassicVal;
      }
    }
    return '';
  };

  return (
    <div className={styles.gameWrapper}>
      <div className={styles.boardContainer}>
        {/* Turn Status Message */}
        <div className={styles.statusText}>
          {warningMsg ? (
            <span className={styles.warning}>{warningMsg}</span>
          ) : isMyTurn ? (
            variant === 'chaos' && selectedToken === null ? (
              <span className={styles.myTurn}>Select a token number from your hand below.</span>
            ) : (
              <span className={styles.myTurn}>Place your token on the board.</span>
            )
          ) : (
            <span className={styles.opponentTurn}>Waiting for {opponentLabel}...</span>
          )}
        </div>

        {/* The pyramid board */}
        <div className={styles.pyramidBoard}>
          {PYRAMID_ROWS.map((rowCells, rIdx) => (
            <div key={rIdx} className={styles.rowWrapper}>
              {rowCells.map((idx) => {
                const isBh = idx === blackHoleIndex;
                const cellVal = board[idx];
                const isOccupied = cellVal !== null;
                const isAdjacent = adjacentIndices.includes(idx);

                let cellClass = styles.circleCell;
                if (isBh) {
                  cellClass += ` ${styles.blackHoleCell}`;
                } else if (cellVal && Array.isArray(cellVal)) {
                  cellClass += ` ${styles.occupied} ${cellVal[0] === 0 ? styles.player1Token : styles.player2Token}`;
                } else if (gameOver || !isMyTurn) {
                  cellClass += ` ${styles.disabled}`;
                }

                if (isAdjacent && gameOver) {
                  cellClass += ` ${styles.adjacentToBlackHole}`;
                }

                return (
                  <button
                    key={idx}
                    className={cellClass}
                    onClick={() => handleCellClick(idx)}
                    disabled={isBh || (isOccupied && !isBh) || gameOver}
                  >
                    {isBh ? (
                      <span className={styles.blackHoleIcon}>🌀</span>
                    ) : (
                      getCellLabel(idx)
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Last Move Log */}
        {lastEvent && <div className={styles.eventLog}>{lastEvent}</div>}

        {/* Final scores board */}
        {gameOver && blackHoleIndex !== null && (
          <div className={styles.scoreBoard}>
            <div className={`${styles.scoreItem} ${styles.scoreP1}`}>
              <div className={styles.scoreLabel}>Player 1 Sum</div>
              <div className={styles.scoreVal}>{scores[0]}</div>
            </div>
            <div className={`${styles.scoreItem} ${styles.scoreP2}`}>
              <div className={styles.scoreLabel}>Player 2 Sum</div>
              <div className={styles.scoreVal}>{scores[1]}</div>
            </div>
          </div>
        )}
      </div>

      {/* active player hand select dock (only in Chaos variant, when game is active) */}
      {variant === 'chaos' && isMyTurn && !gameOver && (
        <div className={styles.dockCard}>
          <h3 className={styles.dockTitle}>Select Number to Play</h3>
          <div className={styles.handTokens}>
            {myChaosHand.map((val) => (
              <button
                key={val}
                className={`${styles.handToken} ${myPlayerIdx === 0 ? styles.handTokenP1 : styles.handTokenP2} ${selectedToken === val ? (myPlayerIdx === 0 ? styles.handTokenP1Selected : styles.handTokenP2Selected) : ''}`}
                onClick={() => setSelectedToken(selectedToken === val ? null : val)}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* active player next indicator in Classic variant (when game is active) */}
      {variant === 'classic' && isMyTurn && !gameOver && (
        <div className={styles.dockCard}>
          <h3 className={styles.dockTitle}>Your Next Token: {myNextClassicVal}</h3>
        </div>
      )}
    </div>
  );
}

type Option<T> = T | null;

export default function BlackHolePage() {
  return (
    <GameTemplate
      gameType="black_hole"
      gameName="Black Hole"
      gameIcon="black-hole"
      accentColor="#a855f7"
      winEmoji="🏆"
      winTitle="Lowest Adjacent Sum Wins!"
      loseTitle="Adjacent Sum Defeat!"
      drawTitle="Draw!"
    >
      {(props) => <BlackHoleBoard {...props} />}
    </GameTemplate>
  );
}
