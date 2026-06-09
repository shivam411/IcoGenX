// frontend/src/app/games/connect-numbers/ConnectNumbersGame.tsx
'use client';

import { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function ConnectNumbersBoard({
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

  const connections: boolean[][] = gameState.connections || [[], []];
  const scores: number[] = gameState.scores || [0, 0];
  const lastRoll: number | null = gameState.last_roll || null;
  const lastEvent: string | null = gameState.last_event || null;
  const currentPlayer: number = gameState.currentPlayer ?? 0;

  const [localRolling, setLocalRolling] = useState(false);
  const [dieDisplay, setDieDisplay] = useState<number | string>('🎲');

  // Trigger local rolling simulation on roll state changes
  useEffect(() => {
    if (lastRoll !== null) {
      setDieDisplay(lastRoll);
    }
  }, [lastRoll]);

  const handleRollClick = () => {
    if (!isMyTurn || gameOver || localRolling) return;

    setLocalRolling(true);
    setDieDisplay('❓');

    // Simulate dice rolling animation for 600ms before dispatching
    setTimeout(() => {
      sendAction({ action: 'RollDie' });
      setLocalRolling(false);
    }, 600);
  };

  const p1Connections = connections[0] || [];
  const p2Connections = connections[1] || [];

  const player1Name = allPlayerNames[0] || 'Player 1';
  const player2Name = allPlayerNames[1] || 'Player 2';

  const getNodeCoords = (playerIdx: number, nodeIdx: number) => {
    const cx = 300;
    const cy = 200;
    const isP1 = playerIdx === 0;
    const x = isP1 ? 75 : 525;
    // 6 slots spaced vertically from 50 to 350
    const y = 50 + nodeIdx * 60;
    return { x, y };
  };

  const centerPrize = { x: 300, y: 200 };

  return (
    <div className={styles.shell}>
      {/* Event Banner */}
      <div className={styles.statusBar}>
        <span>{lastEvent || 'Roll the die to connect your numbers to the prize!'}</span>
      </div>

      {/* Score Board */}
      <div className={styles.scoreBoard}>
        <div className={`${styles.scoreCard} ${currentPlayer === 0 ? styles.activeScoreP1 : ''}`}>
          <div className={styles.scoreLabel}>{player1Name} Connections:</div>
          <div className={`${styles.scoreVal} ${styles.scoreP1}`}>{scores[0]} / 6</div>
        </div>
        <div className={`${styles.scoreCard} ${currentPlayer === 1 ? styles.activeScoreP2 : ''}`}>
          <div className={styles.scoreLabel}>{player2Name} Connections:</div>
          <div className={`${styles.scoreVal} ${styles.scoreP2}`}>{scores[1]} / 6</div>
        </div>
      </div>

      {/* SVG Canvas Board */}
      <div className={styles.boardContainer}>
        <svg className={styles.svgBoard} viewBox="0 0 600 400" aria-label="Connect Your Numbers Board">
          {/* Faint connection paths (guides) */}
          {Array.from({ length: 6 }).map((_, idx) => {
            const p1Coords = getNodeCoords(0, idx);
            const p2Coords = getNodeCoords(1, idx);
            return (
              <g key={`guides-${idx}`}>
                <line
                  x1={p1Coords.x}
                  y1={p1Coords.y}
                  x2={centerPrize.x}
                  y2={centerPrize.y}
                  className={styles.lineGuide}
                />
                <line
                  x1={p2Coords.x}
                  y1={p2Coords.y}
                  x2={centerPrize.x}
                  y2={centerPrize.y}
                  className={styles.lineGuide}
                />
              </g>
            );
          })}

          {/* Connected Lines P1 (Cyan) */}
          {p1Connections.map((connected, idx) => {
            if (!connected) return null;
            const coords = getNodeCoords(0, idx);
            return (
              <line
                key={`p1-line-${idx}`}
                x1={coords.x}
                y1={coords.y}
                x2={centerPrize.x}
                y2={centerPrize.y}
                className={`${styles.connectionLine} ${styles.lineP1}`}
              />
            );
          })}

          {/* Connected Lines P2 (Rose) */}
          {p2Connections.map((connected, idx) => {
            if (!connected) return null;
            const coords = getNodeCoords(1, idx);
            return (
              <line
                key={`p2-line-${idx}`}
                x1={coords.x}
                y1={coords.y}
                x2={centerPrize.x}
                y2={centerPrize.y}
                className={`${styles.connectionLine} ${styles.lineP2}`}
              />
            );
          })}

          {/* Side Column Labels */}
          <text x="75" y="25" className={`${styles.sideLabel} ${currentPlayer === 0 ? styles.sideLabelActive : ''}`}>
            P1 Numbers
          </text>
          <text x="525" y="25" className={`${styles.sideLabel} ${currentPlayer === 1 ? styles.sideLabelActive : ''}`}>
            P2 Numbers
          </text>

          {/* Player 1 Number Nodes */}
          {Array.from({ length: 6 }).map((_, idx) => {
            const coords = getNodeCoords(0, idx);
            const isConnected = p1Connections[idx];
            return (
              <g key={`p1-node-${idx}`}>
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r="18"
                  className={`${styles.numberNode} ${isConnected ? styles.nodeP1Connected : ''}`}
                />
                <text
                  x={coords.x}
                  y={coords.y + 1}
                  className={`${styles.nodeText} ${isConnected ? styles.nodeTextConnected : ''}`}
                >
                  {idx + 1}
                </text>
              </g>
            );
          })}

          {/* Player 2 Number Nodes */}
          {Array.from({ length: 6 }).map((_, idx) => {
            const coords = getNodeCoords(1, idx);
            const isConnected = p2Connections[idx];
            return (
              <g key={`p2-node-${idx}`}>
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r="18"
                  className={`${styles.numberNode} ${isConnected ? styles.nodeP2Connected : ''}`}
                />
                <text
                  x={coords.x}
                  y={coords.y + 1}
                  className={`${styles.nodeText} ${isConnected ? styles.nodeTextConnected : ''}`}
                >
                  {idx + 1}
                </text>
              </g>
            );
          })}

          {/* Central Prize Shape (Floating Golden Trophy SVG) */}
          <g className={styles.prizeWrapper} transform={`translate(${centerPrize.x - 25}, ${centerPrize.y - 25})`}>
            {/* Soft background glow */}
            <circle cx="25" cy="25" r="35" className={styles.prizeGlow} opacity="0.3" />
            
            {/* Cup trophy outline */}
            <path
              d="M 12 12 Q 12 28 25 28 Q 38 28 38 12 Z M 21 28 L 21 38 L 15 38 L 15 42 L 35 42 L 35 38 L 29 38 L 29 28 Z"
              className={styles.prizeBase}
            />
            {/* Trophy Handles */}
            <path
              d="M 12 16 Q 5 16 12 24 M 38 16 Q 45 16 38 24"
              stroke="#eab308"
              strokeWidth="2.5"
              fill="none"
            />
            {/* Sparkles */}
            <polygon points="25,5 27,9 31,9 28,12 29,16 25,14 21,16 22,12 19,9 23,9" className={styles.prizeSparkle} />
          </g>
        </svg>
      </div>

      {/* Dice Console Tray */}
      <div className={styles.diceConsole}>
        <div className={styles.diceShowcase}>
          <div className={`${styles.die} ${localRolling ? styles.dieRolling : ''}`}>
            {dieDisplay}
          </div>
          <span className={`${styles.rollText} ${isMyTurn && !gameOver ? styles.rollTextActive : ''}`}>
            {gameOver
              ? 'Match Complete!'
              : isMyTurn
              ? 'Your Turn! Roll the die.'
              : "Waiting for opponent's roll..."}
          </span>
        </div>

        <button
          type="button"
          className={styles.rollBtn}
          disabled={!isMyTurn || gameOver || localRolling}
          onClick={handleRollClick}
        >
          🎲 Roll Die
        </button>
      </div>
    </div>
  );
}

export default function ConnectNumbersGamePage() {
  return (
    <GameTemplate
      gameType="connect_numbers"
      gameName="Connect Your Numbers"
      gameIcon="connect-numbers"
      accentColor="#06b6d4"
      winEmoji="🎁"
      winTitle="Sweet Victory!"
      loseTitle="Numbers Link Complete"
      drawTitle="Showdown Completed"
    >
      {(props) => <ConnectNumbersBoard {...props} />}
    </GameTemplate>
  );
}
