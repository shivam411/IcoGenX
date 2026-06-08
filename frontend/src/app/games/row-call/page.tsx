/* frontend/src/app/games/row-call/page.tsx */
'use client';

import { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import GameBoardGrid from '@/components/GameBoardGrid';
import GameCell from '@/components/GameCell';
import GameToken from '@/components/GameToken';
import styles from './game.module.css';

function RowCallBoard({
  gameState,
  playerNumber,
  opponentName,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Reset selected cell if turn changes
  useEffect(() => {
    setSelectedCell(null);
  }, [isMyTurn]);

  if (!gameState) return null;

  const board: (number | null)[] = gameState.board;
  const calledType: 'row' | 'col' | null = gameState.called_type || gameState.calledType || null;
  const calledIndex: number | null = typeof gameState.called_index === 'number' ? gameState.called_index : (typeof gameState.calledIndex === 'number' ? gameState.calledIndex : null);
  const winningLine: number[] = gameState.winning_line || gameState.winningLine || [];
  const opponentLabel = opponentName || 'Opponent';
  const lastEvent: string | null = gameState.last_event || gameState.lastEvent || null;

  const showWarning = (msg: string) => {
    setWarningMsg(msg);
    const timer = setTimeout(() => setWarningMsg(null), 2000);
    return () => clearTimeout(timer);
  };

  const isPlayable = (idx: number) => {
    if (board[idx] !== null) return false;
    if (calledType === 'row' && calledIndex !== null) {
      return Math.floor(idx / 4) === calledIndex;
    }
    if (calledType === 'col' && calledIndex !== null) {
      return (idx % 4) === calledIndex;
    }
    return true;
  };

  const handleCellClick = (idx: number) => {
    if (gameOver) return;
    if (!isMyTurn) {
      showWarning('Not your turn.');
      return;
    }
    if (!isPlayable(idx)) {
      if (calledType === 'row' && calledIndex !== null) {
        showWarning(`Must place in Row ${calledIndex + 1}.`);
      } else if (calledType === 'col' && calledIndex !== null) {
        const colLetter = ['A', 'B', 'C', 'D'][calledIndex];
        showWarning(`Must place in Column ${colLetter}.`);
      }
      return;
    }
    setSelectedCell(idx === selectedCell ? null : idx);
  };

  const handleCallSelect = (type: 'row' | 'col', index: number) => {
    if (selectedCell === null) return;
    sendAction({
      game: 'RowCallMove',
      cell: selectedCell,
      callType: type,
      callIndex: index,
    });
    setSelectedCell(null);
  };

  const isCallFull = (type: 'row' | 'col', index: number) => {
    const tempBoard = [...board];
    if (selectedCell !== null) {
      tempBoard[selectedCell] = playerNumber;
    }
    if (type === 'row') {
      return [0, 1, 2, 3].every((col) => tempBoard[index * 4 + col] !== null);
    } else {
      return [0, 1, 2, 3].every((row) => tempBoard[row * 4 + index] !== null);
    }
  };

  const getColLetter = (idx: number) => ['A', 'B', 'C', 'D'][idx];

  // Helper to check if a cell is in the currently constrained row/col
  const isConstrainedCell = (idx: number) => {
    if (calledIndex === null || calledType === null) return false;
    if (calledType === 'row') {
      return Math.floor(idx / 4) === calledIndex;
    }
    if (calledType === 'col') {
      return (idx % 4) === calledIndex;
    }
    return false;
  };

  return (
    <div className={styles.gameWrapper}>
      <div className={styles.boardContainer}>
        {/* Constraint Indicator Banner */}
        {calledType && calledIndex !== null && !gameOver && (
          <div className={styles.constraintBanner}>
            🎯 Opponent Called:{' '}
            <strong>
              {calledType === 'row'
                ? `Row ${calledIndex + 1}`
                : `Column ${getColLetter(calledIndex)}`}
            </strong>
          </div>
        )}

        {/* Turn Status Message */}
        <div className={styles.statusText}>
          {warningMsg ? (
            <span className={styles.warning}>{warningMsg}</span>
          ) : isMyTurn ? (
            selectedCell === null ? (
              <span className={styles.myTurn}>Place your token on a highlighted space.</span>
            ) : (
              <span className={styles.pendingCall}>Select a Row or Column to call below.</span>
            )
          ) : (
            <span className={styles.opponentTurn}>Waiting for {opponentLabel}...</span>
          )}
        </div>

        {/* The Game Board */}
        <div className={styles.boardWrapper}>
          {/* Row Labels (1, 2, 3, 4) on left */}
          <div className={styles.rowLabels}>
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
          </div>

          <div className={styles.gridAndColLabels}>
            {/* Column Labels (A, B, C, D) on top */}
            <div className={styles.colLabels}>
              <span>A</span>
              <span>B</span>
              <span>C</span>
              <span>D</span>
            </div>

            <GameBoardGrid rows={4} cols={4} className={styles.boardGrid}>
              {board.map((cellPlayer, idx) => {
                const playable = isPlayable(idx);
                const constrained = isConstrainedCell(idx);
                const isWinning = winningLine.includes(idx);
                const isSelected = selectedCell === idx;

                return (
                  <GameCell
                    key={idx}
                    index={idx}
                    onClick={() => handleCellClick(idx)}
                    highlighted={playable && isMyTurn && !gameOver && !isSelected}
                    dimmed={
                      !playable &&
                      cellPlayer === null &&
                      calledIndex !== null &&
                      isMyTurn &&
                      !gameOver &&
                      !isSelected
                    }
                    winning={isWinning}
                    className={`${isSelected ? styles.selectedCell : ''} ${
                      constrained && !gameOver ? styles.constrainedCell : ''
                    }`}
                  >
                    {cellPlayer !== null ? (
                      <GameToken player={cellPlayer} type="sphere" />
                    ) : isSelected ? (
                      <GameToken player={playerNumber} type="sphere" preview={true} />
                    ) : null}
                  </GameCell>
                );
              })}
            </GameBoardGrid>
          </div>
        </div>

        {/* Last Move Log */}
        {lastEvent && <div className={styles.eventLog}>{lastEvent}</div>}
      </div>

      {/* Call Selection Console */}
      {isMyTurn && selectedCell !== null && !gameOver && (
        <div className={`${styles.consoleCard} glass-card animate-fade-in`}>
          <h3 className={styles.consoleTitle}>Call Next Constraint</h3>
          <p className={styles.consoleSubtitle}>
            Choose where {opponentLabel} must play next. You cannot choose full rows or columns.
          </p>

          <div className={styles.consoleSection}>
            <div className={styles.consoleGroup}>
              <span className={styles.groupLabel}>Call a Row:</span>
              <div className={styles.buttonRow}>
                {[0, 1, 2, 3].map((r) => {
                  const full = isCallFull('row', r);
                  return (
                    <button
                      key={r}
                      className="btn btn-ghost btn-sm"
                      disabled={full}
                      onClick={() => handleCallSelect('row', r)}
                    >
                      Row {r + 1} {full ? '(Full)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.consoleGroup}>
              <span className={styles.groupLabel}>Call a Column:</span>
              <div className={styles.buttonRow}>
                {[0, 1, 2, 3].map((c) => {
                  const full = isCallFull('col', c);
                  return (
                    <button
                      key={c}
                      className="btn btn-ghost btn-sm"
                      disabled={full}
                      onClick={() => handleCallSelect('col', c)}
                    >
                      Col {getColLetter(c)} {full ? '(Full)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RowCallPage() {
  return (
    <GameTemplate
      gameType="row_call"
      gameName="Row Call"
      gameIcon="row-call"
      accentColor="#8b5cf6"
      winEmoji="🏆"
      winTitle="Winner!"
      loseTitle="Defeat!"
      drawTitle="Draw!"
    >
      {(props) => <RowCallBoard {...props} />}
    </GameTemplate>
  );
}
