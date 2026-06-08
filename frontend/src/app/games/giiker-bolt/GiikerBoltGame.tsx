// frontend/src/app/games/giiker-bolt/GiikerBoltGame.tsx
'use client';

import { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function GiikerBoard({
  gameState,
  playerNumber,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const sequence: number[] = gameState?.sequence || [];
  const inputIndex: number = gameState?.input_index || 0;
  const mode: string = gameState?.mode || 'display';
  const round: number = gameState?.round || 3;
  const lastEvent: string | null = gameState?.last_event || null;

  const [activeFlashIndex, setActiveFlashIndex] = useState<number | null>(null);
  const [isDisplaying, setIsDisplaying] = useState(false);
  const [localFlash, setLocalFlash] = useState<{ cell: number; kind: 'success' | 'fail' } | null>(null);

  // Playback sequence effect
  useEffect(() => {
    if (mode !== 'display' || sequence.length === 0) {
      setIsDisplaying(false);
      setActiveFlashIndex(null);
      return;
    }

    setIsDisplaying(true);
    let currentStep = 0;
    setActiveFlashIndex(null);

    const startTimeout = setTimeout(() => {
      const runStep = () => {
        if (currentStep < sequence.length) {
          const cellToFlash = sequence[currentStep];
          setActiveFlashIndex(cellToFlash);

          // Hold flash
          setTimeout(() => {
            setActiveFlashIndex(null);
            currentStep += 1;

            // Rest interval
            setTimeout(runStep, 200);
          }, 450);
        } else {
          setIsDisplaying(false);
          // Only the active player triggers transition to input
          if (isMyTurn && !gameOver) {
            sendAction({ action: 'SequenceFinished' });
          }
        }
      };
      runStep();
    }, 800);

    return () => {
      clearTimeout(startTimeout);
    };
  }, [sequence, mode, isMyTurn, gameOver]);

  // Click handler
  const handleCellClick = (cellIdx: number) => {
    if (mode !== 'input' || isDisplaying || !isMyTurn || gameOver) return;

    const expectedCell = sequence[inputIndex];
    if (cellIdx === expectedCell) {
      setLocalFlash({ cell: cellIdx, kind: 'success' });
      setTimeout(() => setLocalFlash(null), 180);
    } else {
      setLocalFlash({ cell: cellIdx, kind: 'fail' });
      setTimeout(() => setLocalFlash(null), 350);
    }

    sendAction({
      action: 'InputMove',
      cell: cellIdx,
    });
  };

  const getStatusClass = () => {
    if (mode === 'display') return styles.displayModeBar;
    return styles.inputModeBar;
  };

  return (
    <div className={styles.shell}>
      {/* Event banner / status bar */}
      <div className={`${styles.statusBar} ${getStatusClass()}`}>
        <span>{lastEvent || 'Watch the sequence, then repeat it.'}</span>
      </div>

      {/* Round Info */}
      <div className={styles.roundInfo}>
        <span>Memory Sequence Length:</span>
        <span className={styles.roundBadge}>{round} steps</span>
      </div>

      {/* Main 3x3 Button Grid */}
      <div className={styles.board} aria-label="Giiker Bolt Grid">
        {Array.from({ length: 9 }, (_, idx) => {
          const isFlashLit = activeFlashIndex === idx;
          const isLocalSuccess = localFlash?.cell === idx && localFlash?.kind === 'success';
          const isLocalFail = localFlash?.cell === idx && localFlash?.kind === 'fail';

          const cellClass = `${styles.cell} ${
            mode === 'input' && !isDisplaying && isMyTurn && !gameOver ? styles.cellActive : styles.cellDisabled
          } ${isFlashLit ? styles.lit : ''} ${isLocalSuccess ? styles.successFlash : ''} ${
            isLocalFail ? styles.failFlash : ''
          }`;

          return (
            <button
              key={idx}
              type="button"
              className={cellClass}
              disabled={mode !== 'input' || isDisplaying || !isMyTurn || gameOver}
              onClick={() => handleCellClick(idx)}
              aria-label={`Grid cell ${idx + 1}`}
            />
          );
        })}
      </div>

      {/* Visual dots progress indicator (especially useful since audio is not present) */}
      <div className={styles.playbackIndicator}>
        {sequence.map((_, index) => {
          let dotClass = styles.indicatorDot;
          if (mode === 'display') {
            const currentPlaybackStep = sequence.indexOf(activeFlashIndex ?? -1);
            if (activeFlashIndex !== null && index === currentPlaybackStep) {
              dotClass = `${styles.indicatorDot} ${styles.indicatorActive}`;
            }
          } else {
            // In input mode
            if (index < inputIndex) {
              dotClass = `${styles.indicatorDot} ${styles.indicatorSuccess}`;
            } else if (index === inputIndex && localFlash?.kind === 'fail') {
              dotClass = `${styles.indicatorDot} ${styles.indicatorFail}`;
            }
          }

          return <div key={index} className={dotClass} />;
        })}
      </div>
    </div>
  );
}

export default function GiikerBoltGamePage() {
  return (
    <GameTemplate
      gameType="giiker_bolt"
      gameName="Giiker Bolt Memory"
      gameIcon="giiker-bolt"
      accentColor="#ec4899"
      winEmoji="🧠"
      winTitle="Perfect Recall!"
      loseTitle="Memory Mismatch"
      drawTitle="Sequence Ended"
    >
      {(props) => <GiikerBoard {...props} />}
    </GameTemplate>
  );
}
