'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import styles from './Lobby.module.css';

interface LobbyProps {
  gameType: string;
  gameName: string;
  gameIcon: string;
  accentColor: string;
  children: React.ReactNode;
}

export default function Lobby({ gameType, gameName, gameIcon, accentColor, children }: LobbyProps) {
  const { connected, roomCode, gameStarted, playerNumber, opponentDisconnected, error, createRoom, joinRoom, playerName } = useGame();
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const router = useRouter();

  const handleCreate = () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    createRoom(gameType, name.trim());
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    if (joinCode) joinRoom(joinCode, name.trim());
  };

  if (!connected) {
    return (
      <div className={styles.container}>
        <div className={styles.connectingBox}>
          <div className={styles.spinner} />
          <p>Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (opponentDisconnected) {
    return (
      <div className={styles.container}>
        <div className={`glass-card ${styles.disconnectBox}`}>
          <span className={styles.disconnectIcon}>😔</span>
          <h2>Opponent Disconnected</h2>
          <p>Your opponent has left the game.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (gameStarted) {
    return <>{children}</>;
  }

  if (roomCode) {
    return (
      <div className={styles.container}>
        <div className={`glass-card ${styles.waitingBox}`}>
          <div className={styles.waitingPulse} style={{ '--accent': accentColor } as React.CSSProperties}>
            <span className={styles.gameIconLarge}>{gameIcon}</span>
          </div>
          <h2 className={styles.waitingTitle}>Waiting for Opponent</h2>
          <p className={styles.waitingSub}>Share this code with a friend</p>
          <div className={styles.codeDisplay}>
            <span className={styles.codeText}>{roomCode}</span>
            <button
              className={`btn btn-sm btn-ghost ${styles.copyBtn}`}
              onClick={() => navigator.clipboard.writeText(roomCode)}
            >
              📋 Copy
            </button>
          </div>
          <div className={styles.dotLoader}>
            <span /><span /><span />
          </div>
          <p className={styles.playerTag}>
            You are {playerName || 'Player'} {playerNumber !== null ? `(P${playerNumber + 1})` : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`glass-card ${styles.lobbyCard}`}>
        <button 
          className={styles.backBtn} 
          onClick={() => router.push('/')}
          aria-label="Back to home"
        >
          ← Back
        </button>
        <div className={styles.header}>
          <span className={styles.gameIconLarge}>{gameIcon}</span>
          <h1 className={styles.title}>{gameName}</h1>
        </div>

        <div className={styles.nameSection}>
          <label className={styles.nameLabel}>Your Name</label>
          <input
            className="input"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameError(false);
            }}
            maxLength={15}
            style={nameError ? { borderColor: 'var(--accent-red, #ef4444)' } : {}}
          />
          {nameError && (
            <div style={{ color: 'var(--accent-red, #ef4444)', fontSize: '0.8rem', marginTop: '6px', textAlign: 'left' }}>
              ⚠️ Please enter your name first
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleCreate}
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}
          >
            🎮 Create Room
          </button>

          <div className={styles.divider}>
            <span>or join a room</span>
          </div>

          <div className={styles.joinRow}>
            <input
              className="input"
              placeholder="Enter room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button
              className="btn btn-ghost"
              onClick={handleJoin}
              disabled={!joinCode}
            >
              Join
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}
