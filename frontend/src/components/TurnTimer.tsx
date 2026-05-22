'use client';

import { useEffect, useState } from 'react';

import styles from './TurnTimer.module.css';

interface TurnTimerProps {
  active: boolean;
  startedAt: number | null;
}

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function TurnTimer({ active, startedAt }: TurnTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !startedAt) {
      return;
    }

    setNow(Date.now());
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active, startedAt]);

  if (!active || !startedAt) {
    return null;
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));

  return (
    <span className={styles.timer} aria-live="polite">
      <span className={styles.pulse} aria-hidden="true" />
      Your turn timer {formatElapsed(elapsedSeconds)}
    </span>
  );
}