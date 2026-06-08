// frontend/src/app/games/ultimate-tic-tac-toe/UltimateTicTacToeGame.tsx
'use client';

import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function UltimateBoard({
  gameState,
  playerNumber,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const boards: Array<Array<number | null>> = gameState?.boards || Array(9).fill(null).map(() => Array(9).fill(null));
  const mainBoard: Array<number | null> = gameState?.main_board || Array(9).fill(null);
  const activeBoard: number | null = typeof gameState?.active_board === 'number' ? gameState.active_board : null;
  const lastEvent: string | null = gameState?.last_event || null;

  // Evaluate if a mini board is active for plays
  const isMiniBoardActive = (bIdx: number): boolean => {
    if (gameOver) return false;
    if (mainBoard[bIdx] !== null) return false; // Already claimed/completed

    if (activeBoard === null) {
      return true; // Free move: all uncompleted boards are active
    }
    return activeBoard === bIdx;
  };

  const handleCellClick = (bIdx: number, cIdx: number) => {
    if (!isMyTurn || gameOver) return;
    if (!isMiniBoardActive(bIdx)) return;
    if (boards[bIdx][cIdx] !== null) return;

    sendAction({
      action: 'Place',
      board_idx: bIdx,
      cell_idx: cIdx,
    });
  };

  const isFreeMove = activeBoard === null && !gameOver;

  return (
    <div className={styles.shell}>
      {/* Event banner / status bar */}
      <div className={`${styles.statusBar} ${isFreeMove ? styles.warningBar : ''}`}>
        <span>{lastEvent || 'Take turns placing marks.'}</span>
        {isFreeMove && isMyTurn && <strong>🌟 FREE MOVE! Play anywhere!</strong>}
      </div>

      {/* Main 3x3 layout of boards */}
      <div className={styles.grid} aria-label="Ultimate Tic-Tac-Toe Board">
        {Array.from({ length: 9 }, (_, bIdx) => {
          const isBoardActive = isMiniBoardActive(bIdx);
          const claimValue = mainBoard[bIdx]; // null, 0 (P1), 1 (P2), 2 (Draw)

          return (
            <div
              key={bIdx}
              className={`${styles.miniBoard} ${isBoardActive ? styles.activeMiniBoard : ''}`}
            >
              {/* If board is claimed, render giant overlay symbol */}
              {claimValue !== null && (
                <div
                  className={`${styles.claimedOverlay} ${
                    claimValue === 0
                      ? styles.claimedP1
                      : claimValue === 1
                      ? styles.claimedP2
                      : styles.claimedDraw
                  }`}
                >
                  <span
                    className={`${styles.claimedSymbol} ${
                      claimValue === 0
                        ? styles.symbolP1
                        : claimValue === 1
                        ? styles.symbolP2
                        : styles.symbolDraw
                    }`}
                  >
                    {claimValue === 0 ? 'X' : claimValue === 1 ? 'O' : '—'}
                  </span>
                </div>
              )}

              {/* Render mini 3x3 cells */}
              {Array.from({ length: 9 }, (_, cIdx) => {
                const cellVal = boards[bIdx][cIdx];
                const playable = isBoardActive && cellVal === null && isMyTurn;

                return (
                  <div
                    key={cIdx}
                    className={`${styles.cell} ${playable ? styles.cellPlayable : ''}`}
                    onClick={() => playable && handleCellClick(bIdx, cIdx)}
                  >
                    {cellVal !== null && (
                      <span
                        className={`${styles.token} ${
                          cellVal === 0 ? styles.tokenP1 : styles.tokenP2
                        }`}
                      >
                        {cellVal === 0 ? 'X' : 'O'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UltimateTicTacToeGamePage() {
  return (
    <GameTemplate
      gameType="ultimate_tic_tac_toe"
      gameName="Ultimate Tic-Tac-Toe"
      gameIcon="ultimate-tic-tac-toe"
      accentColor="#8b5cf6"
      winEmoji="👑"
      winTitle="Ultimate Victory!"
      loseTitle="Claim Interrupted"
      drawTitle="Nested Board Tie"
    >
      {(props) => <UltimateBoard {...props} />}
    </GameTemplate>
  );
}
