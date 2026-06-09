// frontend/src/app/games/sos-dot/SosDotGame.tsx
'use client';

import { useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function SosBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const board: Array<string | null> = gameState?.board || Array(36).fill(null);
  const scores: number[] = gameState?.scores || [0, 0];
  const completedLines: number[][] = gameState?.completed_lines || [];
  const lastEvent: string | null = gameState?.last_event || null;

  const [selectedLetter, setSelectedLetter] = useState<'S' | 'O'>('S');

  const player1Name = allPlayerNames[0] || 'Player 1';
  const player2Name = allPlayerNames[1] || 'Player 2';

  const handleCellClick = (cellIdx: number) => {
    if (!isMyTurn || gameOver || board[cellIdx] !== null) return;

    sendAction({
      action: 'PlaceLetter',
      cell: cellIdx,
      letter: selectedLetter,
    });
  };

  // Sizing coordinates for SVG strike-through overlays
  const getCellCenterPercent = (idx: number): { x: number; y: number } => {
    const r = Math.floor(idx / 6);
    const c = idx % 6;
    return {
      x: (c + 0.5) * (100 / 6),
      y: (r + 0.5) * (100 / 6),
    };
  };

  return (
    <div className={styles.shell}>
      {/* Event banner / status bar */}
      <div className={styles.statusBar}>
        <span>{lastEvent || 'Select a letter, then place it on the board.'}</span>
      </div>

      {/* Scores */}
      <div className={styles.scoreBoard}>
        <div className={`${styles.scoreCard} ${gameState?.currentPlayer === 0 ? styles.activeScoreP1 : ''}`}>
          <div className={styles.scoreLabel}>{player1Name} Score:</div>
          <div className={styles.scoreVal}>{scores[0]} pts</div>
        </div>
        <div className={`${styles.scoreCard} ${gameState?.currentPlayer === 1 ? styles.activeScoreP2 : ''}`}>
          <div className={styles.scoreLabel}>{player2Name} Score:</div>
          <div className={styles.scoreVal}>{scores[1]} pts</div>
        </div>
      </div>

      {/* Letter Selector Row */}
      <div className={styles.selectorRow}>
        <button
          type="button"
          className={`${styles.letterBtn} ${selectedLetter === 'S' ? styles.activeS : ''}`}
          disabled={!isMyTurn || gameOver}
          onClick={() => setSelectedLetter('S')}
        >
          S
        </button>
        <button
          type="button"
          className={`${styles.letterBtn} ${selectedLetter === 'O' ? styles.activeO : ''}`}
          disabled={!isMyTurn || gameOver}
          onClick={() => setSelectedLetter('O')}
        >
          O
        </button>
      </div>

      {/* Board and overlay */}
      <div className={styles.boardContainer}>
        {/* SVG Strike-through Lines */}
        <svg className={styles.svgOverlay}>
          {completedLines.map((line, lIdx) => {
            const startIdx = line[0];
            const endIdx = line[2];
            const start = getCellCenterPercent(startIdx);
            const end = getCellCenterPercent(endIdx);

            return (
              <line
                key={`strike-${lIdx}`}
                x1={`${start.x}%`}
                y1={`${start.y}%`}
                x2={`${end.x}%`}
                y2={`${end.y}%`}
                className={styles.strikeLine}
              />
            );
          })}
        </svg>

        {/* 6x6 Cells Grid */}
        <div className={styles.grid} aria-label="SOS Grid Board">
          {board.map((cellLetter, idx) => {
            const playable = isMyTurn && cellLetter === null && !gameOver;

            return (
              <div
                key={idx}
                className={`${styles.cell} ${playable ? styles.cellPlayable : ''}`}
                onClick={() => playable && handleCellClick(idx)}
              >
                {cellLetter !== null && (
                  <span className={cellLetter === 'S' ? styles.letterS : styles.letterO}>
                    {cellLetter}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SosDotGamePage() {
  return (
    <GameTemplate
      gameType="sos_dot"
      gameName="SOS Dot Game"
      gameIcon="sos-dot"
      accentColor="#ec4899"
      winEmoji="👑"
      winTitle="Most SOS Formations!"
      loseTitle="Combo Interrupted"
      drawTitle="Grid Filled"
    >
      {(props) => <SosBoard {...props} />}
    </GameTemplate>
  );
}
