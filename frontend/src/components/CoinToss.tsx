'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './CoinToss.module.css';

interface CoinTossProps {
  /** Whether this player is the one who can initiate the toss */
  isCreator: boolean;
  /** Callback when the creator clicks "Toss Coin" */
  onToss: () => void;
  /** The result from the server: which player number got X (0 or 1), or null if not tossed yet */
  result: number | null;
  /** This player's number (0 or 1) */
  playerNumber: number;
  /** This player's name */
  playerName: string;
  /** Opponent's name */
  opponentName: string;
  /** Called when the full animation is done and we should transition to the game */
  onComplete: () => void;
}

type Phase = 'idle' | 'flipping' | 'landing' | 'result';

export default function CoinToss({
  isCreator,
  onToss,
  result,
  playerNumber,
  playerName,
  opponentName,
  onComplete,
}: CoinTossProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; tx: number; ty: number }[]>([]);

  // When result arrives from server, start the flip animation
  useEffect(() => {
    // Only run this ONCE when result becomes non-null
    if (result !== null && phase === 'idle') {
      setPhase('flipping');

      // Flip for 2 seconds
      const flipTimer = setTimeout(() => {
        setPhase((p) => p === 'flipping' ? 'landing' : p);
        spawnSparkles();
      }, 1500);

      // Show result text after landing
      const resultTimer = setTimeout(() => {
        setPhase((p) => p === 'landing' ? 'result' : p);
      }, 2000);

      // Auto-complete after showing result
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 4500);

      return () => {
        clearTimeout(flipTimer);
        clearTimeout(resultTimer);
        clearTimeout(completeTimer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]); // deliberately omitting phase and onComplete to prevent cleanup on phase change

  const spawnSparkles = useCallback(() => {
    const newSparkles = Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 60 + Math.random() * 60;
      return {
        id: Date.now() + i,
        x: 80 + Math.random() * 10 - 5,
        y: 80 + Math.random() * 10 - 5,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
      };
    });
    setSparkles(newSparkles);
    setTimeout(() => setSparkles([]), 1200);
  }, []);

  const getCoinClass = () => {
    switch (phase) {
      case 'idle': return `${styles.coin} ${styles.coinIdle}`;
      case 'flipping': return `${styles.coin} ${styles.coinFlipping}`;
      case 'landing':
      case 'result':
        // Land on X side (front) or O side (back)
        return `${styles.coin} ${result === playerNumber ? styles.coinResultX : styles.coinResultO}`;
      default: return styles.coin;
    }
  };

  const getShadowClass = () => {
    switch (phase) {
      case 'idle': return `${styles.coinShadow} ${styles.coinShadowIdle}`;
      case 'flipping': return `${styles.coinShadow} ${styles.coinShadowFlipping}`;
      default: return `${styles.coinShadow} ${styles.coinShadowResult}`;
    }
  };

  const xWinnerName = result !== null
    ? (result === playerNumber ? playerName : opponentName)
    : '';

  return (
    <div className={styles.container}>
      <div className={`glass-card ${styles.card}`}>
        {/* Sparkle effects */}
        <div className={styles.sparkles}>
          {sparkles.map((s) => (
            <span
              key={s.id}
              className={styles.sparkle}
              style={{
                left: `${s.x}px`,
                top: `${s.y}px`,
                '--tx': `${s.tx}px`,
                '--ty': `${s.ty}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* 3D Coin */}
        <div className={styles.scene}>
          <div className={getCoinClass()}>
            <div className={`${styles.coinFace} ${styles.coinFront}`}>
              <span className={styles.coinSymbol}>✕</span>
            </div>
            <div className={`${styles.coinFace} ${styles.coinBack}`}>
              <span className={styles.coinSymbol}>○</span>
            </div>
          </div>
        </div>
        <div className={getShadowClass()} />

        {/* Title */}
        <h2 className={styles.title}>
          {phase === 'flipping' ? 'Flipping...' : phase === 'result' || phase === 'landing' ? 'Result!' : 'Coin Toss'}
        </h2>

        {/* Phase-specific content */}
        {phase === 'idle' && (
          <>
            <p className={styles.subtitle}>
              A coin toss decides who plays as <strong>✕</strong> and who plays as <strong>○</strong>. 
              The <strong>✕</strong> player always goes first!
            </p>
            <div className={styles.actions}>
              {isCreator ? (
                <button
                  className={`btn btn-primary ${styles.tossBtn}`}
                  onClick={onToss}
                >
                  🪙 Toss Coin
                </button>
              ) : (
                <p className={styles.waitingText}>
                  ⏳ Waiting for room creator to toss the coin...
                </p>
              )}
            </div>
          </>
        )}

        {phase === 'flipping' && (
          <p className={styles.subtitle} style={{ marginBottom: 0 }}>
            The coin is in the air...
          </p>
        )}

        {(phase === 'landing' || phase === 'result') && result !== null && (
          <>
            <p className={styles.resultText}>
              <span className={styles.resultHighlight}>{xWinnerName}</span> won the toss!
            </p>
            <p className={styles.resultSub}>
              {xWinnerName} plays as ✕ and goes first. {result === playerNumber ? opponentName : playerName} plays as ○.
            </p>
          </>
        )}

        {/* Skip Animation Button */}
        {phase !== 'idle' && (
          <button 
            className={`btn btn-ghost btn-sm ${styles.skipBtn}`} 
            onClick={onComplete}
          >
            Skip Animation ⏭️
          </button>
        )}
      </div>
    </div>
  );
}
