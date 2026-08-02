/* frontend/src/app/games/dice-grid/page.tsx */
'use client';

import { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import GameBoardGrid from '@/components/GameBoardGrid';
import GameCell from '@/components/GameCell';
import GameToken from '@/components/GameToken';
import styles from './game.module.css';

function DiceGridBoard({
  gameState,
  playerNumber,
  opponentName,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Stop rolling animation when has_rolled changes
  useEffect(() => {
    if (gameState?.has_rolled) {
      setIsRolling(false);
    }
  }, [gameState?.has_rolled]);

  if (!gameState) return null;

  const board: (number | null)[] = gameState.board || [];
  const currentTurnPlayer = gameState.current_player;
  const lastRoll: [number, number] | null = gameState.last_roll || null;
  const hasRolled = gameState.has_rolled || false;
  const winningLine: number[] = gameState.winning_line || [];
  const opponentLabel = opponentName || 'Opponent';
  const lastEvent: string | null = gameState.last_event || null;

  const showWarning = (msg: string) => {
    setWarningMsg(msg);
    const timer = setTimeout(() => setWarningMsg(null), 2000);
    return () => clearTimeout(timer);
  };

  // Compute playable indices based on current roll
  const getPlayableIndices = (): number[] => {
    if (!hasRolled || !lastRoll || gameOver) return [];
    const [d1, d2] = lastRoll;
    const idx1 = (d1 - 1) * 6 + (d2 - 1);
    const idx2 = (d2 - 1) * 6 + (d1 - 1);
    
    const candidates = [];
    if (board[idx1] === null) candidates.push(idx1);
    if (board[idx2] === null) candidates.push(idx2);
    return candidates;
  };

  const playableIndices = getPlayableIndices();

  const handleCellClick = (idx: number) => {
    if (gameOver) return;
    if (!isMyTurn) {
      showWarning('Not your turn.');
      return;
    }
    if (!hasRolled) {
      showWarning('Roll the dice first!');
      return;
    }
    if (!playableIndices.includes(idx)) {
      if (lastRoll) {
        showWarning(`Must place at coordinates (${lastRoll[0]}, ${lastRoll[1]}) or (${lastRoll[1]}, ${lastRoll[0]})`);
      }
      return;
    }

    sendAction({
      action: 'DiceGridPlace',
      cell: idx,
    });
  };

  const handleRollClick = () => {
    if (gameOver) return;
    if (!isMyTurn) {
      showWarning('Not your turn.');
      return;
    }
    if (hasRolled) {
      showWarning('You have already rolled. Choose a cell!');
      return;
    }

    setIsRolling(true);
    sendAction({
      action: 'DiceGridRoll',
    });
  };

  // Helper to render dice dots based on the value (1-6)
  const renderDieDots = (val: number) => {
    const dotPositions: Record<number, number[]> = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };

    const activeDots = dotPositions[val] || [];
    return Array.from({ length: 9 }).map((_, idx) => {
      const active = activeDots.includes(idx);
      return active ? <div key={idx} className={styles.dieDot} /> : <div key={idx} />;
    });
  };

  return (
    <div className={styles.gameWrapper}>
      <div className={styles.boardContainer}>
        {/* Turn Status Message */}
        <div className={styles.statusText}>
          {warningMsg ? (
            <span className={styles.warning}>{warningMsg}</span>
          ) : isMyTurn ? (
            !hasRolled ? (
              <span className={styles.rollPrompt}>Roll the dice to generate your coordinates!</span>
            ) : (
              <span className={styles.myTurn}>Place your token on a highlighted space.</span>
            )
          ) : (
            <span className={styles.opponentTurn}>Waiting for {opponentLabel}...</span>
          )}
        </div>

        {/* The Game Board */}
        <div className={styles.boardWrapper}>
          {/* Row Labels (1 to 6) on left */}
          <div className={styles.rowLabels}>
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
          </div>

          <div className={styles.gridAndColLabels}>
            {/* Column Labels (1 to 6) on top */}
            <div className={styles.colLabels}>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
            </div>

            <GameBoardGrid rows={6} cols={6} className={styles.boardGrid}>
              {board.map((cellVal, idx) => {
                const isPlayable = playableIndices.includes(idx);
                const isWinning = winningLine.includes(idx);
                const isObstacle = cellVal === 2;
                const isToken = cellVal === 0 || cellVal === 1;

                let cellClass = '';
                if (isPlayable && isMyTurn && !gameOver) {
                  cellClass = styles.cellPlayable;
                } else if (isObstacle) {
                  cellClass = styles.cellObstacle;
                } else if (hasRolled && !isPlayable && cellVal === null && isMyTurn) {
                  cellClass = styles.cellDimmed;
                }

                return (
                  <GameCell
                    key={idx}
                    index={idx}
                    onClick={() => handleCellClick(idx)}
                    winning={isWinning}
                    className={cellClass}
                  >
                    {isToken ? (
                      <GameToken player={cellVal as number} type="sphere" />
                    ) : isPlayable && isMyTurn && !gameOver ? (
                      <GameToken player={playerNumber ?? 0} type="sphere" preview={true} />
                    ) : isObstacle ? (
                      <span className={styles.obstacleIcon}>🧱</span>
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

      {/* Dice Console */}
      <div className={`${styles.controlConsole} glass-card animate-fade-in`}>
        <div className={styles.diceArea}>
          {lastRoll ? (
            <>
              <div className={`${styles.die} ${isRolling ? styles.shaking : ''} ${currentTurnPlayer === 0 ? styles.dieP1 : styles.dieP2}`}>
                {renderDieDots(lastRoll[0])}
              </div>
              <div className={`${styles.die} ${isRolling ? styles.shaking : ''} ${currentTurnPlayer === 0 ? styles.dieP1 : styles.dieP2}`}>
                {renderDieDots(lastRoll[1])}
              </div>
            </>
          ) : (
            <div className={styles.opponentTurn}>No active roll. Roll to start!</div>
          )}
        </div>

        {isMyTurn && !hasRolled && !gameOver && (
          <button
            className={styles.rollBtn}
            onClick={handleRollClick}
            disabled={isRolling}
          >
            {isRolling ? 'Rolling...' : '🎲 Roll Dice'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DiceGridPage() {
  return (
    <GameTemplate
      gameType="dice_grid"
      gameName="The Dice Grid"
      gameIcon="dice-grid"
      accentColor="#06b6d4"
      winEmoji="🏆"
      winTitle="Winner!"
      loseTitle="Defeat!"
      drawTitle="Draw!"
    >
      {(props) => <DiceGridBoard {...props} />}
    </GameTemplate>
  );
}
