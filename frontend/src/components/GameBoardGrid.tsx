/* frontend/src/components/GameBoardGrid.tsx */
'use client';

import React from 'react';

interface GameBoardGridProps {
  rows: number;
  cols: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function GameBoardGrid({
  rows,
  cols,
  className,
  style,
  children,
}: GameBoardGridProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '10px',
        width: '100%',
        aspectRatio: `${cols} / ${rows}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
