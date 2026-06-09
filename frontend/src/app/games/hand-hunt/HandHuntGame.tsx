// frontend/src/app/games/hand-hunt/HandHuntGame.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function HandHuntBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<number>(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  if (!gameState) return null;

  const numbers: number[] = gameState.numbers || [];
  const coords: [number, number][] = gameState.coords || [];
  const target: number | null = gameState.current_target || null;
  const grids: boolean[][] = gameState.grids || [
    Array(36).fill(false),
    Array(36).fill(false),
  ];
  const scores: number[] = gameState.scores || [0, 0];
  const lastEvent = gameState.last_event || 'Spot the target!';

  const playerIdx = playerNumber;
  const oppIdx = 1 - playerIdx;

  const isP1 = playerIdx === 0;
  const myColor = isP1 ? '#22d3ee' : '#fb7185';
  const oppColor = isP1 ? '#fb7185' : '#22d3ee';

  const myGrid = grids[playerIdx] || [];
  const oppGrid = grids[oppIdx] || [];

  // Track if a specific number is claimed by anyone
  const getClaimedBy = (num: number): 'me' | 'opp' | null => {
    const idx = num - 1;
    if (myGrid[idx]) return 'me';
    if (oppGrid[idx]) return 'opp';
    return null;
  };

  // Watch for misclick penalty in last_event to trigger cooldown
  useEffect(() => {
    if (
      lastEvent &&
      lastEvent.includes(`Player ${playerIdx + 1}`) &&
      lastEvent.includes('misclicked!')
    ) {
      setCooldownTimeLeft(1.5);
    }
  }, [lastEvent, playerIdx]);

  // Handle cooldown decrement ticker
  useEffect(() => {
    if (cooldownTimeLeft > 0) {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = setInterval(() => {
        setCooldownTimeLeft((prev) => {
          if (prev <= 0.05) {
            if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return parseFloat((prev - 0.1).toFixed(2));
        });
      }, 100);
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [cooldownTimeLeft]);

  const handleCircleClick = (num: number) => {
    if (gameOver || cooldownTimeLeft > 0) return;
    
    // Don't allow clicking already claimed numbers
    if (getClaimedBy(num) !== null) return;

    sendAction({
      action: 'ClaimNumber',
      number: num,
    });
  };

  return (
    <div className={styles.boardShell}>
      {/* Penalty Lock Overlay */}
      {cooldownTimeLeft > 0 && (
        <div className={styles.cooldownOverlay}>
          <div className={styles.cooldownContent}>
            <div className={styles.cooldownIcon}>🛑</div>
            <div className={styles.cooldownTitle}>MISCLICK PENALTY LOCKOUT</div>
            <div className={styles.cooldownBarContainer}>
              <div
                className={styles.cooldownBarFill}
                style={{ width: `${(cooldownTimeLeft / 1.5) * 100}%` }}
              />
            </div>
            <div className={styles.cooldownTimer}>{cooldownTimeLeft.toFixed(1)}s</div>
          </div>
        </div>
      )}

      {/* Top Banner showing Target & Status */}
      <div className={styles.topInfoBar}>
        <div className={styles.targetCard}>
          <span className={styles.targetLabel}>FIND TARGET NUMBER</span>
          <span className={styles.targetValue}>{target !== null ? target : '---'}</span>
        </div>
        <div className={styles.eventText}>{lastEvent}</div>
      </div>

      {/* Main Split Grid: Grids on left/right, Scattered Pool in center */}
      <div className={styles.gameContainer}>
        {/* Left Side: My Grid Card */}
        <div className={styles.gridCard} style={{ borderColor: myColor }}>
          <div className={styles.gridCardHeader} style={{ background: `linear-gradient(135deg, ${myColor}22, transparent)` }}>
            <span className={styles.dot} style={{ backgroundColor: myColor }} />
            <span className={styles.gridTitle}>Your Grid ({scores[playerIdx]} / 18)</span>
          </div>
          <div className={styles.stampGrid}>
            {Array.from({ length: 36 }).map((_, idx) => {
              const num = idx + 1;
              const isClaimed = myGrid[idx];
              return (
                <div
                  key={`my-grid-${num}`}
                  className={`
                    ${styles.stampCell} 
                    ${isClaimed ? styles.stampCellClaimedMy : ''}
                  `}
                  style={{ '--my-color': myColor } as React.CSSProperties}
                >
                  <span className={styles.stampNumber}>{num}</span>
                  {isClaimed && <span className={styles.stampMark}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Scattered Coordinate Board */}
        <div className={styles.scatteredBoardContainer}>
          <div className={styles.scatteredBoard}>
            {numbers.map((num, i) => {
              const coord = coords[i] || [200, 200];
              const claimedBy = getClaimedBy(num);
              
              let nodeClass = styles.numberNode;
              let styleObj: React.CSSProperties = {
                left: `${(coord[0] / 400) * 100}%`,
                top: `${(coord[1] / 400) * 100}%`,
              };

              if (claimedBy === 'me') {
                nodeClass += ` ${styles.nodeClaimedMy}`;
                styleObj = { ...styleObj, '--glow-color': myColor } as React.CSSProperties;
              } else if (claimedBy === 'opp') {
                nodeClass += ` ${styles.nodeClaimedOpp}`;
                styleObj = { ...styleObj, '--glow-color': oppColor } as React.CSSProperties;
              } else if (cooldownTimeLeft > 0) {
                nodeClass += ` ${styles.nodeDisabled}`;
              }

              return (
                <div
                  key={`node-${num}`}
                  className={nodeClass}
                  style={styleObj}
                  onClick={() => handleCircleClick(num)}
                >
                  <span className={styles.nodeText}>{num}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Opponent Grid Card */}
        <div className={styles.gridCard} style={{ borderColor: oppColor }}>
          <div className={styles.gridCardHeader} style={{ background: `linear-gradient(135deg, ${oppColor}22, transparent)` }}>
            <span className={styles.dot} style={{ backgroundColor: oppColor }} />
            <span className={styles.gridTitle}>
              {allPlayerNames[oppIdx] || opponentName || 'Opponent'}'s Grid ({scores[oppIdx]} / 18)
            </span>
          </div>
          <div className={styles.stampGrid}>
            {Array.from({ length: 36 }).map((_, idx) => {
              const num = idx + 1;
              const isClaimed = oppGrid[idx];
              return (
                <div
                  key={`opp-grid-${num}`}
                  className={`
                    ${styles.stampCell} 
                    ${isClaimed ? styles.stampCellClaimedOpp : ''}
                  `}
                  style={{ '--opp-color': oppColor } as React.CSSProperties}
                >
                  <span className={styles.stampNumber}>{num}</span>
                  {isClaimed && <span className={styles.stampMark}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HandHuntGamePage() {
  return (
    <GameTemplate
      gameType="hand_hunt"
      gameName="Hand Hunt"
      gameIcon="hand-hunt"
      accentColor="#d946ef"
      winEmoji="🎯"
      winTitle="Eagle Eyed!"
      loseTitle="Numbers Claimed"
      drawTitle="Grid Locked"
    >
      {(props) => <HandHuntBoard {...props} />}
    </GameTemplate>
  );
}
