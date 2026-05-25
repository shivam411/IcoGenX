/* frontend/src/app/games/stop-clock/page.tsx */
'use client';

import { useState, useRef, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function StopClockBoard({
  gameState,
  playerNumber,
  opponentName,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const bothReady: boolean = gameState.bothReady;
  const playerReady: boolean[] = gameState.playerReady || [false, false];
  const p1Time: number | null = gameState.player1Time;
  const p2Time: number | null = gameState.player2Time;
  const myTime = playerNumber === 0 ? p1Time : p2Time;
  const opponentLabel = opponentName || 'Opponent';

  const handleReady = () => {
    sendAction({ game: 'StopClock', stopped_at_ms: 0 });
  };

  const handleStart = () => {
    setRunning(true);
    startTimeRef.current = Date.now();
    setShowTimer(true);
    const hideTimer = setTimeout(() => setShowTimer(false), 3000);

    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 50);

    return () => {
      clearTimeout(hideTimer);
    };
  };

  const handleStop = () => {
    setRunning(false);
    setStopped(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const finalElapsed = Date.now() - startTimeRef.current;
    setElapsed(finalElapsed);
    sendAction({ game: 'StopClock', stopped_at_ms: finalElapsed });
  };

  const formatTime = (ms: number) => {
    const s = ms / 1000;
    return s.toFixed(2);
  };

  // 1. Not ready yet
  if (!bothReady) {
    return (
      <div className={styles.clockArea}>
        <h2 className={styles.clockTitle}>⏱️ The 20-Second Challenge</h2>
        <p className={styles.clockSub}>
          Start a timer and stop it at <strong>exactly 20 seconds</strong>. The timer hides after 3 seconds!
        </p>

        <div className={styles.readyStatus}>
          <span className={`${styles.readyBadge} ${playerReady[playerNumber] ? styles.readyYes : styles.readyNo}`}>
            🎮 You: {playerReady[playerNumber] ? 'Ready ✅' : 'Not Ready'}
          </span>
          <span className={`${styles.readyBadge} ${playerReady[1 - playerNumber] ? styles.readyYes : styles.readyNo}`}>
            👤 {opponentLabel}: {playerReady[1 - playerNumber] ? 'Ready ✅' : 'Not Ready'}
          </span>
        </div>

        {!playerReady[playerNumber] && (
          <button className="btn btn-primary btn-lg" onClick={handleReady}>
            I&apos;m Ready!
          </button>
        )}

        {playerReady[playerNumber] && (
          <p className={styles.waitingText}>Waiting for {opponentLabel}...</p>
        )}
      </div>
    );
  }

  // 2. Ready, running or stopping
  if (!stopped && myTime === null) {
    return (
      <div className={styles.clockArea}>
        <h2 className={styles.clockTitle}>Stop at 20.00 seconds!</h2>

        <div className={`${styles.timerCircle} ${running ? styles.timerRunning : ''}`}>
          {running ? (
            showTimer ? (
              <span className={styles.timerValue}>{formatTime(elapsed)}</span>
            ) : (
              <span className={styles.timerValue}>???</span>
            )
          ) : (
            <span className={styles.timerValue}>0.00</span>
          )}
          {running && !showTimer && (
            <span className={styles.timerLabel}>Timer hidden! Trust your gut.</span>
          )}
        </div>

        {!running ? (
          <button
            className={`${styles.bigButton} ${styles.startBtn}`}
            onClick={handleStart}
          >
            ▶ Start
          </button>
        ) : (
          <button
            className={`${styles.bigButton} ${styles.stopBtn}`}
            onClick={handleStop}
          >
            ⏹ Stop
          </button>
        )}
      </div>
    );
  }

  // 3. Stopped, waiting for opponent to finish
  return (
    <div className={styles.clockArea}>
      <h2 className={styles.clockTitle}>You stopped at</h2>
      <div className={`${styles.timerCircle} ${styles.timerStopped}`}>
        <span className={styles.timerValue}>{(myTime || 0).toFixed(2)}s</span>
      </div>
      <p className={styles.waitingText}>Waiting for {opponentLabel} to stop...</p>
    </div>
  );
}

function StopClockResults({ gameState, playerNumber, opponentName, winner }: GameBoardProps) {
  const p1Time: number = gameState.player1Time || 0;
  const p2Time: number = gameState.player2Time || 0;
  const myTime = playerNumber === 0 ? p1Time : p2Time;
  const opTime = playerNumber === 0 ? p2Time : p1Time;
  const opponentLabel = opponentName || 'Opponent';
  const isWinner = winner?.includes(`${playerNumber + 1}`);

  return (
    <div className={styles.resultCards} style={{ marginBottom: '20px' }}>
      <div className={`glass-card ${styles.resultCard} ${isWinner ? styles.resultWinner : ''}`}>
        <div className={styles.resultLabel}>🎮 You</div>
        <div className={styles.resultTime}>{myTime.toFixed(2)}s</div>
        <div className={styles.resultDiff}>
          off by {Math.abs(myTime - 20).toFixed(2)}s
        </div>
      </div>
      <div className={`glass-card ${styles.resultCard} ${winner && !isWinner ? styles.resultWinner : ''}`}>
        <div className={styles.resultLabel}>👤 {opponentLabel}</div>
        <div className={styles.resultTime}>{opTime.toFixed(2)}s</div>
        <div className={styles.resultDiff}>
          off by {Math.abs(opTime - 20).toFixed(2)}s
        </div>
      </div>
    </div>
  );
}

export default function StopClockPage() {
  return (
    <GameTemplate
      gameType="stop_clock"
      gameName="The 20-Second Challenge"
      gameIcon="stop-clock"
      accentColor="#3b82f6"
      winEmoji="⏱️"
      winTitle="Perfect Timing!"
      loseTitle="So Close!"
      gameOverChildren={(props) => <StopClockResults {...props} />}
    >
      {(props) => <StopClockBoard {...props} />}
    </GameTemplate>
  );
}
