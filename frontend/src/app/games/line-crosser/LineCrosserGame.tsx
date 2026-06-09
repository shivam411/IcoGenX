// frontend/src/app/games/line-crosser/LineCrosserGame.tsx
'use client';

import { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function LineCrosserBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const dotsUsed: boolean[] = gameState?.dots_used || Array(16).fill(false);
  const lines: [number, number, number][] = gameState?.lines || []; // [dot_a, dot_b, owner_player]
  const scores: number[] = gameState?.scores || [0, 0];
  const lastEvent: string | null = gameState?.last_event || null;
  const current_player: number = gameState?.currentPlayer ?? 0;

  const [selectedDot, setSelectedDot] = useState<number | null>(null);
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);

  // Reset selections when turn changes or game resets
  useEffect(() => {
    setSelectedDot(null);
    setHoveredDot(null);
  }, [current_player, gameOver]);

  const player1Name = allPlayerNames[0] || 'Player 1';
  const player2Name = allPlayerNames[1] || 'Player 2';

  const getDotCoords = (idx: number) => {
    const angle = (idx * 2 * Math.PI) / 16 - Math.PI / 2;
    const cx = 200;
    const cy = 200;
    const radius = 150; // Keeps dots slightly in from borders
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  const handleDotClick = (idx: number) => {
    if (!isMyTurn || gameOver || dotsUsed[idx]) return;

    if (selectedDot === null) {
      setSelectedDot(idx);
    } else if (selectedDot === idx) {
      setSelectedDot(null);
    } else {
      sendAction({
        action: 'DrawLine',
        a: selectedDot,
        b: idx,
      });
      setSelectedDot(null);
      setHoveredDot(null);
    }
  };

  const isPlayable = isMyTurn && !gameOver;

  // Render preview line coordinates if applicable
  const previewCoords =
    selectedDot !== null &&
    hoveredDot !== null &&
    selectedDot !== hoveredDot &&
    !dotsUsed[hoveredDot]
      ? { start: getDotCoords(selectedDot), end: getDotCoords(hoveredDot) }
      : null;

  const remainingDots = dotsUsed.filter((used) => !used).length;

  return (
    <div className={styles.shell}>
      {/* Event banner / status bar */}
      <div className={styles.statusBar}>
        <span>{lastEvent || 'Select a boundary dot, then click another to cross lines!'}</span>
      </div>

      {/* Scores */}
      <div className={styles.scoreBoard}>
        <div className={`${styles.scoreCard} ${current_player === 0 ? styles.activeScoreP1 : ''}`}>
          <div className={styles.scoreLabel}>{player1Name} Score:</div>
          <div className={`${styles.scoreVal} ${styles.scoreP1Val}`}>{scores[0]} pts</div>
        </div>
        <div className={`${styles.scoreCard} ${current_player === 1 ? styles.activeScoreP2 : ''}`}>
          <div className={styles.scoreLabel}>{player2Name} Score:</div>
          <div className={`${styles.scoreVal} ${styles.scoreP2Val}`}>{scores[1]} pts</div>
        </div>
      </div>

      {/* Board Panel */}
      <div className={styles.boardContainer}>
        <svg className={styles.svgBoard} viewBox="0 0 400 400" aria-label="Line Crosser Grid">
          {/* Radar background details */}
          <circle cx="200" cy="200" r="150" className={styles.radarCircle} />
          <circle cx="200" cy="200" r="100" className={styles.radarCircle} />
          <circle cx="200" cy="200" r="50" className={styles.radarCircle} />
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * Math.PI) / 8;
            const x1 = 200 - 160 * Math.cos(angle);
            const y1 = 200 - 160 * Math.sin(angle);
            const x2 = 200 + 160 * Math.cos(angle);
            const y2 = 200 + 160 * Math.sin(angle);
            return (
              <line
                key={`spoke-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={styles.radarSpoke}
              />
            );
          })}

          {/* Placed Connection Lines */}
          {lines.map((line, lIdx) => {
            const [a, b, owner] = line;
            const start = getDotCoords(a);
            const end = getDotCoords(b);

            return (
              <line
                key={`line-${lIdx}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                className={`${styles.connectionLine} ${
                  owner === 0 ? styles.lineP1 : styles.lineP2
                }`}
              />
            );
          })}

          {/* Active Preview Line */}
          {previewCoords && (
            <line
              x1={previewCoords.start.x}
              y1={previewCoords.start.y}
              x2={previewCoords.end.x}
              y2={previewCoords.end.y}
              className={styles.previewLine}
            />
          )}

          {/* Perimeter Dots */}
          {Array.from({ length: 16 }).map((_, idx) => {
            const { x, y } = getDotCoords(idx);
            const isUsed = dotsUsed[idx];
            const isSelected = selectedDot === idx;
            const playable = isPlayable && !isUsed;

            let dotClass = styles.gridDot;
            if (isUsed) {
              dotClass += ` ${styles.gridDotUsed}`;
            } else if (isSelected) {
              dotClass += ` ${styles.gridDotSelected}`;
            } else if (playable) {
              dotClass += ` ${styles.gridDotPlayable}`;
            }

            let textClass = styles.dotText;
            if (isUsed) {
              textClass += ` ${styles.dotTextUsed}`;
            } else if (isSelected || playable) {
              textClass += ` ${styles.dotTextActive}`;
            }

            return (
              <g key={`dot-g-${idx}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 10 : 8}
                  className={dotClass}
                  onClick={() => playable && handleDotClick(idx)}
                  onMouseEnter={() => playable && setHoveredDot(idx)}
                  onMouseLeave={() => setHoveredDot(null)}
                />
                <text x={x} y={y + 0.5} className={textClass}>
                  {idx + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Instructions & Summary */}
      <div className={styles.instructions}>
        <h4>Strategy Notes</h4>
        <ul>
          <li>Remaining boundary points: <strong>{remainingDots}</strong> / 16.</li>
          <li>Intersecting an <strong>opponent</strong> line scores <strong>1 point</strong>.</li>
          <li>Intersecting your <strong>own</strong> line scores <strong>2 points</strong>!</li>
          <li>Connect dots on opposite sides to cross multiple segments and compound your scores.</li>
        </ul>
      </div>
    </div>
  );
}

export default function LineCrosserGamePage() {
  return (
    <GameTemplate
      gameType="line_crosser"
      gameName="Line Crosser"
      gameIcon="line-crosser"
      accentColor="#06b6d4"
      winEmoji="🎯"
      winTitle="Master Planner!"
      loseTitle="Chords Explored"
      drawTitle="Dots Exhausted"
    >
      {(props) => <LineCrosserBoard {...props} />}
    </GameTemplate>
  );
}
