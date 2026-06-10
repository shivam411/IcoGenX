/* frontend/src/app/games/vortex/VortexGame.tsx */
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
  const [tilt, setTilt] = useState(180);
  const [force, setForce] = useState(50);
  const [coneAngle, setConeAngle] = useState(180);

  if (!gameState) return null;

  const variant = gameState.variant || 'classic';
  const board: (number | null)[] = gameState.board || [];
  const targetBoard: (number | null)[] = gameState.target_board || [];
  const rowLevers: number[] = gameState.row_levers || [0, 0, 0, 0];
  const colLevers: number[] = gameState.col_levers || [0, 0, 0, 0];
  const lastEvent: string = gameState.last_event || 'Game started!';
  
  const scores: number[] = gameState.scores || [0, 0];
  const turnsRemaining: number[] = gameState.turns_remaining || [5, 5];
  const gates: (number | null)[] = gameState.gates || [];
  const gateValues: number[] = gameState.gate_values || [];

  const playerIdx = playerNumber;
  const oppIdx = 1 - playerIdx;

  const isP1 = playerIdx === 0;
  const myColor = isP1 ? '#22d3ee' : '#fb7185';
  const oppColor = isP1 ? '#fb7185' : '#22d3ee';

  const myScore = scores[playerIdx] ?? 0;
  const oppScore = scores[oppIdx] ?? 0;
  const myTurns = turnsRemaining[playerIdx] ?? 0;
  const oppTurns = turnsRemaining[oppIdx] ?? 0;

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

  const handleRollBall = () => {
    if (!isMyTurn || gameOver || myTurns === 0) return;
    sendAction({
      action: 'RollBall',
      tilt,
      force,
    });
  };

  const handleLaunchTwizzle = () => {
    if (!isMyTurn || gameOver || myTurns === 0) return;
    sendAction({
      action: 'LaunchMarble',
      cone_angle: coneAngle,
    });
  };

  // Render cell helper (for 4x4 variants)
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

        {!isMini && variant !== 'stay_alive' && (
          <span className={styles.cellCoords}>{cellC},{cellR}</span>
        )}
      </div>
    );
  };

  // --- RENDERING FOR DIFFERENT VARIANTS ---

  // A. MARBLE SLIDE: 6x6 grid with 24 perimeter slots
  if (variant === 'marble_slide') {
    const perimeter = gameState.perimeter || Array(24).fill(null);
    const renderPerimeterSlot = (idx: number) => {
      const owner = perimeter[idx];
      const isMine = owner === playerNumber;
      const canClick = isMine && isMyTurn && !gameOver;
      return (
        <button
          key={`perim-${idx}`}
          disabled={!canClick}
          onClick={() => sendAction({ action: 'PushMarble', from_idx: idx })}
          className={`
            ${styles.perimeterSlot}
            ${owner !== null ? styles.hasMarble : ''}
            ${canClick ? styles.perimClickable : ''}
          `}
          style={{
            backgroundColor: owner === 0 ? '#22d3ee' : owner === 1 ? '#fb7185' : 'transparent',
            boxShadow: owner !== null ? `0 0 10px ${owner === 0 ? '#22d3ee' : '#fb7185'}aa` : undefined
          }}
        >
          {owner !== null && (
            <span className={styles.marbleLabel}>
              {owner === 0 ? 'P1' : 'P2'}
            </span>
          )}
        </button>
      );
    };

    const cells8x8 = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (r === 0) {
          if (c === 0 || c === 7) {
            cells8x8.push(<div key={`spacer-${r}-${c}`} className={styles.perimSpacer} />);
          } else {
            cells8x8.push(renderPerimeterSlot(c - 1));
          }
        } else if (r === 7) {
          if (c === 0 || c === 7) {
            cells8x8.push(<div key={`spacer-${r}-${c}`} className={styles.perimSpacer} />);
          } else {
            cells8x8.push(renderPerimeterSlot(17 - (c - 1)));
          }
        } else {
          if (c === 0) {
            cells8x8.push(renderPerimeterSlot(23 - (r - 1)));
          } else if (c === 7) {
            cells8x8.push(renderPerimeterSlot(6 + (r - 1)));
          } else {
            const gridIdx = (r - 1) * 6 + (c - 1);
            const cellOwner = board[gridIdx];
            cells8x8.push(
              <div
                key={`inner-cell-${gridIdx}`}
                className={`
                  ${styles.cell}
                  ${styles.cell6x6}
                `}
              >
                {cellOwner !== null && (
                  <div
                    className={styles.marble}
                    style={{
                      backgroundColor: cellOwner === 0 ? '#22d3ee' : '#fb7185',
                      boxShadow: `0 0 12px ${cellOwner === 0 ? '#22d3ee' : '#fb7185'}aa`,
                      width: '38px',
                      height: '38px'
                    }}
                  >
                    <span className={styles.marbleLabel} style={{ fontSize: '8px' }}>
                      {cellOwner === 0 ? 'P1' : 'P2'}
                    </span>
                  </div>
                )}
                <span className={styles.cellCoords} style={{ fontSize: '7px' }}>
                  {c-1},{r-1}
                </span>
              </div>
            );
          }
        }
      }
    }

    return (
      <div className={styles.boardShell}>
        <div className={styles.statusBar}>
          <span className={styles.statusText}>{lastEvent}</span>
        </div>
        <div className={styles.gameArea}>
          <div className={styles.boardWrapper}>
            <div className={styles.gridRelative}>
              <div className={styles.gridContainer8x8}>
                {cells8x8}
              </div>
            </div>
          </div>
          <div className={styles.consoleContainer}>
            <div className={styles.goalInfoBox}>
              <h3 className={styles.goalTitle}>Goal</h3>
              <p className={styles.goalDesc}>
                Push your perimeter marbles inward onto the 6x6 grid. They slide in a straight line until they hit another marble or the wall. Get the longest contiguous line (horizontal, vertical, or diagonal) of your color to win!
              </p>
            </div>
            <div className={styles.turnTray}>
              {isMyTurn ? (
                <div className={styles.activeTurnAlert}>
                  🎯 Click one of your perimeter marbles to slide it inward!
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

  // B. ROLL-A-BALL: arcade lane rolling
  if (variant === 'roll_a_ball') {
    return (
      <div className={styles.boardShell}>
        <div className={styles.statusBar}>
          <span className={styles.statusText}>{lastEvent}</span>
        </div>
        <div className={styles.gameArea}>
          <div className={styles.boardWrapper}>
            <div className={styles.visualContainer}>
              <svg viewBox="0 0 320 320" className={styles.laneSvg}>
                <rect width="320" height="320" rx="15" fill="#0b0f19" stroke="#1e293b" strokeWidth="2" />
                <path d="M 60 320 L 120 40 L 200 40 L 260 320 Z" fill="#131926" opacity="0.5" />
                
                {/* 10 pts Holes */}
                <circle cx="80" cy="220" r="20" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
                <text x="80" y="224" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">10</text>
                
                <circle cx="240" cy="220" r="20" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
                <text x="240" y="224" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">10</text>

                {/* 40 pts Hole */}
                <circle cx="160" cy="180" r="22" fill="#090d16" stroke="#a78bfa" strokeWidth="2" />
                <text x="160" y="184" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="bold">40</text>

                {/* 50 pts Hole */}
                <circle cx="160" cy="120" r="22" fill="#090d16" stroke="#f43f5e" strokeWidth="2" />
                <text x="160" y="124" textAnchor="middle" fill="#f43f5e" fontSize="12" fontWeight="bold">50</text>

                {/* 60 pts Hole */}
                <circle cx="160" cy="65" r="24" fill="#090d16" stroke="#fb923c" strokeWidth="2" />
                <text x="160" y="69" textAnchor="middle" fill="#fb923c" fontSize="13" fontWeight="bold">60</text>

                {/* 100 pts Hole */}
                <circle cx="160" cy="245" r="16" fill="#090d16" stroke="#eab308" strokeWidth="2" />
                <text x="160" y="249" textAnchor="middle" fill="#eab308" fontSize="10" fontWeight="bold">100</text>
              </svg>
            </div>
          </div>

          <div className={styles.consoleContainer}>
            <div className={styles.scoreRow}>
              <div className={styles.scoreBlock} style={{ borderColor: myColor }}>
                <span className={styles.scoreTitle}>You</span>
                <span className={styles.scoreValue}>{myScore} pts</span>
                <span className={styles.launchesLabel}>{myTurns} rolls left</span>
              </div>
              <div className={styles.scoreBlock} style={{ borderColor: oppColor }}>
                <span className={styles.scoreTitle}>
                  {allPlayerNames[oppIdx] || opponentName || 'Opponent'}
                </span>
                <span className={styles.scoreValue}>{oppScore} pts</span>
                <span className={styles.launchesLabel}>{oppTurns} rolls left</span>
              </div>
            </div>

            {/* Sliders */}
            <div className={styles.plungerBox}>
              <h4 className={styles.plungerTitle}>Tilt Angle Control</h4>
              <div className={styles.sliderContainer}>
                <span className={styles.sliderMinMax}>0°</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={tilt}
                  onChange={(e) => setTilt(Number(e.target.value))}
                  disabled={!isMyTurn || gameOver || myTurns === 0}
                  className={styles.plungerRange}
                  style={{
                    background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${(tilt / 3.6)}%, rgba(255,255,255,0.08) ${(tilt / 3.6)}%, rgba(255,255,255,0.08) 100%)`
                  }}
                />
                <span className={styles.sliderMinMax}>360°</span>
              </div>
              <div className={styles.tensionDisplay}>
                <span className={styles.tensionVal}>{tilt}°</span>
                <span className={styles.tensionDesc}>Tilt Angle</span>
              </div>

              <h4 className={styles.plungerTitle} style={{ marginTop: '16px' }}>Roll Force</h4>
              <div className={styles.sliderContainer}>
                <span className={styles.sliderMinMax}>1%</span>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={force}
                  onChange={(e) => setForce(Number(e.target.value))}
                  disabled={!isMyTurn || gameOver || myTurns === 0}
                  className={styles.plungerRange}
                  style={{
                    background: `linear-gradient(to right, #f43f5e 0%, #f43f5e ${force}%, rgba(255,255,255,0.08) ${force}%, rgba(255,255,255,0.08) 100%)`
                  }}
                />
                <span className={styles.sliderMinMax}>100%</span>
              </div>
              <div className={styles.tensionDisplay}>
                <span className={styles.tensionVal}>{force}%</span>
                <span className={styles.tensionDesc}>Roll Force</span>
              </div>

              {isMyTurn && !gameOver && myTurns > 0 ? (
                <button onClick={handleRollBall} className={styles.launchBtn} style={{ marginTop: '20px' }}>
                  🎳 ROLL BALL
                </button>
              ) : (
                <button disabled className={styles.launchBtnDisabled} style={{ marginTop: '20px' }}>
                  ROLL BALL
                </button>
              )}
            </div>

            <div className={styles.guideContainer}>
              <h4 className={styles.guideTitle}>Aimer Guide</h4>
              <p className={styles.guideText}>
                Aim for high value holes! Center hole (100) requires a force sweet-spot of 66-69%. 
                Back hole (60) targets 56-65%. Deep hole (50) targets 46-55%.
                Tilt angle affects trajectory stability (160-200° grants a stability bonus!).
              </p>
            </div>

            <div className={styles.turnTray}>
              {isMyTurn && !gameOver && myTurns > 0 ? (
                <div className={styles.activeTurnAlert}>
                  🎯 Your turn! Adjust tilt & force and roll!
                </div>
              ) : !isMyTurn && !gameOver ? (
                <div className={styles.waitingAlert}>
                  Waiting for {allPlayerNames[oppIdx] || opponentName || 'Opponent'}...
                </div>
              ) : (
                <div className={styles.finishedAlert}>
                  Game Completed!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // C. TWIZZLE: central cone rotating launches at gates
  if (variant === 'twizzle') {
    return (
      <div className={styles.boardShell}>
        <div className={styles.statusBar}>
          <span className={styles.statusText}>{lastEvent}</span>
        </div>
        <div className={styles.gameArea}>
          <div className={styles.boardWrapper}>
            <div className={styles.visualContainer}>
              <svg viewBox="0 0 320 320" className={styles.laneSvg}>
                <rect width="320" height="320" rx="15" fill="#0b0f19" stroke="#1e293b" strokeWidth="2" />
                
                {/* 8 circular gates */}
                {Array.from({ length: 8 }).map((_, idx) => {
                  const rad = ((idx * 45 + 22.5) * Math.PI) / 180;
                  const cx = 160 + 100 * Math.cos(rad);
                  const cy = 160 + 100 * Math.sin(rad);
                  const val = gateValues[idx] || 0;
                  const owner = gates[idx];

                  const gateColor = owner === 0 ? '#22d3ee' : owner === 1 ? '#fb7185' : '#1e293b';
                  const strokeColor = owner !== null ? '#ffffff' : '#475569';

                  return (
                    <g key={`gate-g-${idx}`}>
                      <circle cx={cx} cy={cy} r="20" fill={gateColor} stroke={strokeColor} strokeWidth="1.5" />
                      <text x={cx} y={cy + 4} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800">
                        {val}
                      </text>
                      <text x={cx} y={cy + 25} textAnchor="middle" fill="#64748b" fontSize="7">
                        G{idx + 1}
                      </text>
                    </g>
                  );
                })}

                {/* Central Cone circle */}
                <circle cx="160" cy="160" r="30" fill="#1e293b" stroke="#8b5cf6" strokeWidth="2" />
                
                {/* Rotating direction line pointer inside cone */}
                <line
                  x1="160"
                  y1="160"
                  x2={160 + 26 * Math.cos((coneAngle * Math.PI) / 180)}
                  y2={160 + 26 * Math.sin((coneAngle * Math.PI) / 180)}
                  stroke="#fbbf24"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                
                {/* Visual arrow indicator */}
                <circle
                  cx={160 + 26 * Math.cos((coneAngle * Math.PI) / 180)}
                  cy={160 + 26 * Math.sin((coneAngle * Math.PI) / 180)}
                  r="4"
                  fill="#fbbf24"
                />
                <circle cx="160" cy="160" r="4" fill="#fbbf24" />
              </svg>
            </div>
          </div>

          <div className={styles.consoleContainer}>
            <div className={styles.scoreRow}>
              <div className={styles.scoreBlock} style={{ borderColor: myColor }}>
                <span className={styles.scoreTitle}>You</span>
                <span className={styles.scoreValue}>{myScore} pts</span>
                <span className={styles.launchesLabel}>{myTurns} marbles left</span>
              </div>
              <div className={styles.scoreBlock} style={{ borderColor: oppColor }}>
                <span className={styles.scoreTitle}>
                  {allPlayerNames[oppIdx] || opponentName || 'Opponent'}
                </span>
                <span className={styles.scoreValue}>{oppScore} pts</span>
                <span className={styles.launchesLabel}>{oppTurns} marbles left</span>
              </div>
            </div>

            {/* Slider */}
            <div className={styles.plungerBox}>
              <h4 className={styles.plungerTitle}>Cone Launch Angle</h4>
              <div className={styles.sliderContainer}>
                <span className={styles.sliderMinMax}>0°</span>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={coneAngle}
                  onChange={(e) => setConeAngle(Number(e.target.value))}
                  disabled={!isMyTurn || gameOver || myTurns === 0}
                  className={styles.plungerRange}
                  style={{
                    background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(coneAngle / 3.6)}%, rgba(255,255,255,0.08) ${(coneAngle / 3.6)}%, rgba(255,255,255,0.08) 100%)`
                  }}
                />
                <span className={styles.sliderMinMax}>359°</span>
              </div>
              <div className={styles.tensionDisplay}>
                <span className={styles.tensionVal}>{coneAngle}°</span>
                <span className={styles.tensionDesc}>Selected Direction</span>
              </div>

              {isMyTurn && !gameOver && myTurns > 0 ? (
                <button onClick={handleLaunchTwizzle} className={styles.launchBtn} style={{ marginTop: '20px' }}>
                  🌀 LAUNCH MARBLE
                </button>
              ) : (
                <button disabled className={styles.launchBtnDisabled} style={{ marginTop: '20px' }}>
                  LAUNCH MARBLE
                </button>
              )}
            </div>

            <div className={styles.guideContainer}>
              <h4 className={styles.guideTitle}>Aimer Guide</h4>
              <p className={styles.guideText}>
                Rotate the central cone to target scoring gates around the boundary. 
                Each gate covers a 45° sector. Claims gates for yourself to gain points.
                If you hit an opponent's claimed gate, it resets to unclaimed and deducts points from them!
              </p>
            </div>

            <div className={styles.turnTray}>
              {isMyTurn && !gameOver && myTurns > 0 ? (
                <div className={styles.activeTurnAlert}>
                  🎯 Your turn! Set cone angle and launch!
                </div>
              ) : !isMyTurn && !gameOver ? (
                <div className={styles.waitingAlert}>
                  Waiting for {allPlayerNames[oppIdx] || opponentName || 'Opponent'}...
                </div>
              ) : (
                <div className={styles.finishedAlert}>
                  Game Completed!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- EXISTING 4x4 VARIANTS RENDER (Classic, Stay Alive, Shift Puzzle) ---
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
    : (variant === 'shift_puzzle' || variant === 'shift-puzzle'
      ? 'shift_puzzle'
      : (variant === 'marble_slide' || variant === 'marble-slide'
        ? 'marble_slide'
        : (variant === 'roll_a_ball' || variant === 'roll-a-ball'
          ? 'roll_a_ball'
          : (variant === 'twizzle' || variant === 'twizzle-game'
            ? 'twizzle'
            : 'classic'))));

  const gameName = serverVariant === 'stay_alive'
    ? 'Stay Alive!'
    : (serverVariant === 'shift_puzzle'
      ? 'Shift Puzzle'
      : (serverVariant === 'marble_slide'
        ? 'Marble Slide'
        : (serverVariant === 'roll_a_ball'
          ? 'Roll-A-Ball'
          : (serverVariant === 'twizzle'
            ? 'Twizzle Game'
            : 'Vortex'))));

  const gameIcon = serverVariant === 'stay_alive'
    ? 'vortex-stay-alive'
    : (serverVariant === 'shift_puzzle'
      ? 'vortex-shift-puzzle'
      : (serverVariant === 'marble_slide'
        ? 'vortex-marble-slide'
        : (serverVariant === 'roll_a_ball'
          ? 'vortex-roll-a-ball'
          : (serverVariant === 'twizzle'
            ? 'vortex-twizzle'
            : 'vortex-classic'))));

  return (
    <GameTemplate
      gameType="vortex"
      variant={serverVariant}
      gameName={gameName}
      gameIcon={gameIcon}
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
