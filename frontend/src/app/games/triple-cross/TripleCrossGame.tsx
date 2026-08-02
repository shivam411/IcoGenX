// frontend/src/app/games/triple-cross/TripleCrossGame.tsx
'use client';

import { useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function TripleCrossBoard({
  gameState,
  playerNumber,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const board: Array<Array<number | null>> = gameState?.board || Array(8).fill(null).map(() => Array(3).fill(null));
  const blockers: Array<number | null> = gameState?.blockers || Array(8).fill(null);
  const discInventory: number[] = gameState?.disc_inventory || [12, 12];
  const blockerInventory: number[] = gameState?.blocker_inventory || [4, 4];
  const scores: number[] = gameState?.scores || [0, 0];
  const lastEvent: string | null = gameState?.last_event || null;

  const [selectedBlockRow, setSelectedBlockRow] = useState<number | null>(null);

  // Checks if a row can be blocked by the active player
  const canBlockRow = (rIdx: number): boolean => {
    if (!isMyTurn || gameOver) return false;
    if (blockerInventory[playerNumber] === 0) return false;
    if (blockers[rIdx] !== null) return false;

    // Must be a full row (3 pieces)
    const isFull = board[rIdx].every((cell) => cell !== null);
    return isFull;
  };

  const toggleBlockRow = (rIdx: number) => {
    if (selectedBlockRow === rIdx) {
      setSelectedBlockRow(null);
    } else {
      setSelectedBlockRow(rIdx);
    }
  };

  const handlePush = (rIdx: number, direction: 'left' | 'right') => {
    if (!isMyTurn || gameOver) return;
    if (blockers[rIdx] !== null) return;
    if (discInventory[playerNumber] === 0) return;

    sendAction({
      action: 'TripleCrossPush',
      row: rIdx,
      direction,
      block_row: selectedBlockRow !== null ? selectedBlockRow : null,
    });

    // Reset selected block row
    setSelectedBlockRow(null);
  };

  return (
    <div className={styles.shell}>
      {/* Event log / Status banner */}
      <div className={styles.statusBar}>
        <span>{lastEvent || 'Slide discs into rows to align lines of three.'}</span>
      </div>

      {/* Inventories & Score cards */}
      <div className={styles.inventoriesPanel}>
        <div className={`${styles.inventoryCard} ${gameState?.currentPlayer === 0 ? styles.p1CardActive : ''}`}>
          <div className={styles.cardHeader}>
            <span>Player 1 (Cyan)</span>
            <span className={styles.p1HeaderDot} />
          </div>
          <div className={styles.inventoryRow}>
            <span>Discs Remaining:</span>
            <span className={styles.inventoryValue}>{discInventory[0]}/12</span>
          </div>
          <div className={styles.inventoryRow}>
            <span>Blockers:</span>
            <span className={styles.inventoryValue}>{blockerInventory[0]}/4</span>
          </div>
          <div className={styles.inventoryRow}>
            <span>Lines of 3:</span>
            <span className={styles.inventoryValue}>{scores[0]} pts</span>
          </div>
        </div>

        <div className={`${styles.inventoryCard} ${gameState?.currentPlayer === 1 ? styles.p2CardActive : ''}`}>
          <div className={styles.cardHeader}>
            <span>Player 2 (Rose)</span>
            <span className={styles.p2HeaderDot} />
          </div>
          <div className={styles.inventoryRow}>
            <span>Discs Remaining:</span>
            <span className={styles.inventoryValue}>{discInventory[1]}/12</span>
          </div>
          <div className={styles.inventoryRow}>
            <span>Blockers:</span>
            <span className={styles.inventoryValue}>{blockerInventory[1]}/4</span>
          </div>
          <div className={styles.inventoryRow}>
            <span>Lines of 3:</span>
            <span className={styles.inventoryValue}>{scores[1]} pts</span>
          </div>
        </div>
      </div>

      {/* Blocker Action Prompt */}
      {isMyTurn && blockerInventory[playerNumber] > 0 && (
        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#eab308', fontWeight: 600 }}>
          💡 Tip: Click a yellow shield on a full row to queue your blocker before pushing!
        </div>
      )}

      {/* Main vertical displacement rack */}
      <div className={styles.rack} aria-label="Triple Cross Rack">
        {Array.from({ length: 8 }, (_, rIdx) => {
          const rowBlockedBy = blockers[rIdx]; // null, 0 (P1), 1 (P2)
          const isRowBlocked = rowBlockedBy !== null;
          const blockable = canBlockRow(rIdx);
          const isBlockSelected = selectedBlockRow === rIdx;

          return (
            <div key={rIdx} className={styles.row}>
              {/* If row is blocked, cover with steel gate */}
              {isRowBlocked && (
                <div
                  className={`${styles.blockedRowOverlay} ${
                    rowBlockedBy === 0 ? styles.p1Gate : styles.p2Gate
                  }`}
                >
                  <span
                    className={`${styles.lockIcon} ${
                      rowBlockedBy === 0 ? styles.p1Lock : styles.p2Lock
                    }`}
                  >
                    🔒 Locked Row {rIdx + 1} (by Player {rowBlockedBy + 1})
                  </span>
                </div>
              )}

              {/* Push Left Button */}
              <button
                type="button"
                className={styles.shoveBtn}
                disabled={!isMyTurn || isRowBlocked || gameOver || discInventory[playerNumber] === 0}
                onClick={() => handlePush(rIdx, 'left')}
                aria-label={`Shove Left into Row ${rIdx + 1}`}
              >
                ▶
              </button>

              {/* 3 slot columns */}
              <div className={styles.slots}>
                {Array.from({ length: 3 }, (_, cIdx) => {
                  const cellOwner = board[rIdx][cIdx];
                  return (
                    <div key={cIdx} className={styles.slotCell}>
                      {cellOwner !== null && (
                        <div
                          className={`${styles.token} ${
                            cellOwner === 0 ? styles.tokenP1 : styles.tokenP2
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Push Right Button */}
              <button
                type="button"
                className={styles.shoveBtn}
                disabled={!isMyTurn || isRowBlocked || gameOver || discInventory[playerNumber] === 0}
                onClick={() => handlePush(rIdx, 'right')}
                aria-label={`Shove Right into Row ${rIdx + 1}`}
              >
                ◀
              </button>

              {/* Blocker selection Shield button */}
              <button
                type="button"
                className={`${styles.lockToggleBtn} ${isBlockSelected ? styles.lockToggleActive : ''}`}
                disabled={!blockable}
                onClick={() => toggleBlockRow(rIdx)}
                aria-label={`Toggle Blocker on Row ${rIdx + 1}`}
              >
                🛡️
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TripleCrossGamePage() {
  return (
    <GameTemplate
      gameType="triple_cross"
      gameName="Triple Cross"
      gameIcon="triple-cross"
      accentColor="#0ea5e9"
      winEmoji="🏆"
      winTitle="Most Connections!"
      loseTitle="Tower Blocked"
      drawTitle="Discs Full Draw"
    >
      {(props) => <TripleCrossBoard {...props} />}
    </GameTemplate>
  );
}
