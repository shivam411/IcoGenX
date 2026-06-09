// frontend/src/app/games/knarr-placement/KnarrPlacementGame.tsx
'use client';

import { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function KnarrPlacementBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  if (!gameState) return null;

  const grids: number[][][] = gameState.grids || [[[], [], []], [[], [], []]];
  const currentRoll: number | null = gameState.current_roll || null;
  const hasRolled: boolean = Boolean(gameState.has_rolled);
  const scores: number[] = gameState.scores || [0, 0];
  const colScores: number[][] = gameState.col_scores || [[0, 0, 0], [0, 0, 0]];
  const lastEvent: string | null = gameState.last_event || null;
  const currentPlayer: number = gameState.currentPlayer ?? 0;

  const [localRolling, setLocalRolling] = useState(false);
  const [dieDisplay, setDieDisplay] = useState<number | string>('🎲');
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const playerIdx = playerNumber as number;
  const oppIdx = 1 - playerIdx;

  const myGrid = grids[playerIdx] || [[], [], []];
  const oppGrid = grids[oppIdx] || [[], [], []];

  const myColScores = colScores[playerIdx] || [0, 0, 0];
  const oppColScores = colScores[oppIdx] || [0, 0, 0];

  useEffect(() => {
    if (currentRoll !== null) {
      setDieDisplay(currentRoll);
    } else if (!hasRolled) {
      setDieDisplay('🎲');
    }
  }, [currentRoll, hasRolled]);

  const handleRollClick = () => {
    if (!isMyTurn || gameOver || hasRolled || localRolling) return;

    setLocalRolling(true);
    setDieDisplay('❓');

    setTimeout(() => {
      sendAction({ action: 'RollDie' });
      setLocalRolling(false);
    }, 600);
  };

  const handleColClick = (colIdx: number) => {
    if (!isMyTurn || gameOver || !hasRolled || localRolling) return;
    if (myGrid[colIdx].length >= 3) return; // Column is full

    sendAction({
      action: 'PlaceDie',
      col: colIdx,
    });
    setHoveredCol(null);
  };

  const getColumnMultipliers = (col: number[]) => {
    const counts: Record<number, number> = {};
    for (const val of col) {
      counts[val] = (counts[val] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([_, count]) => count >= 2)
      .map(([val, count]) => ({ val: Number(val), count }));
  };

  const renderDieFace = (val: number, isOpponent: boolean) => {
    // Return dots matching standard dice face, or simple text for styling
    const dots: Record<number, string> = {
      1: '⚀',
      2: '⚁',
      3: '⚂',
      4: '⚃',
      5: '⚄',
      6: '⚅',
    };
    const faceSymbol = dots[val] || val.toString();

    return (
      <div className={`${styles.placedDie} ${isOpponent ? styles.dieP2 : styles.dieP1}`}>
        {faceSymbol}
      </div>
    );
  };

  const isPlayable = isMyTurn && hasRolled && !gameOver;

  const player1Name = allPlayerNames[0] || 'Player 1';
  const player2Name = allPlayerNames[1] || 'Player 2';

  return (
    <div className={styles.shell}>
      {/* Event Banner */}
      <div className={styles.statusBar}>
        <span>{lastEvent || 'Roll the die and select a column to place it.'}</span>
      </div>

      {/* Score Cards */}
      <div className={styles.scoreBoard}>
        <div className={`${styles.scoreCard} ${currentPlayer === 0 ? styles.activeP1 : ''}`}>
          <div className={styles.scoreLabel}>{player1Name} Total:</div>
          <div className={`${styles.scoreVal} ${styles.scoreP1}`}>{scores[0]} pts</div>
        </div>
        <div className={`${styles.scoreCard} ${currentPlayer === 1 ? styles.activeP2 : ''}`}>
          <div className={styles.scoreLabel}>{player2Name} Total:</div>
          <div className={`${styles.scoreVal} ${styles.scoreP2}`}>{scores[1]} pts</div>
        </div>
      </div>

      {/* Main Playfield Grid */}
      <div className={styles.playfield}>
        {/* Opponent's Grid (Top) */}
        <div className={styles.boardGrid}>
          {Array.from({ length: 3 }).map((_, colIdx) => {
            const colDice = oppGrid[colIdx] || [];
            const colScore = oppColScores[colIdx];
            const multipliers = getColumnMultipliers(colDice);

            return (
              <div key={`opp-col-${colIdx}`} className={styles.gridCol}>
                <div className={styles.colHeader}>
                  <span className={`${styles.colScore} ${currentPlayer === oppIdx ? styles.scoreActiveP2 : ''}`}>
                    {colScore}
                  </span>
                  {multipliers.map((m, mIdx) => (
                    <span key={mIdx} className={styles.multBadge} title={`${m.val} matched x${m.count}`}>
                      {m.count}x
                    </span>
                  ))}
                </div>

                {/* Opponent Column Slots (reversed order visual stack) */}
                <div className={`${styles.slotsContainer} ${styles.oppColDirection}`}>
                  {Array.from({ length: 3 }).map((_, slotIdx) => {
                    const dieVal = colDice[slotIdx];
                    return (
                      <div key={`opp-slot-${colIdx}-${slotIdx}`} className={styles.dieSlot}>
                        {dieVal !== undefined && renderDieFace(dieVal, true)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Grid Divider */}
        <div className={styles.divider} />

        {/* Local Player's Grid (Bottom) */}
        <div className={styles.boardGrid}>
          {Array.from({ length: 3 }).map((_, colIdx) => {
            const colDice = myGrid[colIdx] || [];
            const colScore = myColScores[colIdx];
            const multipliers = getColumnMultipliers(colDice);
            const canPlace = isPlayable && colDice.length < 3;
            const showGhost = canPlace && hoveredCol === colIdx && currentRoll !== null;

            return (
              <div
                key={`my-col-${colIdx}`}
                className={`${styles.gridCol} ${canPlace ? styles.colPlayable : ''}`}
                onClick={() => canPlace && handleColClick(colIdx)}
                onMouseEnter={() => canPlace && setHoveredCol(colIdx)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                {/* Column Slots (standard vertical stack) */}
                <div className={styles.slotsContainer}>
                  {Array.from({ length: 3 }).map((_, slotIdx) => {
                    const dieVal = colDice[slotIdx];
                    const isGhostSlot = showGhost && slotIdx === colDice.length;

                    return (
                      <div key={`my-slot-${colIdx}-${slotIdx}`} className={styles.dieSlot}>
                        {dieVal !== undefined && renderDieFace(dieVal, false)}
                        {isGhostSlot && currentRoll !== null && (
                          <div className={`${styles.placedDie} ${styles.ghostDie} ${styles.dieP1}`}>
                            {['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][currentRoll - 1]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className={styles.colHeader}>
                  <span className={`${styles.colScore} ${currentPlayer === playerIdx ? styles.scoreActiveP1 : ''}`}>
                    {colScore}
                  </span>
                  {multipliers.map((m, mIdx) => (
                    <span key={mIdx} className={styles.multBadge} title={`${m.val} matched x${m.count}`}>
                      {m.count}x
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dice Console Tray */}
      <div className={styles.diceConsole}>
        <div className={styles.diceShowcase}>
          <div className={`${styles.dieConsoleShow} ${localRolling ? styles.dieRolling : ''}`}>
            {typeof dieDisplay === 'number'
              ? ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dieDisplay - 1]
              : dieDisplay}
          </div>
          <span className={`${styles.rollText} ${isMyTurn && !gameOver && !hasRolled ? styles.rollTextActive : ''}`}>
            {gameOver
              ? 'Board Finished!'
              : isMyTurn
              ? hasRolled
                ? 'Select a column on your grid to place the die!'
                : 'Your Turn! Roll the die.'
              : "Waiting for opponent's turn..."}
          </span>
        </div>

        <button
          type="button"
          className={styles.rollBtn}
          disabled={!isMyTurn || gameOver || hasRolled || localRolling}
          onClick={handleRollClick}
        >
          🎰 Roll Die
        </button>
      </div>
    </div>
  );
}

export default function KnarrPlacementGamePage() {
  return (
    <GameTemplate
      gameType="knarr_placement"
      gameName="Knarr-Style Placement"
      gameIcon="knarr-placement"
      accentColor="#8b5cf6"
      winEmoji="👑"
      winTitle="Tactical Victory!"
      loseTitle="Dice Placements Finished"
      drawTitle="Grids Filled & Tied"
    >
      {(props) => <KnarrPlacementBoard {...props} />}
    </GameTemplate>
  );
}
