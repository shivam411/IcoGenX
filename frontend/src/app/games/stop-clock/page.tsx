'use client';

import { useState, useRef, useEffect } from 'react';
import GameFrame from '@/components/GameFrame';
import Lobby from '@/components/Lobby';
import { useGame } from '@/context/GameContext';
import styles from './game.module.css';
import Link from 'next/link';

const STOP_CLOCK_RULES = (
  <ul>
    <li>Both players ready up before the timer round starts.</li>
    <li>Start your timer, but it disappears after 3 seconds.</li>
    <li>Stop as close to 20.00 seconds as you can.</li>
    <li>The closest time wins the round.</li>
  </ul>
);

function StopClockBoard() {
  const { gameState, playerNumber, sendAction, gameOver, winner } = useGame();
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

  if (!gameState) return null;

  const bothReady: boolean = gameState.bothReady;
  const playerReady: boolean[] = gameState.playerReady;
  const p1Time: number | null = gameState.player1Time;
  const p2Time: number | null = gameState.player2Time;
  const myTime = playerNumber === 0 ? p1Time : p2Time;
  const opTime = playerNumber === 0 ? p2Time : p1Time;

  const handleReady = () => {
    sendAction({ game: 'StopClock', stopped_at_ms: 0 });
  };

  const handleStart = () => {
    setRunning(true);
    startTimeRef.current = Date.now();

    // Show timer for first 3 seconds, then hide
    setShowTimer(true);
    setTimeout(() => setShowTimer(false), 3000);

    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 50);
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

  // Not ready yet
  if (!bothReady) {
    return (
      <div className={styles.gameWrapper}>
        <GameFrame turnText="⏱️ Ready up, then stop as close to 20.00 seconds as possible." rulesTitle="Stop Clock Rules" rules={STOP_CLOCK_RULES}>
          <div className={styles.clockArea}>
            <h2 className={styles.clockTitle}>⏱️ The 20-Second Challenge</h2>
            <p className={styles.clockSub}>
              Start a timer and stop it at <strong>exactly 20 seconds</strong>. The timer hides after 3 seconds!
            </p>

            <div className={styles.readyStatus}>
              <span className={`${styles.readyBadge} ${playerReady[playerNumber || 0] ? styles.readyYes : styles.readyNo}`}>
                🎮 You: {playerReady[playerNumber || 0] ? 'Ready ✅' : 'Not Ready'}
              </span>
              <span className={`${styles.readyBadge} ${playerReady[1 - (playerNumber || 0)] ? styles.readyYes : styles.readyNo}`}>
                👤 Opponent: {playerReady[1 - (playerNumber || 0)] ? 'Ready ✅' : 'Not Ready'}
              </span>
            </div>

            {!playerReady[playerNumber || 0] && (
              <button className="btn btn-primary btn-lg" onClick={handleReady}>
                I&apos;m Ready!
              </button>
            )}

            {playerReady[playerNumber || 0] && (
              <p className={styles.waitingText}>Waiting for opponent...</p>
            )}
          </div>
        </GameFrame>
      </div>
    );
  }

  // Game in progress
  if (!stopped && myTime === null) {
    return (
      <div className={styles.gameWrapper}>
        <GameFrame turnText="⏱️ Stop at 20.00 seconds. The timer hides after 3 seconds." rulesTitle="Stop Clock Rules" rules={STOP_CLOCK_RULES}>
          <div className={styles.clockArea}>
            <h2 className={styles.clockTitle}>Stop at 20.00 seconds!</h2>

            <div className={`${styles.timerCircle} ${running ? styles.timerRunning : ''}`}>
              {running ? (
                showTimer ? (
                  <span className={styles.timerValue}>{formatTime(elapsed)}</span>
                ) : (
                  <span className={styles.timerHidden}>???</span>
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
        </GameFrame>
      </div>
    );
  }

  // Stopped, waiting for results or showing them
  return (
    <div className={styles.gameWrapper}>
      {!gameOver ? (
        <GameFrame turnText="⏳ You locked your time in. Waiting for the opponent to stop." rulesTitle="Stop Clock Rules" rules={STOP_CLOCK_RULES}>
          <div className={styles.clockArea}>
            <h2 className={styles.clockTitle}>You stopped at</h2>
            <div className={`${styles.timerCircle} ${styles.timerStopped}`}>
              <span className={styles.timerValue}>{(myTime || 0).toFixed(2)}s</span>
            </div>
            <p className={styles.waitingText}>Waiting for opponent to stop...</p>
          </div>
        </GameFrame>
      ) : (
        <div className={styles.winOverlay}>
          <div className={`glass-card ${styles.winCard}`}>
            <span className={styles.winEmoji}>
              {winner?.includes(`${(playerNumber || 0) + 1}`) ? '⏱️' : '😢'}
            </span>
            <h2 className={styles.winTitle}>
              {winner?.includes(`${(playerNumber || 0) + 1}`) ? 'Perfect Timing!' : 'So Close!'}
            </h2>

            <div className={styles.resultCards}>
              <div className={`glass-card ${styles.resultCard} ${
                winner?.includes(`${(playerNumber || 0) + 1}`) ? styles.resultWinner : ''
              }`}>
                <div className={styles.resultLabel}>🎮 You</div>
                <div className={styles.resultTime}>{(myTime || 0).toFixed(2)}s</div>
                <div className={styles.resultDiff}>
                  off by {Math.abs((myTime || 0) - 20).toFixed(2)}s
                </div>
              </div>
              <div className={`glass-card ${styles.resultCard} ${
                winner && !winner.includes(`${(playerNumber || 0) + 1}`) ? styles.resultWinner : ''
              }`}>
                <div className={styles.resultLabel}>👤 Opponent</div>
                <div className={styles.resultTime}>{(opTime || 0).toFixed(2)}s</div>
                <div className={styles.resultDiff}>
                  off by {Math.abs((opTime || 0) - 20).toFixed(2)}s
                </div>
              </div>
            </div>

            <Link href="/" className="btn btn-primary">Play Again</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StopClockPage() {
  return (
    <Lobby gameType="stop_clock" gameName="The 20-Second Challenge" gameIcon="⏱️" accentColor="#3b82f6">
      <StopClockBoard />
    </Lobby>
  );
}
