/* frontend/src/app/games/trappex/TrappexGame.tsx */
'use client';

import { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function TrappexBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  if (!gameState) return null;

  const N = gameState.grid_size || 5;
  const horizontalBarriers: (number | null)[] = gameState.horizontal_barriers || [];
  const verticalBarriers: (number | null)[] = gameState.vertical_barriers || [];
  const claimedSquares: (number | null)[] = gameState.claimed_squares || [];
  const lastEvent: string | null = gameState.last_event || null;
  const currentTurnPlayer = gameState.current_player;

  const opponentLabel = opponentName || 'Opponent';
  const player1Name = allPlayerNames[0] || 'Player 1';
  const player2Name = allPlayerNames[1] || 'Player 2';

  // Calculate scores
  const scoreP1 = claimedSquares.filter((s) => s === 0).length;
  const scoreP2 = claimedSquares.filter((s) => s === 1).length;

  const showWarning = (msg: string) => {
    setWarningMsg(msg);
    const timer = setTimeout(() => setWarningMsg(null), 2500);
    return () => clearTimeout(timer);
  };

  const handleBarrierClick = (type: 'H' | 'V', index: number) => {
    if (gameOver) return;
    if (!isMyTurn) {
      showWarning("Not your turn!");
      return;
    }
    
    // Safety check if already placed (though hitboxes shouldn't render)
    if (type === 'H' && horizontalBarriers[index] !== null) return;
    if (type === 'V' && verticalBarriers[index] !== null) return;

    sendAction({
      action: 'TrappexPlace',
      barrier_type: type,
      index: index,
    });
  };

  // SVG dimensions
  const svgSize = 400;
  const padding = 30;
  const activeWidth = svgSize - 2 * padding;
  const step = activeWidth / N;

  // Helper to get initials
  const getPlayerInitial = (pIdx: number) => {
    const name = allPlayerNames[pIdx];
    return name ? name.trim().charAt(0).toUpperCase() : (pIdx === 0 ? 'A' : 'B');
  };

  // Helper to determine if a dot is connected to any placed barrier
  const isDotConnected = (r: number, c: number): boolean => {
    // Check horizontal barriers
    if (c > 0 && horizontalBarriers[r * N + (c - 1)] !== null) return true;
    if (c < N && horizontalBarriers[r * N + c] !== null) return true;
    // Check vertical barriers
    if (r > 0 && verticalBarriers[(r - 1) * (N + 1) + c] !== null) return true;
    if (r < N && verticalBarriers[r * (N + 1) + c] !== null) return true;
    return false;
  };

  // Determine turn feedback message
  const isBonusTurn = lastEvent?.includes('bonus turn') && !gameOver;
  const isOpponentTurn = !isMyTurn && !gameOver;

  const hitboxClass = `${styles.hitbox} ${
    isMyTurn
      ? (playerNumber === 0 ? styles.hitboxP1Hover : styles.hitboxP2Hover)
      : ''
  }`;

  return (
    <div className={styles.gameWrapper}>
      <div className={styles.boardContainer}>
        {/* Status Area */}
        <div className={styles.statusText}>
          {warningMsg ? (
            <span className={styles.warning}>{warningMsg}</span>
          ) : isBonusTurn ? (
            <span className={styles.bonusTurn}>🔥 Bonus Turn! Enclose another square.</span>
          ) : isMyTurn ? (
            <span className={styles.myTurn}>🎯 Your turn! Place a barrier.</span>
          ) : isOpponentTurn ? (
            <span className={styles.opponentTurn}>⏳ Waiting for {opponentLabel}...</span>
          ) : (
            <span className={styles.opponentTurn}>Game Over</span>
          )}
        </div>

        {/* SVG Board */}
        <svg className={styles.svgBoard} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <defs>
            <pattern id="obstacleHatch" width="10" height="10" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(244, 63, 94, 0.4)" strokeWidth="3" />
              <rect width="10" height="10" fill="rgba(244, 63, 94, 0.08)" />
            </pattern>
          </defs>

          {/* 1. Claimed Squares / Obstacles */}
          {Array.from({ length: N * N }).map((_, idx) => {
            const r = Math.floor(idx / N);
            const c = idx % N;
            const x = padding + c * step;
            const y = padding + r * step;
            const owner = claimedSquares[idx];

            if (owner === null) return null;

            const isObstacle = owner === 2;
            const isP1 = owner === 0;
            const isP2 = owner === 1;

            return (
              <g key={`sq-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={step}
                  height={step}
                  className={
                    isObstacle
                      ? styles.squareObstacle
                      : isP1
                      ? styles.squareClaimedP1
                      : styles.squareClaimedP2
                  }
                />
                {!isObstacle && (
                  <text
                    x={x + step / 2}
                    y={y + step / 2}
                    className={`${styles.squareText} ${isP1 ? styles.textP1 : styles.textP2}`}
                  >
                    {getPlayerInitial(owner)}
                  </text>
                )}
              </g>
            );
          })}

          {/* 2. Horizontal Grooves & Lines */}
          {Array.from({ length: (N + 1) * N }).map((_, idx) => {
            const r = Math.floor(idx / N);
            const c = idx % N;
            const x1 = padding + c * step;
            const y1 = padding + r * step;
            const x2 = padding + (c + 1) * step;
            const y2 = y1;

            const owner = horizontalBarriers[idx];
            const isPlaced = owner !== null;

            if (isPlaced) {
              let lineClass = styles.barrierLine;
              if (owner === 0) lineClass += ` ${styles.lineP1}`;
              else if (owner === 1) lineClass += ` ${styles.lineP2}`;
              else if (owner === 2) lineClass += ` ${styles.lineObstacle}`;

              return (
                <line
                  key={`h-placed-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={lineClass}
                />
              );
            }

            return (
              <g key={`h-empty-${idx}`}>
                <rect
                  x={x1}
                  y={y1 - 6}
                  width={step}
                  height={12}
                  className={hitboxClass}
                  onClick={() => handleBarrierClick('H', idx)}
                />
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={`${styles.barrierLine} ${styles.lineEmpty}`}
                />
              </g>
            );
          })}

          {/* 3. Vertical Grooves & Lines */}
          {Array.from({ length: N * (N + 1) }).map((_, idx) => {
            const r = Math.floor(idx / (N + 1));
            const c = idx % (N + 1);
            const x1 = padding + c * step;
            const y1 = padding + r * step;
            const x2 = x1;
            const y2 = padding + (r + 1) * step;

            const owner = verticalBarriers[idx];
            const isPlaced = owner !== null;

            if (isPlaced) {
              let lineClass = styles.barrierLine;
              if (owner === 0) lineClass += ` ${styles.lineP1}`;
              else if (owner === 1) lineClass += ` ${styles.lineP2}`;
              else if (owner === 2) lineClass += ` ${styles.lineObstacle}`;

              return (
                <line
                  key={`v-placed-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={lineClass}
                />
              );
            }

            return (
              <g key={`v-empty-${idx}`}>
                <rect
                  x={x1 - 6}
                  y={y1}
                  width={12}
                  height={step}
                  className={hitboxClass}
                  onClick={() => handleBarrierClick('V', idx)}
                />
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={`${styles.barrierLine} ${styles.lineEmpty}`}
                />
              </g>
            );
          })}

          {/* 4. Dots */}
          {Array.from({ length: (N + 1) * (N + 1) }).map((_, idx) => {
            const r = Math.floor(idx / (N + 1));
            const c = idx % (N + 1);
            const x = padding + c * step;
            const y = padding + r * step;
            const active = isDotConnected(r, c);

            return (
              <circle
                key={`dot-${idx}`}
                cx={x}
                cy={y}
                r={active ? 4.5 : 3.5}
                className={`${styles.gridDot} ${active ? styles.gridDotActive : ''}`}
              />
            );
          })}
        </svg>

        {/* Dynamic score summary */}
        <div className={styles.scoreBoard}>
          <div className={`${styles.scoreItem} ${styles.scoreP1}`}>
            <div className={styles.scoreLabel}>{player1Name} (Initials: {getPlayerInitial(0)})</div>
            <div className={styles.scoreVal}>{scoreP1}</div>
          </div>
          <div className={`${styles.scoreItem} ${styles.scoreP2}`}>
            <div className={styles.scoreLabel}>{player2Name} (Initials: {getPlayerInitial(1)})</div>
            <div className={styles.scoreVal}>{scoreP2}</div>
          </div>
        </div>

        {/* Last Move Log */}
        {lastEvent && <div className={styles.eventLog}>{lastEvent}</div>}
      </div>
    </div>
  );
}

export default function TrappexGamePage({ variant = 'classic' }: { variant?: string }) {
  const isQuick = variant === 'quick';
  const isObstacles = variant === 'obstacles';
  
  const displayName = isQuick
    ? 'Trappex (Quick Play)'
    : isObstacles
    ? 'Trappex (Obstacles)'
    : 'Trappex';

  return (
    <GameTemplate
      gameType="trappex"
      variant={variant}
      gameName={displayName}
      gameIcon="trappex"
      accentColor="#3b82f6"
      winEmoji="🏆"
      winTitle="Victory!"
      loseTitle="Defeat!"
      drawTitle="Draw!"
    >
      {(props) => <TrappexBoard {...props} />}
    </GameTemplate>
  );
}
