// frontend/src/app/games/qomet/QometGame.tsx
'use client';

import React, { useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function QometBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  if (!gameState) return null;

  const board: (number | null)[] = gameState.board || Array(16).fill(null);
  const reservePieces: number[] = gameState.reserve_pieces || [6, 6];
  const lastEvent: string = gameState.last_event || 'Game started! Place or move your pieces.';

  const playerIdx = playerNumber;
  const oppIdx = 1 - playerIdx;

  const isP1 = playerIdx === 0;
  const myColor = isP1 ? '#22d3ee' : '#fb7185';
  const oppColor = isP1 ? '#fb7185' : '#22d3ee';

  const myReserve = reservePieces[playerIdx] ?? 0;
  const oppReserve = reservePieces[oppIdx] ?? 0;

  const handleCellClick = (idx: number) => {
    if (!isMyTurn || gameOver) return;

    const cellOwner = board[idx];

    if (cellOwner === playerIdx) {
      // Toggle selection for moving our own piece
      setSelectedCell(selectedCell === idx ? null : idx);
    } else if (cellOwner === null) {
      // Cell is empty: can either move here or place here
      if (selectedCell !== null) {
        // Move selected piece here
        sendAction({
          action: 'MovePiece',
          from_idx: selectedCell,
          to_idx: idx,
        });
        setSelectedCell(null);
      } else if (myReserve > 0) {
        // Place a new piece here
        sendAction({
          action: 'PlacePiece',
          cell_idx: idx,
        });
      }
    } else {
      // Clicked opponent's piece
      setSelectedCell(null);
    }
  };

  return (
    <div className={styles.boardShell}>
      {/* Event banner */}
      <div className={styles.statusBar}>
        <span className={styles.statusText}>{lastEvent}</span>
      </div>

      {/* Grid and Sidebar Console */}
      <div className={styles.gameArea}>
        {/* The 4x4 Grid Board */}
        <div className={styles.gridCanvas}>
          <div className={styles.gridContainer}>
            {board.map((cellOwner, idx) => {
              const isSelected = selectedCell === idx;
              const cellX = idx % 4;
              const cellY = Math.floor(idx / 4);

              let cellStyle = {};
              let tokenElement = null;

              if (cellOwner !== null) {
                const isOwnerP1 = cellOwner === 0;
                const tokenColor = isOwnerP1 ? '#22d3ee' : '#fb7185';
                
                tokenElement = (
                  <div
                    className={`
                      ${styles.token} 
                      ${isSelected ? styles.tokenSelected : ''}
                    `}
                    style={{
                      backgroundColor: tokenColor,
                      boxShadow: `0 0 15px ${tokenColor}77`,
                    }}
                  >
                    <span className={styles.tokenLabel}>{isOwnerP1 ? 'P1' : 'P2'}</span>
                  </div>
                );
              }

              // Highlight playable coordinates or destination possibilities
              const isDestination = selectedCell !== null && cellOwner === null;
              const isPlaceable = selectedCell === null && cellOwner === null && myReserve > 0 && isMyTurn;

              return (
                <div
                  key={`cell-${idx}`}
                  onClick={() => handleCellClick(idx)}
                  className={`
                    ${styles.cell} 
                    ${isDestination ? styles.cellDestination : ''}
                    ${isPlaceable ? styles.cellPlaceable : ''}
                  `}
                >
                  {/* Grid lines helper inside cell */}
                  <div className={styles.intersectionDot} />
                  
                  {tokenElement}

                  {/* Visual coordinate indicator */}
                  <span className={styles.coordText}>{cellX},{cellY}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Console dashboard */}
        <div className={styles.consoleContainer}>
          <div className={styles.reservesDashboard}>
            <h3 className={styles.consoleTitle}>Reserve Pieces</h3>
            
            <div className={styles.reserveRow} style={{ borderColor: myColor }}>
              <div className={styles.playerLabelGroup}>
                <span className={styles.colorIndicator} style={{ backgroundColor: myColor }} />
                <span>You</span>
              </div>
              <span className={styles.reserveCount}>{myReserve} left</span>
            </div>

            <div className={styles.reserveRow} style={{ borderColor: oppColor }}>
              <div className={styles.playerLabelGroup}>
                <span className={styles.colorIndicator} style={{ backgroundColor: oppColor }} />
                <span>{allPlayerNames[oppIdx] || opponentName || 'Opponent'}</span>
              </div>
              <span className={styles.reserveCount}>{oppReserve} left</span>
            </div>
          </div>

          <div className={styles.actionGuide}>
            <h4 className={styles.guideTitle}>Move Guide</h4>
            {isMyTurn ? (
              <p className={styles.guideText}>
                {myReserve > 0 
                  ? "Click an empty cell to PLACE, or click your own piece to SELECT it for moving."
                  : "No reserves! Click your own piece to SELECT, then click an empty cell to MOVE."}
              </p>
            ) : (
              <p className={styles.guideText}>
                Waiting for {allPlayerNames[oppIdx] || opponentName || 'Opponent'}'s turn...
              </p>
            )}

            {selectedCell !== null && (
              <div className={styles.selectionBanner}>
                Piece selected at ({selectedCell % 4}, {Math.floor(selectedCell / 4)}). Click an empty cell to move it.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QometGamePage() {
  return (
    <GameTemplate
      gameType="qomet"
      gameName="Qomet"
      gameIcon="qomet"
      accentColor="#8b5cf6"
      winEmoji="⬜"
      winTitle="Perfect Square Formed!"
      loseTitle="Square Completed by Opponent"
      drawTitle="Tie Game"
    >
      {(props) => <QometBoard {...props} />}
    </GameTemplate>
  );
}
