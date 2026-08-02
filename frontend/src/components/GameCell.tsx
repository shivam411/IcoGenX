/* frontend/src/components/GameCell.tsx */
'use client';

import React from 'react';
import styles from './GameCell.module.css';

interface GameCellProps {
  index: number;
  onClick?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  winning?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export default function GameCell({
  index,
  onClick,
  disabled = false,
  highlighted = false,
  dimmed = false,
  winning = false,
  className = '',
  style,
  children,
}: GameCellProps) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const cellClasses = [
    styles.cell,
    highlighted ? styles.highlighted : '',
    dimmed ? styles.dimmed : '',
    winning ? styles.winning : '',
    disabled ? styles.disabled : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cellClasses}
      style={style}
      aria-label={`Cell ${index + 1}`}
      aria-disabled={disabled}
    >
      {children}
    </div>
  );
}
