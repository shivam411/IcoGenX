// frontend/src/app/games/vortex/VortexGame.tsx
'use client';

import React, { useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

// Overlapping dials cell indices mapping
const DIAL_CELLS = [
  [0, 1, 5, 4],    // Dial 0: Top-Left
  [1, 2, 6, 5],    // Dial 1: Top-Right
  [8, 9, 13, 12],  // Dial 2: Bottom-Left
  [9, 10, 14, 13], // Dial 3: Bottom-Right
  [4, 5, 9, 8],    // Dial 4: Middle-Left
  [5, 6, 10, 9],   // Dial 5: Middle-Right
];

// Dial center placement coordinates on a 400x400 SVG or relative container
// For a 4x4 grid of 80px cells (320px total) with 10px gaps
// Grid cells centers:
// Row 0: 45, 135, 225, 315
// Row 1: 45, 135, 225, 315
// Center coordinates at intersections:
// Dial 0 (between row 0-1, col 0-1): cx=90, cy=90
// Dial 1 (between row 0-1, col 1-2): cx=180, cy=90
// Dial 4 (between row 1-2, col 0-1): cx=90, cy=180
// Dial 5 (between row 1-2, col 1-2): cx=180, cy=180
// Dial 2 (between row 2-3, col 0-1): cx=90, cy=270
// Dial 3 (between row 2-3, col 1-2): cx=180, cy=270

const DIAL_METADATA = [
  { id: 0, name: 'Top Left Dial', x: '25%', y: '25%' },
  { id: 1, name: 'Top Right Dial', x: '50%', y: '25%' },
  { id: 4, name: 'Mid Left Dial', x: '25%', y: '50%' },
  { id: 5, name: 'Mid Right Dial', x: '50%', y: '50%' },
  { id: 2, name: 'Bottom Left Dial', x: '25%', y: '75%' },
  { id: 3, name: 'Bottom Right Dial', x: '50%', y: '75%' },
];

const SHIFT_PUZZLE_COLORS = [
  '#ef4444', // 0: Red
  '#3b82f6', // 1: Blue
  '#10b981', // 2: Green
  '#eab308', // 3: Yellow
];

function VortexBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [hoveredDial, setHoveredDial] = useState<number | null>(null);
  const [selectedDial, setSelectedDial] = useState<number | null>(null);

  if (!gameState) return null;

  const variant = gameState.variant || 'classic';
  const board: (number | null)[] = gameState.board || Array(16).fill(null);
  const targetBoard: (number | null)[] = gameState.target_board || Array(16).fill(null);
  const rowLevers: number[] = gameState.row_levers || [0, 0, 0, 0];
  const colLevers: number[] = gameState.col_levers || [0, 0, 0, 0];
  const lastEvent: string = gameState.last_event || 'Game started!';

  const playerIdx = playerNumber;
  const oppIdx = 1 - playerIdx;

  const isP1 = playerIdx === 0;
  const myColor = isP1 ? '#22d3ee' : '#fb7185';
  const oppColor = isP1 ? '#fb7185' : '#22d3ee';

  // Find which dial cells should be highlighted
  const activeHighlightCells = hoveredDial !== null 
    ? DIAL_CELLS[hoveredDial] 
    : (selectedDial !== null ? DIAL_CELLS[selectedDial] : []);

  const handleRotate = (dialIdx: number, clockwise: boolean) => {
    if (!isMyTurn || gameOver) return;
    sendAction({
      action: 'RotateDial',
      dial_idx: dialIdx,
      clockwise,
    });
    setSelectedDial(null);
  };

  const handleToggleLever = (isRow: boolean, idx: number) => {
    if (!isMyTurn || gameOver) return;
    sendAction({
      action: 'ToggleLever',
      is_row: isRow,
      idx,
    });
  };

  // Render cell helper
  const renderCell = (cellOwner: number | null, idx: number, isMini = false) => {
    const isHighlighted = !isMini && activeHighlightCells.includes(idx);
    
    // Shift Puzzle Colors
    const isShiftPuzzle = variant === 'shift_puzzle';
    const colorStyle = isShiftPuzzle && cellOwner !== null
      ? { backgroundColor: SHIFT_PUZZLE_COLORS[cellOwner] }
      : {};

    // Check Stay Alive drop zone state
    const cellR = Math.floor(idx / 4);
    const cellC = idx % 4;
    const isTrapdoorOpen = variant === 'stay_alive' && rowLevers[cellR] === 1 && colLevers[cellC] === 1;

    return (
      <div
        key={isMini ? `mini-${idx}` : `cell-${idx}`}
        className={`
          ${styles.cell}
          ${isHighlighted ? styles.cellHighlighted : ''}
          ${isTrapdoorOpen ? styles.cellTrapdoorOpen : ''}
          ${isShiftPuzzle ? styles.cellShiftColor : ''}
          ${isMini ? styles.miniCell : ''}
        `}
        style={colorStyle}
      >
        {isTrapdoorOpen && !isMini && (
          <div className={styles.trapdoorVoid}>
            <div className={styles.vortexSpinner} />
          </div>
        )}

        {cellOwner !== null && !isTrapdoorOpen && !isShiftPuzzle && (
          <div
            className={styles.marble}
            style={{
              backgroundColor: cellOwner === 0 ? '#22d3ee' : '#fb7185',
              boxShadow: `0 0 12px ${cellOwner === 0 ? '#22d3ee' : '#fb7185'}aa`,
            }}
          >
            {/* Render a custom triangle symbol inside the marble for Classic Vortex */}
            {variant === 'classic' && (
              <span className={styles.triangleSymbol}>
                {cellOwner === 0 ? '▼' : '▲'}
              </span>
            )}
            <span className={styles.marbleLabel}>
              {cellOwner === 0 ? 'P1' : 'P2'}
            </span>
          </div>
        )}

        {/* Shutter indicators for Stay Alive row/col markers */}
        {!isMini && variant !== 'stay_alive' && (
          <span className={styles.cellCoords}>{cellC},{cellR}</span>
        )}
      </div>
    );
  };

  return (
    <div className={styles.boardShell}>
      {/* Event banner */}
      <div className={styles.statusBar}>
        <span className={styles.statusText}>{lastEvent}</span>
      </div>

      {/* Main Layout Area */}
      <div className={styles.gameArea}>
        
        {/* Play Board wrapper */}
        <div className={styles.boardWrapper}>
          
          {/* Top Col Levers for Stay Alive */}
          {variant === 'stay_alive' && (
            <div className={styles.colLeversRow}>
              <div className={styles.leverCornerSpacer} />
              <div className={styles.leversContainer}>
                {colLevers.map((state, idx) => (
                  <button
                    key={`col-lever-${idx}`}
                    onClick={() => handleToggleLever(false, idx)}
                    disabled={!isMyTurn || gameOver}
                    className={`
                      ${styles.leverButton}
                      ${styles.colLever}
                      ${state === 1 ? styles.leverActive : ''}
                    `}
                  >
                    <span className={styles.leverLabel}>C{idx + 1}</span>
                    <div className={styles.leverSwitch}>
                      <div className={styles.switchHandle} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Grid row containing Row Levers + Grid Board */}
          <div className={styles.gridRow}>
            
            {/* Left Row Levers for Stay Alive */}
            {variant === 'stay_alive' && (
              <div className={styles.rowLeversCol}>
                {rowLevers.map((state, idx) => (
                  <button
                    key={`row-lever-${idx}`}
                    onClick={() => handleToggleLever(true, idx)}
                    disabled={!isMyTurn || gameOver}
                    className={`
                      ${styles.leverButton}
                      ${styles.rowLever}
                      ${state === 1 ? styles.leverActive : ''}
                    `}
                  >
                    <span className={styles.leverLabel}>R{idx + 1}</span>
                    <div className={styles.leverSwitch}>
                      <div className={styles.switchHandle} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* The 4x4 Grid Container */}
            <div className={styles.gridRelative}>
              <div className={styles.gridContainer}>
                {board.map((cell, idx) => renderCell(cell, idx))}
              </div>

              {/* Overlaid circular dial dials (Classic & Shift Puzzle) */}
              {variant !== 'stay_alive' && (
                <div className={styles.dialsOverlay}>
                  {DIAL_METADATA.map((dial) => {
                    const isHovered = hoveredDial === dial.id;
                    const isSelected = selectedDial === dial.id;
                    
                    return (
                      <div
                        key={`dial-${dial.id}`}
                        className={`
                          ${styles.dialCenter}
                          ${isHovered ? styles.dialHovered : ''}
                          ${isSelected ? styles.dialSelected : ''}
                        `}
                        style={{ left: dial.x, top: dial.y }}
                        onMouseEnter={() => !gameOver && setHoveredDial(dial.id)}
                        onMouseLeave={() => setHoveredDial(null)}
                        onClick={() => !gameOver && setSelectedDial(selectedDial === dial.id ? null : dial.id)}
                      >
                        <div className={styles.dialKnob}>
                          <span className={styles.dialNumber}>{dial.id + 1}</span>
                        </div>

                        {/* Dial Arrow Controls overlay */}
                        {(isHovered || isSelected) && isMyTurn && !gameOver && (
                          <div className={styles.dialControls}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRotate(dial.id, false);
                              }}
                              className={`${styles.rotatorBtn} ${styles.ccw}`}
                              title="Rotate Counter-Clockwise"
                            >
                              ↺
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRotate(dial.id, true);
                              }}
                              className={`${styles.rotatorBtn} ${styles.cw}`}
                              title="Rotate Clockwise"
                            >
                              ↻
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Sidebar Console dashboard */}
        <div className={styles.consoleContainer}>
          
          {/* Target pattern for Shift Puzzle */}
          {variant === 'shift_puzzle' && (
            <div className={styles.targetPatternBox}>
              <h3 className={styles.targetTitle}>Target Pattern</h3>
              <div className={styles.miniGridContainer}>
                {targetBoard.map((cell, idx) => renderCell(cell, idx, true))}
              </div>
            </div>
          )}

          {/* Classic Info */}
          {variant === 'classic' && (
            <div className={styles.goalInfoBox}>
              <h3 className={styles.goalTitle}>Goal</h3>
              <p className={styles.goalDesc}>
                {isP1 
                  ? 'Navigate your 3 Cyan marbles (▼) from Row 0 to Row 3.'
                  : 'Navigate your 3 Rose marbles (▲) from Row 3 to Row 0.'
                }
              </p>
              <div className={styles.rulesGuide}>
                <span className={styles.rulesLabel}>Overlapping Dial Zones:</span>
                <ul className={styles.rulesList}>
                  <li>Hover dial numbers (1-6) on the board to view affected cells.</li>
                  <li>Click a dial to reveal ↺ (CCW) and ↻ (CW) rotation buttons.</li>
                  <li>Column 4 (rightmost column) has no overlapping dials. Move pieces in/out of Dial 2/Dial 6 overlap cells to navigate.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Stay Alive Info */}
          {variant === 'stay_alive' && (
            <div className={styles.goalInfoBox}>
              <h3 className={styles.goalTitle}>Elimination</h3>
              <p className={styles.goalDesc}>
                Set row levers (left) and column levers (top) to open drop hatches. If both row and column levers are set to active (1) for a cell, any marble there falls. Keep yours alive while dropping the opponent!
              </p>
            </div>
          )}

          {/* Console Turn Guidelines */}
          <div className={styles.turnTray}>
            {isMyTurn ? (
              <div className={styles.activeTurnAlert}>
                {variant === 'stay_alive' 
                  ? '🎯 Choose a lever on the edges to toggle!'
                  : '🎯 Hover/Click a Dial Center (1-6) to rotate!'
                }
              </div>
            ) : (
              <div className={styles.waitingAlert}>
                Waiting for {allPlayerNames[oppIdx] || opponentName || 'Opponent'}...
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

export default function VortexGamePage({ variant = 'classic' }: { variant?: string }) {
  // Translate the path variant format to the server-side format
  const serverVariant = variant === 'stay_alive' || variant === 'stay-alive'
    ? 'stay_alive'
    : (variant === 'shift_puzzle' || variant === 'shift-puzzle' ? 'shift_puzzle' : 'classic');

  return (
    <GameTemplate
      gameType="vortex"
      variant={serverVariant}
      gameName={
        serverVariant === 'stay_alive'
          ? 'Stay Alive!'
          : (serverVariant === 'shift_puzzle' ? 'Shift Puzzle' : 'Vortex')
      }
      gameIcon={
        serverVariant === 'stay_alive'
          ? 'vortex-stay-alive'
          : (serverVariant === 'shift_puzzle' ? 'vortex-shift-puzzle' : 'vortex-classic')
      }
      accentColor="#8b5cf6"
      winEmoji="🌀"
      winTitle="Vortex Master!"
      loseTitle="Runner Up"
      drawTitle="Draw Match"
    >
      {(props) => <VortexBoard {...props} />}
    </GameTemplate>
  );
}
