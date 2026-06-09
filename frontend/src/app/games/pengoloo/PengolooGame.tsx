// frontend/src/app/games/pengoloo/PengolooGame.tsx
'use client';

import React from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

const COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  hidden: '#475569',
};

interface DieProps {
  color: string;
  isRolling?: boolean;
}

function ColorDie({ color, isRolling }: DieProps) {
  const bg = COLOR_MAP[color] || '#475569';
  return (
    <div
      className={`${styles.die} ${isRolling ? styles.dieRolling : ''}`}
      style={{ backgroundColor: bg }}
    >
      <div className={styles.dieFace}>
        <div className={styles.dieDot} />
      </div>
    </div>
  );
}

function PengolooBoard({
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

  const eggs: string[] = gameState.penguin_eggs || [];
  const claimed: (number | null)[] = gameState.penguin_claimed || Array(12).fill(null);
  const diceRolled: string[] = gameState.dice_rolled || ['red', 'red'];
  const hasRolled: boolean = gameState.has_rolled || false;
  const revealed: number[] = gameState.revealed || [];
  const scores: number[] = gameState.scores || [0, 0];
  const currentPlayer: number = gameState.currentPlayer ?? 0;
  const lastEvent = gameState.last_event || 'Roll to start!';

  const playerIdx = playerNumber;
  const oppIdx = 1 - playerIdx;

  const isP1 = playerIdx === 0;
  const myColor = isP1 ? '#22d3ee' : '#fb7185';
  const oppColor = isP1 ? '#fb7185' : '#22d3ee';

  const myShelfIndex = playerIdx;
  const oppShelfIndex = oppIdx;

  // Filter claimed penguins for shelves
  const p1ClaimedEggs = eggs
    .map((egg, idx) => ({ egg, idx, owner: claimed[idx] }))
    .filter((p) => p.owner === 0);

  const p2ClaimedEggs = eggs
    .map((egg, idx) => ({ egg, idx, owner: claimed[idx] }))
    .filter((p) => p.owner === 1);

  const myClaimed = playerIdx === 0 ? p1ClaimedEggs : p2ClaimedEggs;
  const oppClaimed = playerIdx === 0 ? p2ClaimedEggs : p1ClaimedEggs;

  const handleRollClick = () => {
    if (!isMyTurn || hasRolled || gameOver) return;
    sendAction({ action: 'RollDice' });
  };

  const handlePenguinClick = (idx: number) => {
    if (!isMyTurn || !hasRolled || gameOver) return;
    if (claimed[idx] !== null) return;
    if (revealed.includes(idx)) return;
    if (revealed.length >= 2) return;

    sendAction({
      action: 'LiftPenguin',
      index: idx,
    });
  };

  return (
    <div className={styles.boardShell}>
      {/* Top Banner Status */}
      <div className={styles.statusBar}>
        <span className={styles.statusText}>{lastEvent}</span>
      </div>

      {/* Main Playfield Split */}
      <div className={styles.gameArea}>
        {/* Left Side: My Iceberg Shelf */}
        <div className={styles.icebergShelf} style={{ borderColor: myColor }}>
          <div className={styles.shelfHeader} style={{ color: myColor }}>
            <h3>Your Iceberg</h3>
            <span className={styles.scoreBadge}>{scores[playerIdx]} / 6</span>
          </div>
          <div className={styles.shelfGrid}>
            {Array.from({ length: 6 }).map((_, slotIdx) => {
              const claimedPenguin = myClaimed[slotIdx];
              return (
                <div key={`my-shelf-${slotIdx}`} className={styles.shelfSlot}>
                  {claimedPenguin ? (
                    <div className={styles.claimedPenguinWrapper}>
                      <div className={styles.penguinBodyClaimed}>🐧</div>
                      <div
                        className={styles.eggMini}
                        style={{ backgroundColor: COLOR_MAP[claimedPenguin.egg] }}
                      />
                    </div>
                  ) : (
                    <div className={styles.shelfSlotPlaceholder}>?</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Main 12-Penguin Board & Dice console */}
        <div className={styles.boardCenter}>
          <div className={styles.penguinGrid}>
            {Array.from({ length: 12 }).map((_, idx) => {
              const owner = claimed[idx];
              const isClaimed = owner !== null;
              const isRevealed = revealed.includes(idx);
              const eggColor = eggs[idx];

              if (isClaimed) {
                return (
                  <div key={`penguin-slot-${idx}`} className={styles.emptySlot}>
                    <div className={styles.claimedMarker}>Claimed</div>
                  </div>
                );
              }

              const canLift = isMyTurn && hasRolled && revealed.length < 2 && !isRevealed;

              return (
                <div
                  key={`penguin-slot-${idx}`}
                  className={`
                    ${styles.penguinSlot} 
                    ${isRevealed ? styles.penguinSlotLifted : ''} 
                    ${canLift ? styles.penguinSlotActionable : ''}
                  `}
                  onClick={() => handlePenguinClick(idx)}
                >
                  <div className={styles.penguinContainer}>
                    <div className={styles.penguinAvatar}>🐧</div>
                    <div
                      className={styles.eggSphere}
                      style={{
                        backgroundColor: COLOR_MAP[isRevealed ? eggColor : 'hidden'],
                        boxShadow: isRevealed
                          ? `0 0 15px ${COLOR_MAP[eggColor]}`
                          : 'none',
                      }}
                    />
                  </div>
                  <span className={styles.penguinIndex}>{idx + 1}</span>
                </div>
              );
            })}
          </div>

          {/* Dice & Controls Tray */}
          <div className={styles.controlsTray}>
            <div className={styles.diceDisplay}>
              {hasRolled ? (
                <>
                  <ColorDie color={diceRolled[0]} />
                  <ColorDie color={diceRolled[1]} />
                </>
              ) : (
                <>
                  <div className={styles.diePlaceholder}>🎲</div>
                  <div className={styles.diePlaceholder}>🎲</div>
                </>
              )}
            </div>

            {isMyTurn && !hasRolled && !gameOver ? (
              <button onClick={handleRollClick} className={styles.rollBtn}>
                ROLL DICE
              </button>
            ) : (
              <div className={styles.rollStatusText}>
                {gameOver
                  ? 'Game Over'
                  : isMyTurn
                  ? 'Lift 2 Penguins!'
                  : `Waiting for ${allPlayerNames[currentPlayer] || opponentName || 'Opponent'}`}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Opponent Iceberg Shelf */}
        <div className={styles.icebergShelf} style={{ borderColor: oppColor }}>
          <div className={styles.shelfHeader} style={{ color: oppColor }}>
            <h3>{allPlayerNames[oppIdx] || opponentName || 'Opponent'}'s Iceberg</h3>
            <span className={styles.scoreBadge}>{scores[oppIdx]} / 6</span>
          </div>
          <div className={styles.shelfGrid}>
            {Array.from({ length: 6 }).map((_, slotIdx) => {
              const claimedPenguin = oppClaimed[slotIdx];
              return (
                <div key={`opp-shelf-${slotIdx}`} className={styles.shelfSlot}>
                  {claimedPenguin ? (
                    <div className={styles.claimedPenguinWrapper}>
                      <div className={styles.penguinBodyClaimed}>🐧</div>
                      <div
                        className={styles.eggMini}
                        style={{ backgroundColor: COLOR_MAP[claimedPenguin.egg] }}
                      />
                    </div>
                  ) : (
                    <div className={styles.shelfSlotPlaceholder}>?</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PengolooGamePage() {
  return (
    <GameTemplate
      gameType="pengoloo"
      gameName="Pengoloo"
      gameIcon="pengoloo"
      accentColor="#3b82f6"
      winEmoji="🐧"
      winTitle="Penguin Master!"
      loseTitle="All Claimed"
      drawTitle="Iceberg Full"
    >
      {(props) => <PengolooBoard {...props} />}
    </GameTemplate>
  );
}
