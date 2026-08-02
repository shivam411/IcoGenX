// frontend/src/app/games/dot-matrix/DotMatrixGame.tsx
'use client';

import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function DotMatrixBoard({
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

  const N = gameState.grid_size || 4; // 4x4 grid of squares
  const horizontalBarriers: (number | null)[] = gameState.horizontal_barriers || [];
  const verticalBarriers: (number | null)[] = gameState.vertical_barriers || [];
  const claimedSquares: (number | null)[] = gameState.claimed_squares || [];
  const diceRoll: number | null = gameState.dice_roll || null;
  const hasRolled: boolean = Boolean(gameState.has_rolled);
  const linesPlacedThisTurn: number = gameState.lines_placed_this_turn || 0;
  const lastEvent: string | null = gameState.last_event || null;

  const player1Name = allPlayerNames[0] || 'Player 1';
  const player2Name = allPlayerNames[1] || 'Player 2';

  // Calculate scores
  const scoreP1 = claimedSquares.filter((s) => s === 0).length;
  const scoreP2 = claimedSquares.filter((s) => s === 1).length;

  const handleBarrierClick = (type: 'horizontal' | 'vertical', index: number) => {
    if (gameOver || !isMyTurn || !hasRolled) return;
    if (type === 'horizontal' && horizontalBarriers[index] !== null) return;
    if (type === 'vertical' && verticalBarriers[index] !== null) return;

    sendAction({
      action: 'PlaceBarrier',
      barrier_type: type,
      index,
    });
  };

  const handleRollClick = () => {
    if (gameOver || !isMyTurn || hasRolled) return;
    sendAction({ action: 'RollDie' });
  };

  // SVG dimensions
  const svgSize = 400;
  const padding = 35;
  const activeWidth = svgSize - 2 * padding;
  const step = activeWidth / N;

  const getPlayerInitial = (pIdx: number) => {
    const name = allPlayerNames[pIdx];
    return name ? name.trim().charAt(0).toUpperCase() : (pIdx === 0 ? 'P1' : 'P2');
  };

  const isDotConnected = (r: number, c: number): boolean => {
    // Check horizontal barriers
    if (c > 0 && horizontalBarriers[r * N + (c - 1)] !== null) return true;
    if (c < N && horizontalBarriers[r * N + c] !== null) return true;
    // Check vertical barriers
    if (r > 0 && verticalBarriers[(r - 1) * (N + 1) + c] !== null) return true;
    if (r < N && verticalBarriers[r * (N + 1) + c] !== null) return true;
    return false;
  };

  const isPlayable = isMyTurn && hasRolled && !gameOver;

  return (
    <div className={styles.shell}>
      {/* Event banner / status bar */}
      <div className={styles.statusBar}>
        <span>{lastEvent || 'Roll the die to take your turn.'}</span>
      </div>

      {/* Dice Console */}
      <div className={styles.diceConsole}>
        {!hasRolled ? (
          <div className={styles.dieShowcase}>
            <span className={styles.rollPrompt}>
              {isMyTurn ? 'Roll the die to get your line limit!' : 'Waiting for opponent to roll...'}
            </span>
            <button
              type="button"
              className={styles.rollBtn}
              disabled={!isMyTurn || gameOver}
              onClick={handleRollClick}
            >
              🎰 Roll Die
            </button>
          </div>
        ) : (
          <div className={styles.dieShowcase}>
            <div className={styles.die}>{diceRoll}</div>
            <span className={styles.linesTracker}>
              Placed: {linesPlacedThisTurn} / {diceRoll} lines
            </span>
          </div>
        )}
      </div>

      <div className={styles.boardContainer}>
        {/* SVG Board */}
        <svg className={styles.svgBoard} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          {/* 1. Claimed Squares / Candy items */}
          {Array.from({ length: N * N }).map((_, idx) => {
            const r = Math.floor(idx / N);
            const c = idx % N;
            const x = padding + c * step;
            const y = padding + r * step;
            const owner = claimedSquares[idx];

            if (owner === null) {
              // Render 🍬 in unclaimed square
              return (
                <text
                  key={`candy-${idx}`}
                  x={x + step / 2}
                  y={y + step / 2 + 5}
                  className={styles.candyIcon}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  🍬
                </text>
              );
            }

            const isP1 = owner === 0;
            return (
              <g key={`sq-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={step}
                  height={step}
                  className={isP1 ? styles.squareClaimedP1 : styles.squareClaimedP2}
                />
                <text
                  x={x + step / 2}
                  y={y + step / 2}
                  className={`${styles.squareText} ${isP1 ? styles.textP1 : styles.textP2}`}
                >
                  {getPlayerInitial(owner)}
                </text>
              </g>
            );
          })}

          {/* 2. Horizontal lines & hitboxes */}
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
              return (
                <line
                  key={`h-placed-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={`${styles.barrierLine} ${owner === 0 ? styles.lineP1 : styles.lineP2}`}
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
                  className={`${styles.hitbox} ${isPlayable ? styles.hitboxPlayable : ''}`}
                  onClick={() => isPlayable && handleBarrierClick('horizontal', idx)}
                />
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={`${styles.barrierLine} styles.lineEmpty`}
                />
              </g>
            );
          })}

          {/* 3. Vertical lines & hitboxes */}
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
              return (
                <line
                  key={`v-placed-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={`${styles.barrierLine} ${owner === 0 ? styles.lineP1 : styles.lineP2}`}
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
                  className={`${styles.hitbox} ${isPlayable ? styles.hitboxPlayable : ''}`}
                  onClick={() => isPlayable && handleBarrierClick('vertical', idx)}
                />
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={`${styles.barrierLine} styles.lineEmpty`}
                />
              </g>
            );
          })}

          {/* 4. Grid Dots */}
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

        {/* Dynamic scoreboard */}
        <div className={styles.scoreBoard}>
          <div className={`${styles.scoreItem} ${styles.scoreP1}`}>
            <div className={styles.scoreLabel}>{player1Name} ({getPlayerInitial(0)})</div>
            <div className={styles.scoreVal}>{scoreP1}</div>
          </div>
          <div className={`${styles.scoreItem} ${styles.scoreP2}`}>
            <div className={styles.scoreLabel}>{player2Name} ({getPlayerInitial(1)})</div>
            <div className={styles.scoreVal}>{scoreP2}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DotMatrixGamePage() {
  return (
    <GameTemplate
      gameType="dot_matrix"
      gameName="The dot Matrix"
      gameIcon="dot-matrix"
      accentColor="#f59e0b"
      winEmoji="🍬"
      winTitle="Sweet Victory!"
      loseTitle="Boxes Enclosed"
      drawTitle="Boxes Tied"
    >
      {(props) => <DotMatrixBoard {...props} />}
    </GameTemplate>
  );
}
