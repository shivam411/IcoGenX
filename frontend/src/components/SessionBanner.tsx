'use client';

import { usePathname, useRouter } from 'next/navigation';
import { getGamePath, useGame } from '@/context/GameContext';
import styles from './SessionBanner.module.css';

function formatSeconds(seconds: number | null) {
  if (seconds === null) return null;
  return `00:${seconds.toString().padStart(2, '0')}`;
}

export default function SessionBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    connected,
    roomCode,
    gameType,
    variant,
    gameStarted,
    opponentDisconnected,
    savedSession,
    savedSessionSecondsLeft,
    opponentReconnectSecondsLeft,
    opponentName,
    joinSavedSession,
    clearSavedSession,
    leaveRoom,
  } = useGame();

  const currentGamePath = getGamePath(gameType, variant);
  const savedPath = savedSession?.path || currentGamePath || '/';
  const opponentLabel = opponentName || 'Opponent';

  const handleExitRoom = () => {
    leaveRoom();
    router.push('/');
  };

  if (opponentDisconnected && gameStarted) {
    const timer = formatSeconds(opponentReconnectSecondsLeft);
    return (
      <div className={styles.banner} role="status">
        <div className={styles.content}>
          <span className={styles.icon}>⏳</span>
          <div className={styles.textBlock}>
            <strong>{opponentLabel} left the room</strong>
            <span>{timer ? `Waiting for ${opponentLabel} to return: ${timer}` : `${opponentLabel} can try to rejoin from their last-game strip.`}</span>
          </div>
        </div>
        <div className={styles.actions}>
          {currentGamePath && pathname !== currentGamePath && (
            <button className="btn btn-primary btn-sm" onClick={() => router.push(currentGamePath)}>
              Open Game
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleExitRoom}>
            Exit Room
          </button>
        </div>
      </div>
    );
  }

  if (gameStarted && currentGamePath && pathname !== currentGamePath) {
    return (
      <div className={styles.banner} role="status">
        <div className={styles.content}>
          <span className={styles.icon}>🎮</span>
          <div className={styles.textBlock}>
            <strong>Active game in progress</strong>
            <span>Room {roomCode || savedSession?.roomCode || 'ready'} is still connected.</span>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => router.push(currentGamePath)}>
          Open Game
        </button>
      </div>
    );
  }

  if (!gameStarted && !roomCode && savedSession) {
    const timer = formatSeconds(savedSessionSecondsLeft);
    return (
      <div className={styles.banner} role="status">
        <div className={styles.content}>
          <span className={styles.icon}>↩</span>
          <div className={styles.textBlock}>
            <strong>Last game available</strong>
            <span>Room {savedSession.roomCode}{timer ? ` · return window ${timer}` : ''}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            className="btn btn-primary btn-sm"
            disabled={!connected}
            onClick={() => {
              joinSavedSession();
              router.push(savedPath);
            }}
          >
            Join
          </button>
          <button className="btn btn-ghost btn-sm" onClick={clearSavedSession}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return null;
}