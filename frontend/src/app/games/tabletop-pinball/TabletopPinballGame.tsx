/* frontend/src/app/games/tabletop-pinball/TabletopPinballGame.tsx */
'use client';

import React, { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

// Shelf multiplier groups for Tumblin' Dice
const SHELVES = [
  { label: 'Shelf x4 (Tension 80-92)', slots: [9, 10, 11], multiplier: 4, color: '#f43f5e' },
  { label: 'Shelf x3 (Tension 59-79)', slots: [6, 7, 8], multiplier: 3, color: '#fb923c' },
  { label: 'Shelf x2 (Tension 33-58)', slots: [3, 4, 5], multiplier: 2, color: '#fbbf24' },
  { label: 'Shelf x1 (Tension 10-32)', slots: [0, 1, 2], multiplier: 1, color: '#34d399' },
];

// Pentagon angles for Tzaar Cup Slam nodes
const PENTAGON_ANGLES = [-90, -18, 54, 126, 198];

function TabletopPinballBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [tension, setTension] = useState(50);
  const [spinningAngle, setSpinningAngle] = useState(0);

  // Animate the Knife Hit wheel visually on client side
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameState && gameState.variant === 'watermelon_knife' && !gameOver) {
      interval = setInterval(() => {
        setSpinningAngle((prev) => (prev + 2) % 360);
      }, 30);
    }
    return () => clearInterval(interval);
  }, [gameState, gameOver]);

  if (!gameState) return null;

  const variant = gameState.variant || 'classic';
  const scores: number[] = gameState.scores || [0, 0];
  const turnsRemaining: number[] = gameState.turns_remaining || [4, 4];
  const board: (number | null)[] = gameState.board || [];
  const diceFaces: number[] = gameState.dice_faces || [];
  const wheelAngle: number = gameState.wheel_angle || 0; // backend watermelon active segment
  const lastEvent: string = gameState.last_event || 'Game started!';
  
  const positions: number[] = gameState.positions || [0, 2]; // Tzaar Cup node positions
  const roundWins: number[] = gameState.round_wins || [0, 0];  // Tzaar Cup round wins

  const playerIdx = playerNumber;
  const oppIdx = 1 - playerIdx;

  const isP1 = playerIdx === 0;
  const myColor = isP1 ? '#22d3ee' : '#fb7185';
  const oppColor = isP1 ? '#fb7185' : '#22d3ee';

  // For Nokkenhole and Tzaar Cup, we track round wins or target score
  const isNokkenhole = variant === 'nokkenhole';
  const isTzaarCup = variant === 'tzaar_cup';

  const myScore = isTzaarCup ? roundWins[playerIdx] : scores[playerIdx] ?? 0;
  const oppScore = isTzaarCup ? roundWins[oppIdx] : scores[oppIdx] ?? 0;
  
  const myTurns = turnsRemaining[playerIdx] ?? 0;
  const oppTurns = turnsRemaining[oppIdx] ?? 0;

  const handleLaunch = () => {
    if (!isMyTurn || gameOver) return;
    if (variant === 'classic') {
      sendAction({
        action: 'LaunchBall',
        tension,
      });
    } else if (variant === 'tumblin_dice') {
      sendAction({
        action: 'RollDice',
        tension,
      });
    } else if (variant === 'nokkenhole') {
      sendAction({
        action: 'RollNokken',
        force: tension,
      });
    }
  };

  const handleThrowKnife = (segmentIdx: number) => {
    if (!isMyTurn || gameOver || myTurns === 0) return;
    sendAction({
      action: 'ThrowKnife',
      target_segment: segmentIdx,
    });
  };

  const handleNodeClick = (nodeId: number) => {
    if (!isMyTurn || gameOver) return;
    
    // Check adjacency
    const myCurrentNode = positions[playerIdx];
    const isAdjacent = myCurrentNode === 5 ? nodeId <= 4 : nodeId === 5;
    
    if (!isAdjacent) return;

    sendAction({
      action: 'MoveCup',
      target_node: nodeId,
    });
  };

  // Determine if plunger launch is enabled
  const canLaunch = isMyTurn && !gameOver && (isNokkenhole || myTurns > 0);

  return (
    <div className={styles.boardShell}>
      {/* Event banner */}
      <div className={styles.statusBar}>
        <span className={styles.statusText}>{lastEvent}</span>
      </div>

      {/* Main Splits */}
      <div className={styles.gameArea}>

        {/* Dynamic target display depending on the variant */}
        <div className={styles.visualContainer}>
          
          {/* 1. Classic Pinball concentric target zones */}
          {variant === 'classic' && (
            <div className={styles.pinballTargetZone}>
              <svg viewBox="0 0 320 320" className={styles.pinballSvg}>
                <defs>
                  <radialGradient id="dingerGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#facc15" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <circle cx="160" cy="160" r="150" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
                <circle cx="160" cy="160" r="120" fill="none" stroke="#22d3ee" strokeWidth="16" opacity="0.15" />
                <circle cx="160" cy="160" r="120" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="5 5" opacity="0.4" />
                <text x="160" y="55" className={styles.ringLabel} fill="#22d3ee">OUTER RING (50 pts)</text>

                <circle cx="160" cy="160" r="85" fill="none" stroke="#a78bfa" strokeWidth="16" opacity="0.2" />
                <circle cx="160" cy="160" r="85" fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="5 5" opacity="0.5" />
                <text x="160" y="90" className={styles.ringLabel} fill="#a78bfa">MIDDLE RING (100 pts)</text>

                <circle cx="160" cy="160" r="50" fill="none" stroke="#f43f5e" strokeWidth="16" opacity="0.25" />
                <circle cx="160" cy="160" r="50" fill="none" stroke="#f43f5e" strokeWidth="1" strokeDasharray="5 5" opacity="0.6" />
                <text x="160" y="125" className={styles.ringLabel} fill="#f43f5e">INNER RING (200 pts)</text>

                <circle cx="160" cy="160" r="18" fill="url(#dingerGlow)" />
                <circle cx="160" cy="160" r="15" fill="#eab308" stroke="#fff" strokeWidth="2" className={styles.dingerPulse} />
                <text x="160" y="164" className={styles.dingerText} fill="#0f172a">🔔</text>
                <text x="160" y="195" className={styles.dingerLabel} fill="#eab308">DINGER (300)</text>
              </svg>
            </div>
          )}

          {/* 2. Tumblin' Dice tiered shelves */}
          {variant === 'tumblin_dice' && (
            <div className={styles.diceBoard}>
              <h3 className={styles.boardTitle}>Tiered Ramp Shelves</h3>
              <div className={styles.shelvesWrapper}>
                {SHELVES.map((shelf) => (
                  <div
                    key={`shelf-${shelf.multiplier}`}
                    className={styles.shelfRow}
                    style={{ borderLeftColor: shelf.color }}
                  >
                    <div className={styles.shelfLabelCol} style={{ color: shelf.color }}>
                      <span className={styles.multiplierBadge}>{shelf.multiplier}x</span>
                      <span className={styles.shelfDesc}>Multiplier</span>
                    </div>

                    <div className={styles.shelfSlots}>
                      {shelf.slots.map((slotIdx) => {
                        const owner = board[slotIdx];
                        const face = diceFaces[slotIdx];

                        return (
                          <div
                            key={`slot-${slotIdx}`}
                            className={`
                              ${styles.diceSlot}
                              ${owner !== null ? styles.slotOccupied : ''}
                            `}
                          >
                            {owner !== null ? (
                              <div
                                className={styles.die}
                                style={{
                                  backgroundColor: owner === 0 ? '#22d3ee' : '#fb7185',
                                  boxShadow: `0 0 10px ${owner === 0 ? '#22d3ee' : '#fb7185'}aa`,
                                }}
                              >
                                <span className={styles.dieFace}>{face}</span>
                                <span className={styles.dieOwner}>{owner === 0 ? 'P1' : 'P2'}</span>
                              </div>
                            ) : (
                              <span className={styles.slotEmpty}>Empty</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Watermelon Knife Hit spinning wheel */}
          {variant === 'watermelon_knife' && (
            <div className={styles.knifeWheelContainer}>
              <h3 className={styles.boardTitle}>Watermelon Spinning Target</h3>
              
              <div className={styles.wheelWrapper}>
                <div
                  className={styles.spinningWheel}
                  style={{ transform: `rotate(${spinningAngle}deg)` }}
                >
                  <div className={styles.watermelonSkin} />
                  
                  {Array.from({ length: 8 }).map((_, idx) => {
                    const angle = idx * 45;
                    const owner = board[idx];

                    return (
                      <div
                        key={`slice-${idx}`}
                        className={styles.wheelSlice}
                        style={{ transform: `rotate(${angle}deg)` }}
                      >
                        <div className={styles.sliceDivider} />
                        
                        {owner !== null && (
                          <div className={styles.stuckKnifeGroup}>
                            <div
                              className={styles.knifeBlade}
                              style={{ backgroundColor: owner === 0 ? '#22d3ee' : '#fb7185' }}
                            />
                            <div className={styles.knifeHandle} />
                            <span className={styles.stuckLabel}>
                              {owner === 0 ? 'P1' : 'P2'}
                            </span>
                          </div>
                        )}
                        <span className={styles.sliceIndex} style={{ transform: `rotate(-${angle}deg)` }}>
                          {idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div
                  className={styles.backendAngleIndicator}
                  style={{ transform: `rotate(${wheelAngle * 45}deg)` }}
                >
                  <div className={styles.indicatorDot} />
                </div>
              </div>

              <div className={styles.sliceButtonsBox}>
                <span className={styles.throwHint}>Select segment to throw knife:</span>
                <div className={styles.sliceGridButtons}>
                  {Array.from({ length: 8 }).map((_, idx) => {
                    const owner = board[idx];
                    const isActive = wheelAngle === idx;

                    return (
                      <button
                        key={`btn-segment-${idx}`}
                        onClick={() => handleThrowKnife(idx)}
                        disabled={!isMyTurn || gameOver || myTurns === 0}
                        className={`
                          ${styles.segmentBtn}
                          ${isActive ? styles.segmentBtnActive : ''}
                          ${owner !== null ? styles.segmentBtnOccupied : ''}
                        `}
                      >
                        Seg {idx + 1}
                        {owner !== null && (
                          <span className={styles.occupantTag}>
                            {owner === 0 ? 'P1' : 'P2'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* 4. Nokkenhole: Vertical board zones */}
          {isNokkenhole && (
            <div className={styles.pinballTargetZone}>
              <svg viewBox="0 0 320 320" className={styles.pinballSvg}>
                <rect width="320" height="320" rx="15" fill="#0b0f19" stroke="#1e293b" strokeWidth="2" />
                
                {/* Band 1: Zone 3 (outer, 76-90) */}
                <rect x="20" y="30" width="280" height="50" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" opacity="0.3" rx="6" />
                <text x="160" y="60" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">Zone 3 (1 pt)</text>
                <text x="160" y="72" textAnchor="middle" fill="#475569" fontSize="8">Target Force: 76-90%</text>

                {/* Band 2: THE HOLE (60-75) */}
                <rect x="20" y="95" width="280" height="75" fill="#1e293b" stroke="#eab308" strokeWidth="1.5" opacity="0.4" rx="6" />
                <circle cx="160" cy="132" r="20" fill="#090d16" stroke="#eab308" strokeWidth="3" />
                <text x="160" y="136" textAnchor="middle" fill="#eab308" fontSize="10" fontWeight="bold">HOLE (3)</text>
                <text x="55" y="135" fill="#eab308" fontSize="9" opacity="0.8" fontWeight="bold">3 pts sweet spot</text>
                <text x="260" y="135" fill="#475569" fontSize="8">60-75%</text>

                {/* Band 3: Zone 2 (mid, 40-59) */}
                <rect x="20" y="185" width="280" height="55" fill="#1e293b" stroke="#a78bfa" strokeWidth="1.5" opacity="0.3" rx="6" />
                <text x="160" y="215" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="bold">Zone 2 (2 pts)</text>
                <text x="160" y="228" textAnchor="middle" fill="#475569" fontSize="8">Target Force: 40-59%</text>

                {/* Band 4: Zone 1 (outer, 20-39) */}
                <rect x="20" y="255" width="280" height="45" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" opacity="0.3" rx="6" />
                <text x="160" y="280" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">Zone 1 (1 pt)</text>
                <text x="160" y="291" textAnchor="middle" fill="#475569" fontSize="8">Target Force: 20-39%</text>
              </svg>
            </div>
          )}

          {/* 5. Tzaar Cup Slam: 6-node network */}
          {isTzaarCup && (
            <div className={styles.pinballTargetZone}>
              <svg viewBox="0 0 320 320" className={styles.pinballSvg}>
                <rect width="320" height="320" rx="15" fill="#0b0f19" stroke="#1e293b" strokeWidth="2" />
                
                {/* Adjacency lines from center (5) to outer nodes (0-4) */}
                {PENTAGON_ANGLES.map((angle, idx) => {
                  const rad = (angle * Math.PI) / 180;
                  const tx = 160 + 100 * Math.cos(rad);
                  const ty = 160 + 100 * Math.sin(rad);

                  return (
                    <line
                      key={`line-${idx}`}
                      x1="160"
                      y1="160"
                      x2={tx}
                      y2={ty}
                      stroke="#475569"
                      strokeWidth="3"
                      strokeDasharray={positions.includes(idx) || positions.includes(5) ? 'none' : '4 4'}
                    />
                  );
                })}

                {/* Outer Nodes */}
                {PENTAGON_ANGLES.map((angle, idx) => {
                  const rad = (angle * Math.PI) / 180;
                  const tx = 160 + 100 * Math.cos(rad);
                  const ty = 160 + 100 * Math.sin(rad);

                  const p1Here = positions[0] === idx;
                  const p2Here = positions[1] === idx;

                  // Highlight if current player can move here
                  const myCurrentNode = positions[playerIdx];
                  const canMove = isMyTurn && !gameOver && (myCurrentNode === 5);

                  return (
                    <g key={`node-${idx}`} onClick={() => canMove && handleNodeClick(idx)} style={{ cursor: canMove ? 'pointer' : 'default' }}>
                      <circle
                        cx={tx}
                        cy={ty}
                        r="22"
                        fill={canMove ? '#1e293b' : '#0f172a'}
                        stroke={canMove ? '#34d399' : '#334155'}
                        strokeWidth="2.5"
                        className={canMove ? styles.dingerPulse : ''}
                      />
                      
                      {p1Here && (
                        <circle cx={tx} cy={ty} r="14" fill="#22d3ee" stroke="#ffffff" strokeWidth="1.5" />
                      )}
                      {p2Here && (
                        <circle cx={tx} cy={ty} r="14" fill="#fb7185" stroke="#ffffff" strokeWidth="1.5" />
                      )}

                      {!p1Here && !p2Here && (
                        <text x={tx} y={ty + 4} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">
                          {idx + 1}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Center Node (5) */}
                {(() => {
                  const p1Here = positions[0] === 5;
                  const p2Here = positions[1] === 5;

                  // Can move if my current node is outer (<= 4)
                  const myCurrentNode = positions[playerIdx];
                  const canMove = isMyTurn && !gameOver && (myCurrentNode <= 4);

                  return (
                    <g onClick={() => canMove && handleNodeClick(5)} style={{ cursor: canMove ? 'pointer' : 'default' }}>
                      <circle
                        cx="160"
                        cy="160"
                        r="26"
                        fill={canMove ? '#1e293b' : '#0f172a'}
                        stroke={canMove ? '#34d399' : '#eab308'}
                        strokeWidth="2.5"
                        className={canMove ? styles.dingerPulse : ''}
                      />
                      
                      {p1Here && (
                        <circle cx="160" cy="160" r="16" fill="#22d3ee" stroke="#ffffff" strokeWidth="1.5" />
                      )}
                      {p2Here && (
                        <circle cx="160" cy="160" r="16" fill="#fb7185" stroke="#ffffff" strokeWidth="1.5" />
                      )}

                      {!p1Here && !p2Here && (
                        <text x="160" y="164" textAnchor="middle" fill="#eab308" fontSize="11" fontWeight="extrabold">
                          HUB
                        </text>
                      )}
                    </g>
                  );
                })()}
              </svg>
            </div>
          )}

        </div>

        {/* Plunger / Console Control Box */}
        <div className={styles.consoleContainer}>
          
          {/* Score details dashboard */}
          <div className={styles.scoreRow}>
            <div className={styles.scoreBlock} style={{ borderColor: myColor }}>
              <span className={styles.scoreTitle}>You</span>
              <span className={styles.scoreValue}>{myScore} {isTzaarCup ? 'wins' : 'pts'}</span>
              <span className={styles.launchesLabel}>
                {isNokkenhole ? 'Unlimited turns' : isTzaarCup ? 'First to 3 wins' : `${myTurns} launches left`}
              </span>
            </div>

            <div className={styles.scoreBlock} style={{ borderColor: oppColor }}>
              <span className={styles.scoreTitle}>
                {allPlayerNames[oppIdx] || opponentName || 'Opponent'}
              </span>
              <span className={styles.scoreValue}>{oppScore} {isTzaarCup ? 'wins' : 'pts'}</span>
              <span className={styles.launchesLabel}>
                {isNokkenhole ? 'Unlimited turns' : isTzaarCup ? 'First to 3 wins' : `${oppTurns} launches left`}
              </span>
            </div>
          </div>

          {/* Launcher Plunger Tension Slider */}
          {variant !== 'watermelon_knife' && !isTzaarCup && (
            <div className={styles.plungerBox}>
              <h4 className={styles.plungerTitle}>Spring Plunger Tension</h4>
              
              <div className={styles.sliderContainer}>
                <span className={styles.sliderMinMax}>1%</span>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={tension}
                  onChange={(e) => setTension(Number(e.target.value))}
                  disabled={!isMyTurn || gameOver || (!isNokkenhole && myTurns === 0)}
                  className={styles.plungerRange}
                  style={{
                    background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${tension}%, rgba(255,255,255,0.08) ${tension}%, rgba(255,255,255,0.08) 100%)`
                  }}
                />
                <span className={styles.sliderMinMax}>100%</span>
              </div>

              <div className={styles.tensionDisplay}>
                <span className={styles.tensionVal}>{tension}%</span>
                <span className={styles.tensionDesc}>Selected Force</span>
              </div>

              <div className={styles.springTrack}>
                <div
                  className={styles.springCoil}
                  style={{ height: `${80 - tension * 0.5}px` }}
                />
                <div className={styles.plungerCap} />
              </div>

              {canLaunch ? (
                <button onClick={handleLaunch} className={styles.launchBtn}>
                  🚀 LAUNCH POWER
                </button>
              ) : (
                <button disabled className={styles.launchBtnDisabled}>
                  LAUNCH PLUNGER
                </button>
              )}
            </div>
          )}

          {/* Guidelines */}
          <div className={styles.guideContainer}>
            <h4 className={styles.guideTitle}>Aimer Guide</h4>
            {variant === 'classic' && (
              <p className={styles.guideText}>
                Aim for specific concentric rings. Dead zones are below 40% and above 96%.
                Inner Rings (76-88%) grant 200 points. Center Dingers (89-96%) grant 300 points!
              </p>
            )}
            {variant === 'tumblin_dice' && (
              <p className={styles.guideText}>
                Launch dice down the tiered ramp. Score = Die roll (1-6) * Shelf Multiplier.
                Shelf targets: x1 (10-32%), x2 (33-58%), x3 (59-79%), x4 (80-92%). Bouncing off the ramp gives 0.
              </p>
            )}
            {variant === 'watermelon_knife' && (
              <p className={styles.guideText}>
                Throw knives into empty sectors of the spinning target. Hitting an occupied segment scores 0 points and wastes a knife! Select a segment below to aim.
              </p>
            )}
            {isNokkenhole && (
              <p className={styles.guideText}>
                Roll the ball up the Nokkenhole board to target scoring zones.
                Zone 1 (20-39%): 1pt. Zone 2 (40-59%): 2pts. Zone 3 (76-90%): 1pt.
                CENTER HOLE (60-75%): 3pts! First to 21 points wins.
              </p>
            )}
            {isTzaarCup && (
              <p className={styles.guideText}>
                Tactile board play: Move your cup along connecting lines between outer nodes and the central hub node. 
                Outer nodes do not connect to each other.
                Capture the opponent cup by moving onto their node. First to 3 captures wins the match!
              </p>
            )}
          </div>

          {/* Active Turn banner */}
          <div className={styles.turnTray}>
            {isMyTurn && !gameOver && (isNokkenhole || isTzaarCup || myTurns > 0) ? (
              <div className={styles.activeTurnAlert}>
                {isTzaarCup ? '🎯 Click an adjacent node to move your cup!' : '🎯 Your turn! Adjust tension and launch!'}
              </div>
            ) : !isMyTurn && !gameOver ? (
              <div className={styles.waitingAlert}>
                Waiting for {allPlayerNames[oppIdx] || opponentName || 'Opponent'}...
              </div>
            ) : (
              <div className={styles.finishedAlert}>
                Launches completed! Game Over.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

export default function TabletopPinballGamePage({ variant = 'classic' }: { variant?: string }) {
  const serverVariant = variant === 'tumblin_dice' || variant === 'tumblin-dice'
    ? 'tumblin_dice'
    : (variant === 'watermelon_knife' || variant === 'watermelon-knife'
      ? 'watermelon_knife'
      : (variant === 'nokkenhole'
        ? 'nokkenhole'
        : (variant === 'tzaar_cup' || variant === 'tzaar-cup'
          ? 'tzaar_cup'
          : 'classic')));

  const gameName = serverVariant === 'tumblin_dice'
    ? "Tumblin' Dice"
    : (serverVariant === 'watermelon_knife'
      ? 'Watermelon Knife Hit'
      : (serverVariant === 'nokkenhole'
        ? 'Nokkenhole'
        : (serverVariant === 'tzaar_cup'
          ? 'Tzaar Cup Slam'
          : 'Tabletop Pinball')));

  const gameIcon = serverVariant === 'tumblin_dice'
    ? 'pinball-tumblin-dice'
    : (serverVariant === 'watermelon_knife'
      ? 'pinball-knife-hit'
      : (serverVariant === 'nokkenhole'
        ? 'pinball-nokkenhole'
        : (serverVariant === 'tzaar_cup'
          ? 'pinball-tzaar-cup'
          : 'pinball-classic')));

  return (
    <GameTemplate
      gameType="tabletop_pinball"
      variant={serverVariant}
      gameName={gameName}
      gameIcon={gameIcon}
      accentColor="#f97316"
      winEmoji="🎯"
      winTitle="Pinball Champion!"
      loseTitle="Runner Up"
      drawTitle="Draw Match"
    >
      {(props) => <TabletopPinballBoard {...props} />}
    </GameTemplate>
  );
}
