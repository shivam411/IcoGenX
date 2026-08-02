/* frontend/src/app/games/dr-eureka/DrEurekaGame.tsx */
'use client';

import { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

interface Ball {
  id: number;
  color: string;
  text_color?: string;
  text_word?: string;
  number_val?: number;
}

function DrEurekaBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Reset local selection when round changes
  useEffect(() => {
    setSelectedTube(null);
  }, [gameState?.round_winner]);

  if (!gameState) return null;

  const variant = gameState.variant || 'classic';
  const playerTubes: Ball[][] = gameState.player_tubes || [];
  const targetTubes: string[][] = gameState.target_tubes || [];
  const stroopMatchType: string | null = gameState.stroop_match_type || null;
  const targetSequence: number[] = gameState.target_sequence || [];
  const scores: number[] = gameState.scores || [0, 0];
  const roundWinner: number | null = typeof gameState.round_winner === 'number' ? gameState.round_winner : null;
  const lastEvent: string | null = gameState.last_event || null;

  const mySeat = playerNumber === 99 ? 0 : (playerNumber ?? 0);
  const opponentSeat = 1 - mySeat;
  const opponentLabel = opponentName || 'Opponent';

  const myTubes = playerTubes.slice(mySeat * 3, mySeat * 3 + 3);
  const opponentTubes = playerTubes.slice(opponentSeat * 3, opponentSeat * 3 + 3);

  const showWarning = (msg: string) => {
    setWarningMsg(msg);
    const timer = setTimeout(() => setWarningMsg(null), 2000);
    return () => clearTimeout(timer);
  };

  const handleTubeClick = (localTubeIdx: number) => {
    if (gameOver) return;
    if (roundWinner !== null) return;

    const actualIdx = mySeat * 3 + localTubeIdx;
    const tubeBalls = playerTubes[actualIdx] || [];

    if (selectedTube === null) {
      if (tubeBalls.length === 0) {
        showWarning("Cannot select an empty tube!");
        return;
      }
      setSelectedTube(localTubeIdx);
    } else {
      if (selectedTube === localTubeIdx) {
        setSelectedTube(null);
      } else {
        const destIdx = mySeat * 3 + localTubeIdx;
        const destBalls = playerTubes[destIdx] || [];
        if (destBalls.length >= 4) {
          showWarning("Destination tube is full (max 4 balls)!");
          return;
        }

        sendAction({
          action: 'EurekaTransfer',
          from_tube: selectedTube,
          to_tube: localTubeIdx,
        });
        setSelectedTube(null);
      }
    }
  };

  const handleNextRound = () => {
    sendAction({
      action: 'EurekaNextRound',
    });
  };

  // Helper to map color string to ball CSS class
  const getBallColorClass = (color: string) => {
    switch (color) {
      case 'red': return styles.ballRed;
      case 'green': return styles.ballGreen;
      case 'purple': return styles.ballPurple;
      default: return styles.ballSteel;
    }
  };

  // Helper to resolve font color for Stroop mode
  const getStroopTextColorClass = (color?: string) => {
    switch (color) {
      case 'red': return styles.textValRed;
      case 'green': return styles.textValGreen;
      case 'purple': return styles.textValPurple;
      default: return '';
    }
  };

  // Helper to resolve Stroop match rule label
  const getStroopRuleLabel = () => {
    if (stroopMatchType === 'text_color') return 'Match Text Ink Color!';
    if (stroopMatchType === 'text_word') return 'Match Written Words!';
    return 'Match Ball Colors!';
  };

  return (
    <div className={styles.gameWrapper}>
      {/* 1. Status Banner */}
      <div className={styles.statusText}>
        {warningMsg ? (
          <span className={styles.warning}>{warningMsg}</span>
        ) : roundWinner !== null ? (
          <span className={styles.bonusTurn}>
            🎉 {roundWinner === mySeat ? 'You' : opponentLabel} solved the formula first!
          </span>
        ) : (
          <span className={styles.myTurn}>🧪 Race to complete the formula! Pour the balls.</span>
        )}
      </div>

      <div className={styles.playArea}>
        {/* 2. Challenge Card Column */}
        <div className={styles.cardColumn}>
          <div className={styles.challengeCard}>
            {variant === 'stroop' && (
              <div className={`${styles.cardBanner} ${styles.cardStroopBanner}`}>
                {getStroopRuleLabel()}
              </div>
            )}
            {variant === 'sequential' && (
              <div className={styles.cardBanner}>
                Target Stack
              </div>
            )}
            
            <div className={styles.cardTubes}>
              {variant === 'sequential' ? (
                // Single target tube showing numbered balls in sequence (bottom to top)
                <div className={styles.cardTube} style={{ height: '140px', width: '40px' }}>
                  {targetSequence.map((num, idx) => (
                    <div
                      key={idx}
                      className={`${styles.cardBall} ${styles.ballSteel}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        color: 'white',
                      }}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              ) : (
                // 3 card tubes showing target colors
                targetTubes.map((tubeColors, tIdx) => (
                  <div key={tIdx} className={styles.cardTube}>
                    {tubeColors.map((color, cIdx) => (
                      <div
                        key={cIdx}
                        className={styles.cardBall}
                        style={{
                          background: color === 'red' ? '#ef4444' : color === 'green' ? '#22c55e' : '#a855f7',
                        }}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mini Opponent Preview */}
          <div className={styles.opponentPreview}>
            <div className={styles.opponentPreviewTitle}>{opponentLabel}&apos;s Tubes</div>
            <div className={styles.opponentTubes}>
              {opponentTubes.map((tubeBalls, tIdx) => (
                <div key={tIdx} className={styles.opponentTube}>
                  {tubeBalls.map((ball, bIdx) => (
                    <div
                      key={bIdx}
                      className={styles.opponentBall}
                      style={{
                        background:
                          variant === 'sequential'
                            ? '#64748b'
                            : ball.color === 'red'
                            ? '#ef4444'
                            : ball.color === 'green'
                            ? '#22c55e'
                            : '#a855f7',
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Player Tubes Column */}
        <div className={styles.tubesColumn}>
          <div className={styles.tubesContainer}>
            {myTubes.map((tubeBalls, tIdx) => {
              const isSelected = selectedTube === tIdx;
              return (
                <div
                  key={tIdx}
                  className={`${styles.testTube} ${isSelected ? styles.testTubeSelected : ''}`}
                  onClick={() => handleTubeClick(tIdx)}
                >
                  {tubeBalls.map((ball) => {
                    const colorClass = getBallColorClass(ball.color);
                    const isStroop = variant === 'stroop';
                    const isSequential = variant === 'sequential';
                    
                    return (
                      <div
                        key={ball.id}
                        className={`${styles.ball} ${isSequential ? styles.ballSteel : colorClass}`}
                      >
                        {isStroop && (
                          <span className={`${styles.stroopText} ${getStroopTextColorClass(ball.text_color)}`}>
                            {ball.text_word}
                          </span>
                        )}
                        {isSequential && (
                          <span className={styles.ballNumber}>
                            {ball.number_val}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Scoreboard and Control Console */}
          <div className={styles.consoleCard}>
            <div className={styles.scoreBoard}>
              <div className={`${styles.scoreItem} ${styles.scoreP1}`}>
                <div className={styles.scoreLabel}>{allPlayerNames[0] || 'Player 1'}</div>
                <div className={styles.scoreVal}>{scores[0]} / 5</div>
              </div>
              <div className={`${styles.scoreItem} ${styles.scoreP2}`}>
                <div className={styles.scoreLabel}>{allPlayerNames[1] || 'Player 2'}</div>
                <div className={styles.scoreVal}>{scores[1]} / 5</div>
              </div>
            </div>

            {/* Next Round Button */}
            {roundWinner !== null && !gameOver && (
              <button className={styles.nextBtn} onClick={handleNextRound}>
                🧪 Reveal Next Card
              </button>
            )}
          </div>

          {/* Last event logs */}
          {lastEvent && <div className={styles.eventLog}>{lastEvent}</div>}
        </div>
      </div>
    </div>
  );
}

export default function DrEurekaGamePage({ variant = 'classic' }: { variant?: string }) {
  const isStroop = variant === 'stroop';
  const isSequential = variant === 'sequential';
  
  const displayName = isStroop
    ? 'Dr. Eureka (Stroop Royale)'
    : isSequential
    ? 'Dr. Eureka (Sequential Stacking)'
    : 'Dr. Eureka';

  return (
    <GameTemplate
      gameType="dr_eureka"
      variant={variant}
      gameName={displayName}
      gameIcon="dr-eureka"
      accentColor="#a855f7"
      winEmoji="🏆"
      winTitle="Head Scientist!"
      loseTitle="Trial Failed!"
      drawTitle="Draw!"
    >
      {(props) => <DrEurekaBoard {...props} />}
    </GameTemplate>
  );
}
