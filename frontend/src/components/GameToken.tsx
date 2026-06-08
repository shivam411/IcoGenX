/* frontend/src/components/GameToken.tsx */
'use client';

import React from 'react';
import styles from './GameToken.module.css';

interface GameTokenProps {
  player: number; // 0 or 1
  type?: 'circle' | 'cross' | 'sphere';
  preview?: boolean; // True if rendering as transparent hover preview
  className?: string;
  style?: React.CSSProperties;
}

export default function GameToken({
  player,
  type = 'sphere',
  preview = false,
  className = '',
  style,
}: GameTokenProps) {
  const tokenClasses = [
    styles.token,
    player === 0 ? styles.playerOne : styles.playerTwo,
    preview ? styles.preview : '',
    styles[type],
    className,
  ].filter(Boolean).join(' ');

  const renderIcon = () => {
    if (type === 'cross') {
      return (
        <svg viewBox="0 0 24 24" className={styles.svgIcon}>
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            fill="currentColor"
          />
        </svg>
      );
    }
    if (type === 'circle') {
      return (
        <svg viewBox="0 0 24 24" className={styles.svgIcon}>
          <circle
            cx="12"
            cy="12"
            r="8"
            stroke="currentColor"
            strokeWidth="3.5"
            fill="none"
          />
        </svg>
      );
    }
    return <div className={styles.sphereCore} />;
  };

  return (
    <div className={tokenClasses} style={style}>
      {renderIcon()}
    </div>
  );
}
