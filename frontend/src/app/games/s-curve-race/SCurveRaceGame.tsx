// frontend/src/app/games/s-curve-race/SCurveRaceGame.tsx
'use client';

import React from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

// 21 node coordinates for Player 1 (Left track)
const P1_COORDS = [
  { x: 100, y: 80 },   // 0 (START)
  { x: 180, y: 80 },   // 1
  { x: 260, y: 80 },   // 2
  { x: 340, y: 80 },   // 3
  { x: 340, y: 160 },  // 4
  { x: 260, y: 160 },  // 5 (Shortcut)
  { x: 180, y: 160 },  // 6
  { x: 100, y: 160 },  // 7
  { x: 100, y: 240 },  // 8 (Hazard)
  { x: 180, y: 240 },  // 9
  { x: 260, y: 240 },  // 10
  { x: 340, y: 240 },  // 11
  { x: 340, y: 320 },  // 12 (Shortcut)
  { x: 260, y: 320 },  // 13
  { x: 180, y: 320 },  // 14
  { x: 100, y: 320 },  // 15 (Hazard)
  { x: 100, y: 400 },  // 16
  { x: 180, y: 400 },  // 17
  { x: 260, y: 400 },  // 18
  { x: 340, y: 400 },  // 19
  { x: 400, y: 400 },  // 20 (END)
];

// Symmetrical track for Player 2 (Right track, mirrored coordinates)
const P2_COORDS = P1_COORDS.map((coord, idx) => {
  if (idx === 20) return coord; // Meet at shared END space (400, 400)
  return { x: 800 - coord.x, y: coord.y };
});

function getPlayerCoords(playerIdx: number, pos: number, otherPos: number) {
  const coords = playerIdx === 0 ? P1_COORDS : P2_COORDS;
  const c = coords[pos] || coords[0];

  if (pos === otherPos) {
    // Shift slightly to prevent overlap if they land on the same spot (such as START or END)
    return playerIdx === 0
      ? { x: c.x - 10, y: c.y - 10 }
      : { x: c.x + 10, y: c.y + 10 };
  }
  return c;
}

function SCurveRaceBoard({
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

  const positions: number[] = gameState.positions || [0, 0];
  const rolledValue: number | null = gameState.rolled_value ?? null;
  const currentTurnPlayer: number = gameState.current_player ?? 0;
  const lastEvent: string = gameState.last_event || 'Game started! Roll the die to begin.';

  const playerIdx = playerNumber;
  const oppIdx = 1 - playerIdx;

  const isP1 = playerIdx === 0;
  const myColor = isP1 ? '#22d3ee' : '#fb7185';
  const oppColor = isP1 ? '#fb7185' : '#22d3ee';

  const myPos = positions[playerIdx] ?? 0;
  const oppPos = positions[oppIdx] ?? 0;

  // Actual SVG coordinates for rendering tokens
  const myTokenCoord = getPlayerCoords(playerIdx, myPos, oppPos);
  const oppTokenCoord = getPlayerCoords(oppIdx, oppPos, myPos);

  const handleRollClick = () => {
    if (!isMyTurn || gameOver) return;
    sendAction({ action: 'RollDice' });
  };

  // Build SVG path commands
  const p1PathD = P1_COORDS.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const p2PathD = P2_COORDS.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  const isShortcut = (idx: number) => idx === 5 || idx === 12;
  const isHazard = (idx: number) => idx === 8 || idx === 15;

  return (
    <div className={styles.boardShell}>
      {/* Event Banner */}
      <div className={styles.statusBar}>
        <span className={styles.statusText}>{lastEvent}</span>
      </div>

      {/* Main Board Grid */}
      <div className={styles.gameArea}>
        {/* SVG Path Canvas */}
        <div className={styles.canvasWrapper}>
          <svg viewBox="0 0 800 480" className={styles.boardSvg}>
            {/* Grids and subtle board designs */}
            <defs>
              <radialGradient id="endGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#eab308" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
              </radialGradient>
              <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
              </filter>
            </defs>

            {/* Glowing END zone background */}
            <circle cx="400" cy="400" r="50" fill="url(#endGlow)" />

            {/* Path lines */}
            <path
              d={p1PathD}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.35"
              strokeDasharray="6 6"
              className={styles.pathLine}
            />
            <path
              d={p2PathD}
              fill="none"
              stroke="#fb7185"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.35"
              strokeDasharray="6 6"
              className={styles.pathLine}
            />

            {/* Connecting lines for shortcuts/hazards (Green/Red dashed paths) */}
            {/* P1 Shortcut 5 -> 8 */}
            <line x1={P1_COORDS[5].x} y1={P1_COORDS[5].y} x2={P1_COORDS[8].x} y2={P1_COORDS[8].y} stroke="#10b981" strokeWidth="3" strokeDasharray="4 4" opacity="0.6" />
            {/* P1 Shortcut 12 -> 15 */}
            <line x1={P1_COORDS[12].x} y1={P1_COORDS[12].y} x2={P1_COORDS[15].x} y2={P1_COORDS[15].y} stroke="#10b981" strokeWidth="3" strokeDasharray="4 4" opacity="0.6" />
            {/* P2 Shortcut 5 -> 8 */}
            <line x1={P2_COORDS[5].x} y1={P2_COORDS[5].y} x2={P2_COORDS[8].x} y2={P2_COORDS[8].y} stroke="#10b981" strokeWidth="3" strokeDasharray="4 4" opacity="0.6" />
            {/* P2 Shortcut 12 -> 15 */}
            <line x1={P2_COORDS[12].x} y1={P2_COORDS[12].y} x2={P2_COORDS[15].x} y2={P2_COORDS[15].y} stroke="#10b981" strokeWidth="3" strokeDasharray="4 4" opacity="0.6" />

            {/* P1 Path Nodes */}
            {P1_COORDS.map((coord, idx) => {
              if (idx === 20) return null; // Shared end handled below
              const isStart = idx === 0;
              const isGreen = isShortcut(idx);
              const isRed = isHazard(idx);

              let nodeClass = styles.nodeNormal;
              let fillVal = '#1e293b';
              let strokeVal = 'rgba(255,255,255,0.2)';
              let label = `${idx}`;

              if (isStart) {
                fillVal = '#3b82f6';
                strokeVal = '#60a5fa';
                label = 'START';
              } else if (isGreen) {
                fillVal = '#064e3b';
                strokeVal = '#34d399';
                label = `+3`;
              } else if (isRed) {
                fillVal = '#7f1d1d';
                strokeVal = '#f87171';
                label = `-3`;
              }

              return (
                <g key={`p1-node-${idx}`} className={styles.nodeGroup}>
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isStart ? 22 : 16}
                    fill={fillVal}
                    stroke={strokeVal}
                    strokeWidth="2"
                    filter="url(#shadow)"
                  />
                  <text
                    x={coord.x}
                    y={coord.y + 4}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize={isStart ? '10px' : '11px'}
                    fontWeight="700"
                    className={styles.nodeText}
                  >
                    {label}
                  </text>
                  {/* Decorative player indicator dot if player is here */}
                  {myPos === idx && isP1 && <circle cx={coord.x} cy={coord.y - 12} r="4" fill={myColor} />}
                  {oppPos === idx && !isP1 && <circle cx={coord.x} cy={coord.y - 12} r="4" fill={oppColor} />}
                </g>
              );
            })}

            {/* P2 Path Nodes */}
            {P2_COORDS.map((coord, idx) => {
              if (idx === 20) return null; // Shared end handled below
              const isStart = idx === 0;
              const isGreen = isShortcut(idx);
              const isRed = isHazard(idx);

              let fillVal = '#1e293b';
              let strokeVal = 'rgba(255,255,255,0.2)';
              let label = `${idx}`;

              if (isStart) {
                fillVal = '#3b82f6';
                strokeVal = '#60a5fa';
                label = 'START';
              } else if (isGreen) {
                fillVal = '#064e3b';
                strokeVal = '#34d399';
                label = `+3`;
              } else if (isRed) {
                fillVal = '#7f1d1d';
                strokeVal = '#f87171';
                label = `-3`;
              }

              return (
                <g key={`p2-node-${idx}`} className={styles.nodeGroup}>
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isStart ? 22 : 16}
                    fill={fillVal}
                    stroke={strokeVal}
                    strokeWidth="2"
                    filter="url(#shadow)"
                  />
                  <text
                    x={coord.x}
                    y={coord.y + 4}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize={isStart ? '10px' : '11px'}
                    fontWeight="700"
                    className={styles.nodeText}
                  >
                    {label}
                  </text>
                  {/* Decorative player indicator dot if player is here */}
                  {myPos === idx && !isP1 && <circle cx={coord.x} cy={coord.y - 12} r="4" fill={myColor} />}
                  {oppPos === idx && isP1 && <circle cx={coord.x} cy={coord.y - 12} r="4" fill={oppColor} />}
                </g>
              );
            })}

            {/* Shared END space (Node 20) */}
            <g className={styles.endNodeGroup}>
              <circle
                cx="400"
                cy="400"
                r="28"
                fill="#854d0e"
                stroke="#facc15"
                strokeWidth="3.5"
                filter="url(#shadow)"
              />
              <path
                d="M390,392 L410,392 L414,408 L386,408 Z"
                fill="#facc15"
                transform="translate(0, -4)"
              />
              <circle cx="400" cy="385" r="4" fill="#facc15" />
              <circle cx="390" cy="388" r="3.5" fill="#facc15" />
              <circle cx="410" cy="388" r="3.5" fill="#facc15" />
              <text
                x="400"
                y="416"
                textAnchor="middle"
                fill="#fef08a"
                fontSize="10px"
                fontWeight="900"
                letterSpacing="0.05em"
              >
                END
              </text>
            </g>

            {/* Render Player 1 Token */}
            <g
              transform={`translate(${isP1 ? myTokenCoord.x : oppTokenCoord.x}, ${isP1 ? myTokenCoord.y : oppTokenCoord.y})`}
              className={styles.tokenAnim}
            >
              <circle r="14" fill={isP1 ? myColor : oppColor} stroke="#fff" strokeWidth="2" filter="url(#shadow)" />
              <circle r="8" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
              <text x="0" y="4" textAnchor="middle" fill="#0f172a" fontSize="11px" fontWeight="900">
                P1
              </text>
            </g>

            {/* Render Player 2 Token */}
            <g
              transform={`translate(${isP1 ? oppTokenCoord.x : myTokenCoord.x}, ${isP1 ? oppTokenCoord.y : myTokenCoord.y})`}
              className={styles.tokenAnim}
            >
              <circle r="14" fill={isP1 ? oppColor : myColor} stroke="#fff" strokeWidth="2" filter="url(#shadow)" />
              <circle r="8" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
              <text x="0" y="4" textAnchor="middle" fill="#0f172a" fontSize="11px" fontWeight="900">
                P2
              </text>
            </g>
          </svg>
        </div>

        {/* Console / Dice Controls Panel */}
        <div className={styles.consoleContainer}>
          <div className={styles.playerInfoRow}>
            <div className={styles.playerBadge} style={{ borderColor: myColor }}>
              <span className={styles.badgeLabel} style={{ backgroundColor: myColor }}>You</span>
              <span className={styles.badgePos}>Space {myPos}</span>
            </div>
            <div className={styles.playerBadge} style={{ borderColor: oppColor }}>
              <span className={styles.badgeLabel} style={{ backgroundColor: oppColor }}>
                {allPlayerNames[oppIdx] || opponentName || 'Opponent'}
              </span>
              <span className={styles.badgePos}>Space {oppPos}</span>
            </div>
          </div>

          <div className={styles.diceTray}>
            <div className={styles.dieBox}>
              {rolledValue !== null ? (
                <div className={styles.dieFace}>{rolledValue}</div>
              ) : (
                <div className={styles.diePlaceholder}>🎲</div>
              )}
            </div>
          </div>

          <div className={styles.actionsBox}>
            {isMyTurn && !gameOver && (
              <button onClick={handleRollClick} className={styles.rollBtn}>
                ROLL DICE
              </button>
            )}

            {!isMyTurn && !gameOver && (
              <div className={styles.waitingText}>
                Waiting for {allPlayerNames[oppIdx] || opponentName || 'Opponent'} to roll...
              </div>
            )}

            {gameOver && (
              <div className={styles.gameOverBanner}>
                Race Completed!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SCurveRaceGamePage() {
  return (
    <GameTemplate
      gameType="s_curve_race"
      gameName="The S-Curve Race"
      gameIcon="s-curve-race"
      accentColor="#10b981"
      winEmoji="🏁"
      winTitle="Winner of the Race!"
      loseTitle="Runner Up"
      drawTitle="Tie Match"
    >
      {(props) => <SCurveRaceBoard {...props} />}
    </GameTemplate>
  );
}
