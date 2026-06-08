// frontend/src/app/games/smart-four/SmartFourGame.tsx
'use client';

import { useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

type SmartFourVariant = 'classic' | 'topple';

const VARIANT_CONFIG: Record<SmartFourVariant, { name: string; icon: string; accent: string }> = {
  classic: { name: 'Smart Four 3D', icon: 'smart-four-classic', accent: '#06b6d4' },
  topple: { name: 'Topple Balance', icon: 'smart-four-topple', accent: '#3b82f6' },
};

function normalizeVariant(value: string | undefined): SmartFourVariant {
  if (value === 'topple') {
    return 'topple';
  }
  return 'classic';
}

function SmartFourBoard({
  gameState,
  playerNumber,
  isMyTurn,
  sendAction,
  gameOver,
  variant,
}: GameBoardProps & { variant: SmartFourVariant }) {
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  const board: number[][] = gameState?.board || Array(25).fill(null).map(() => []);
  const scores: number[] = gameState?.scores || [0, 0];
  const diceRoll: number | null = gameState?.dice_roll || null;
  const hasRolled: boolean = Boolean(gameState?.has_rolled);
  const torque: [number, number] = gameState?.torque || [0.0, 0.0];
  const winningLine: number[] = gameState?.winning_line || [];
  const lastEvent: string | null = gameState?.last_event || null;

  const torqueX = torque[0];
  const torqueY = torque[1];
  const tilt = Math.sqrt(torqueX * torqueX + torqueY * torqueY);
  const isDangerTilt = tilt > 8.0;

  // Actions
  const rollDie = () => {
    if (!isMyTurn || hasRolled || gameOver) return;
    sendAction({ action: 'SmartFourRoll' });
  };

  const placeToken = (cell: number) => {
    if (!isMyTurn || gameOver) return;
    if (variant === 'topple' && !hasRolled) return;
    if (board[cell].length >= 5) return;

    if (variant === 'topple' && diceRoll && diceRoll < 6) {
      const r = Math.floor(cell / 5);
      const c = cell % 5;
      const d = Math.abs(r - 2) + Math.abs(c - 2);
      if (d + 1 !== diceRoll) return;
    }

    sendAction({ action: 'SmartFourPlace', cell });
  };

  // Helper to determine if a cell is allowed for current placement
  const isCellAllowed = (cell: number): boolean => {
    if (!isMyTurn || gameOver) return false;
    if (board[cell].length >= 5) return false;

    if (variant === 'topple') {
      if (!hasRolled || !diceRoll) return false;
      if (diceRoll === 6) return true;
      const r = Math.floor(cell / 5);
      const c = cell % 5;
      const d = Math.abs(r - 2) + Math.abs(c - 2);
      return d + 1 === diceRoll;
    }

    return true; // In classic, any non-full column is allowed on your turn
  };

  return (
    <div className={styles.shell}>
      {/* Turn Event Log */}
      {lastEvent && (
        <div className={styles.statusPanel}>
          <div className={styles.playersInfo}>
            <div className={`${styles.playerCard} ${gameState?.currentPlayer === 0 ? styles.activeP1 : ''}`}>
              <div className={styles.playerLabel}>Player 1</div>
              <div className={styles.playerName}>
                <span className={styles.p1Dot} /> Cyan
              </div>
              {variant === 'topple' && <div className={styles.playerScore}>{scores[0]} pts</div>}
            </div>
            <div className={`${styles.playerCard} ${gameState?.currentPlayer === 1 ? styles.activeP2 : ''}`}>
              <div className={styles.playerLabel}>Player 2</div>
              <div className={styles.playerName}>
                <span className={styles.p2Dot} /> Rose
              </div>
              {variant === 'topple' && <div className={styles.playerScore}>{scores[1]} pts</div>}
            </div>
          </div>
          <div className={styles.gameStatusText}>{lastEvent}</div>
        </div>
      )}

      {/* Dice Console (Topple Mode Only) */}
      {variant === 'topple' && (
        <div className={styles.diceConsole}>
          {!hasRolled ? (
            <div className={styles.diceShowcase}>
              <span className={styles.rollPrompt}>
                {isMyTurn ? 'Roll the die to see where you can place!' : 'Waiting for opponent to roll...'}
              </span>
              <button
                type="button"
                className={styles.rollBtn}
                disabled={!isMyTurn || gameOver}
                onClick={rollDie}
              >
                🎰 Roll Die
              </button>
            </div>
          ) : (
            <div className={styles.diceShowcase}>
              <div className={styles.die}>{diceRoll}</div>
              <span className={styles.ringPrompt}>
                {diceRoll === 6
                  ? '🌟 Wild Roll! Place on ANY ring.'
                  : `Target: Place on Ring ${diceRoll}`}
              </span>
            </div>
          )}
        </div>
      )}

      <div className={styles.toppleArena}>
        {/* Dynamic tilting board wrapper */}
        <div className={styles.boardViewport}>
          <div
            className={`${styles.boardWrapper} ${
              gameOver && variant === 'topple' && gameState.winner !== playerNumber ? styles.shakingBoard : ''
            }`}
            style={{
              transform:
                variant === 'topple'
                  ? `rotateX(${25 - torqueY * 1.6}deg) rotateY(${torqueX * 1.6}deg)`
                  : 'rotateX(25deg)',
            }}
          >
            <div className={styles.board} aria-label="Smart Four Grid">
              {Array.from({ length: 25 }, (_, idx) => {
                const r = Math.floor(idx / 5);
                const c = idx % 5;
                const dist = Math.abs(r - 2) + Math.abs(c - 2);
                const ringIndex = dist + 1;
                const ringClass = styles[`ring${ringIndex}` as keyof typeof styles] || '';
                const allowed = isCellAllowed(idx);
                const stack = board[idx] || [];
                const isHovered = hoveredCell === idx;

                return (
                  <div
                    key={idx}
                    className={`${styles.cell} ${ringClass} ${allowed ? styles.allowedCell : ''} ${
                      !allowed && variant === 'topple' && hasRolled ? styles.cellDisabled : ''
                    }`}
                    onClick={() => allowed && placeToken(idx)}
                    onMouseEnter={() => allowed && setHoveredCell(idx)}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{
                      transform: isHovered && allowed ? 'translateZ(10px)' : 'none',
                    }}
                  >
                    {/* Visual Cylinder Stack */}
                    <div className={styles.cylinder}>
                      {stack.map((owner, h) => {
                        const isWinning = winningLine.includes(idx * 5 + h);
                        return (
                          <div
                            key={h}
                            className={`${styles.token} ${
                              owner === 0 ? styles.tokenP1 : styles.tokenP2
                            } ${isWinning ? styles.winningToken : ''}`}
                            style={{
                              // Pass height index as a custom property for translateZ offset
                              ['--index' as any]: h,
                            }}
                          />
                        );
                      })}

                      {/* Hover Preview Ghost Token */}
                      {isHovered && allowed && stack.length < 5 && (
                        <div
                          className={`${styles.ghostToken} ${
                            playerNumber === 0 ? styles.ghostP1 : styles.ghostP2
                          }`}
                          style={{
                            ['--index' as any]: stack.length,
                          }}
                        />
                      )}
                    </div>

                    {/* Column Stack Height Badge */}
                    {stack.length > 0 && (
                      <span className={styles.tokenCountBadge}>
                        {stack.length}/5
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bubble Level Dial Gauge (Topple Mode Only) */}
        {variant === 'topple' && (
          <div className={styles.dialWrapper}>
            <span className={styles.dialLabel}>Balance Level</span>
            <div className={styles.dialContainer}>
              <div className={styles.dialCrosshairH} />
              <div className={styles.dialCrosshairV} />
              <div className={styles.dialRingDanger} />
              <div className={styles.dialRingTarget} />
              <div
                className={`${styles.dialBubble} ${isDangerTilt ? styles.dangerBubble : ''}`}
                style={{
                  ['--torque-x' as any]: torqueX,
                  ['--torque-y' as any]: torqueY,
                }}
              />
            </div>
            <div className={`${styles.tiltValue} ${isDangerTilt ? styles.dangerTiltValue : ''}`}>
              Tilt: {tilt.toFixed(2)} / 11.5
            </div>
          </div>
        )}
      </div>

      {/* Legend showing concentric rings */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendRingSample} ${styles.ring1}`} />
          <span>Ring 1 (Center)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendRingSample} ${styles.ring2}`} />
          <span>Ring 2</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendRingSample} ${styles.ring3}`} />
          <span>Ring 3</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendRingSample} ${styles.ring4}`} />
          <span>Ring 4</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendRingSample} ${styles.ring5}`} />
          <span>Ring 5 (Corners)</span>
        </div>
      </div>
    </div>
  );
}

interface SmartFourGamePageProps {
  variant?: string;
}

export default function SmartFourGamePage({ variant = 'classic' }: SmartFourGamePageProps) {
  const normalizedVariant = normalizeVariant(variant);
  const config = VARIANT_CONFIG[normalizedVariant];

  return (
    <GameTemplate
      gameType="smart_four"
      variant={normalizedVariant}
      gameName={config.name}
      gameIcon={config.icon}
      accentColor={config.accent}
      winEmoji="🏆"
      winTitle={normalizedVariant === 'topple' ? 'Board Balanced!' : 'Four in a Row!'}
      loseTitle={normalizedVariant === 'topple' ? 'CRASHED!' : 'Line Complete'}
      drawTitle="Board Full"
    >
      {(props) => <SmartFourBoard {...props} variant={normalizedVariant} />}
    </GameTemplate>
  );
}
