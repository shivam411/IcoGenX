// frontend/src/app/games/stick-dice-race/StickDiceRaceGame.tsx
'use client';

import React from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

interface Figure {
  id: number;
  max_points: number;
  current_points: number;
  x: number;
  y: number;
}

interface StickAvatarProps {
  id: number;
  currentPoints: number;
  maxPoints: number;
  themeColor: string;
}

function StickAvatar({ id, currentPoints, maxPoints, themeColor }: StickAvatarProps) {
  const isEliminated = currentPoints === 0;

  // Funny customized stick figure renderers
  if (id === 0) {
    // Big Boss (Large square body, small crown)
    return (
      <div className={`${styles.avatarContainer} ${isEliminated ? styles.eliminated : ''}`}>
        <svg viewBox="0 0 60 90" className={styles.avatarSvg} style={{ color: themeColor }}>
          {/* Crown */}
          <path d="M20,10 L25,18 L30,10 L35,18 L40,10 L38,20 L22,20 Z" fill="currentColor" opacity="0.8" />
          {/* Head */}
          <circle cx="30" cy="28" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
          {/* Giant square body */}
          <rect x="15" y="38" width="30" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
          {/* Legs */}
          <line x1="22" y1="66" x2="12" y2="86" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="38" y1="66" x2="48" y2="86" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          {/* Arms */}
          <line x1="15" y1="48" x2="5" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="45" y1="48" x2="55" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (id === 1 || id === 2) {
    // Medium Guys (Tall wire bodies, long limbs)
    return (
      <div className={`${styles.avatarContainer} ${isEliminated ? styles.eliminated : ''}`}>
        <svg viewBox="0 0 40 70" className={styles.avatarSvg} style={{ color: themeColor }}>
          {/* Head */}
          <circle cx="20" cy="14" r="6" fill="none" stroke="currentColor" strokeWidth="2.0" />
          {/* Spine */}
          <line x1="20" y1="20" x2="20" y2="45" stroke="currentColor" strokeWidth="2.0" />
          {/* Legs */}
          <line x1="20" y1="45" x2="10" y2="66" stroke="currentColor" strokeWidth="2.0" strokeLinecap="round" />
          <line x1="20" y1="45" x2="30" y2="66" stroke="currentColor" strokeWidth="2.0" strokeLinecap="round" />
          {/* Arms */}
          <line x1="20" y1="28" x2="6" y2="24" stroke="currentColor" strokeWidth="2.0" strokeLinecap="round" />
          <line x1="20" y1="28" x2="34" y2="24" stroke="currentColor" strokeWidth="2.0" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // Small Guys
  return (
    <div className={`${styles.avatarContainer} ${isEliminated ? styles.eliminated : ''}`}>
      <svg viewBox="0 0 35 55" className={styles.avatarSvg} style={{ color: themeColor }}>
        {/* Head */}
        <circle cx="17" cy="10" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {/* Spine */}
        <line x1="17" y1="14.5" x2="17" y2="33" stroke="currentColor" strokeWidth="1.5" />
        {/* Legs */}
        <line x1="17" y1="33" x2="9" y2="50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17" y1="33" x2="25" y2="50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        {/* Arms */}
        <line x1="17" y1="22" x2="7" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17" y1="22" x2="27" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function StickDiceRaceBoard({
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

  const figures: Figure[][] = gameState.player_figures || [[], []];
  const rolledValue: number | null = gameState.rolled_value ?? null;
  const pointsRemaining: number = gameState.points_remaining ?? 0;
  const hasRolled: boolean = gameState.has_rolled ?? false;
  const lastEvent = gameState.last_event || 'Roll to begin!';

  const playerIdx = playerNumber;
  const oppIdx = 1 - playerIdx;

  const isP1 = playerIdx === 0;
  const myColor = isP1 ? '#22d3ee' : '#fb7185';
  const oppColor = isP1 ? '#fb7185' : '#22d3ee';

  const myFigures = figures[playerIdx] || [];
  const oppFigures = figures[oppIdx] || [];

  const handleRollClick = () => {
    if (!isMyTurn || hasRolled || gameOver) return;
    sendAction({ action: 'RollDice' });
  };

  const handleFigureClick = (figId: number) => {
    if (!isMyTurn || !hasRolled || gameOver || pointsRemaining === 0) return;
    const target = myFigures[figId];
    if (!target || target.current_points === 0) return;

    // Allocate 1 point per click
    sendAction({
      action: 'AllocatePoints',
      figure_id: figId,
      points: 1,
    });
  };

  const handleEndTurnClick = () => {
    if (!isMyTurn || !hasRolled || gameOver) return;
    sendAction({ action: 'EndTurn' });
  };

  return (
    <div className={styles.boardShell}>
      {/* Event banner */}
      <div className={styles.statusBar}>
        <span className={styles.statusText}>{lastEvent}</span>
      </div>

      {/* Symmetrical Split Board */}
      <div className={styles.gameArea}>
        {/* Left Side: My whiteboard board */}
        <div className={styles.whiteboard} style={{ borderColor: myColor }}>
          <div className={styles.whiteboardHeader} style={{ background: `linear-gradient(135deg, ${myColor}12, transparent)` }}>
            <span className={styles.dot} style={{ backgroundColor: myColor }} />
            <span>Your Army</span>
          </div>

          <div className={styles.paperSheet}>
            {myFigures.map((fig: Figure) => {
              const isEliminated = fig.current_points === 0;
              const canClick = isMyTurn && hasRolled && pointsRemaining > 0 && !isEliminated;

              return (
                <div
                  key={`my-fig-${fig.id}`}
                  onClick={() => canClick && handleFigureClick(fig.id)}
                  className={`
                    ${styles.figureWrapper} 
                    ${canClick ? styles.figureActionable : ''}
                  `}
                  style={{
                    left: `${fig.x}px`,
                    top: `${fig.y}px`,
                  }}
                >
                  <StickAvatar
                    id={fig.id}
                    currentPoints={fig.current_points}
                    maxPoints={fig.max_points}
                    themeColor={myColor}
                  />
                  {/* Health badge */}
                  <div className={styles.healthBadge}>
                    {isEliminated ? '❌' : `${fig.current_points} / ${fig.max_points}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center panel: roll controls */}
        <div className={styles.consoleContainer}>
          <div className={styles.diceTray}>
            <div className={styles.dieBox}>
              {rolledValue !== null ? (
                <div className={styles.dieFace}>{rolledValue}</div>
              ) : (
                <div className={styles.diePlaceholder}>🎲</div>
              )}
            </div>
            {isMyTurn && hasRolled && pointsRemaining > 0 && (
              <div className={styles.pointsPrompt}>
                Points Left: <strong className={styles.glowText}>{pointsRemaining}</strong>
              </div>
            )}
          </div>

          <div className={styles.actionsBox}>
            {isMyTurn && !hasRolled && !gameOver && (
              <button onClick={handleRollClick} className={styles.rollBtn}>
                ROLL DIE
              </button>
            )}

            {isMyTurn && hasRolled && !gameOver && (
              <button onClick={handleEndTurnClick} className={styles.passBtn}>
                END TURN
              </button>
            )}

            {!isMyTurn && (
              <div className={styles.waitingText}>
                Waiting for {allPlayerNames[oppIdx] || opponentName || 'Opponent'}...
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Opponent whiteboard preview */}
        <div className={styles.whiteboard} style={{ borderColor: oppColor }}>
          <div className={styles.whiteboardHeader} style={{ background: `linear-gradient(135deg, ${oppColor}12, transparent)` }}>
            <span className={styles.dot} style={{ backgroundColor: oppColor }} />
            <span>{allPlayerNames[oppIdx] || opponentName || 'Opponent'}'s Army</span>
          </div>

          <div className={styles.paperSheet}>
            {oppFigures.map((fig: Figure) => {
              const isEliminated = fig.current_points === 0;

              return (
                <div
                  key={`opp-fig-${fig.id}`}
                  className={styles.figureWrapper}
                  style={{
                    left: `${fig.x}px`,
                    top: `${fig.y}px`,
                  }}
                >
                  <StickAvatar
                    id={fig.id}
                    currentPoints={fig.current_points}
                    maxPoints={fig.max_points}
                    themeColor={oppColor}
                  />
                  <div className={styles.healthBadge}>
                    {isEliminated ? '❌' : `${fig.current_points} / ${fig.max_points}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StickDiceRaceGamePage() {
  return (
    <GameTemplate
      gameType="stick_dice_race"
      gameName="Stick Figure Dice Race"
      gameIcon="stick-dice-race"
      accentColor="#7c3aed"
      winEmoji="🖍️"
      winTitle="Army Crossout Completed!"
      loseTitle="All Eliminated"
      drawTitle="Mutual Erasure"
    >
      {(props) => <StickDiceRaceBoard {...props} />}
    </GameTemplate>
  );
}
