'use client';

import { useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

type DropFourVariant = 'classic' | 'wrecking-ball' | 'popout' | 'gravity-flip' | 'battleship-drop' | 'heavy-token';
type PieceMode = 'normal' | 'wrecking-ball' | 'heavy';

interface DropFourPiece {
  owner: number;
  kind: PieceMode;
}

interface HiddenCell {
  hidden: true;
}

const VARIANT_CONFIG: Record<DropFourVariant, { name: string; icon: string; accent: string }> = {
  classic: { name: 'Drop Four', icon: 'drop-four-classic', accent: '#0ea5e9' },
  'wrecking-ball': { name: 'Drop Four: Wrecking Ball', icon: 'drop-four-wrecking-ball', accent: '#dc2626' },
  popout: { name: 'Drop Four: PopOut', icon: 'drop-four-popout', accent: '#ea580c' },
  'gravity-flip': { name: 'Drop Four: Gravity Flip', icon: 'drop-four-gravity-flip', accent: '#2563eb' },
  'battleship-drop': { name: 'Drop Four: Battleship Drop', icon: 'drop-four-battleship-drop', accent: '#0f766e' },
  'heavy-token': { name: 'Drop Four: Heavy Token', icon: 'drop-four-heavy-token', accent: '#4b5563' },
};

function normalizeDropFourVariant(value: string | undefined): DropFourVariant {
  if (value === 'wrecking-ball' || value === 'popout' || value === 'gravity-flip' || value === 'battleship-drop' || value === 'heavy-token') {
    return value;
  }
  return 'classic';
}

function isHiddenCell(cell: DropFourPiece | HiddenCell | null): cell is HiddenCell {
  return Boolean(cell && 'hidden' in cell);
}

function DropFourBoard({ gameState, playerNumber, isMyTurn, sendAction, gameOver, variant }: GameBoardProps & { variant: DropFourVariant }) {
  const [pieceMode, setPieceMode] = useState<PieceMode>('normal');
  const board: Array<DropFourPiece | HiddenCell | null> = gameState?.board || Array(42).fill(null);
  const cols: number = gameState?.cols || 7;
  const rows: number = gameState?.rows || 6;
  const winningLine: number[] = gameState?.winningLine || [];
  const flipped = Boolean(gameState?.flipped);
  const lastEvent = typeof gameState?.lastEvent === 'string' ? gameState.lastEvent : null;
  const wreckingAvailable = Boolean(gameState?.wreckingBallAvailable?.[playerNumber]);
  const heavyAvailable = Boolean(gameState?.heavyAvailable?.[playerNumber]);
  const flipAvailable = Boolean(gameState?.flipAvailable?.[playerNumber]);

  const dropInColumn = (column: number) => {
    if (!isMyTurn || gameOver) return;
    sendAction({ game: 'DropFourMove', column, piece: pieceMode });
    setPieceMode('normal');
  };

  const popOut = (column: number) => {
    if (!isMyTurn || gameOver) return;
    sendAction({ game: 'DropFourPopOut', column });
  };

  const flipGravity = () => {
    if (!isMyTurn || gameOver) return;
    sendAction({ game: 'DropFourFlip' });
  };

  return (
    <div className={styles.shell}>
      <div className={styles.statusBar}>
        <span>{flipped ? 'Gravity: inverted' : 'Gravity: normal'}</span>
        {lastEvent && <strong>{lastEvent}</strong>}
      </div>

      <div className={styles.controls}>
        {variant === 'wrecking-ball' && (
          <button
            type="button"
            className={`${styles.powerBtn} ${pieceMode === 'wrecking-ball' ? styles.activePower : ''}`}
            disabled={!isMyTurn || !wreckingAvailable || gameOver}
            onClick={() => setPieceMode(pieceMode === 'wrecking-ball' ? 'normal' : 'wrecking-ball')}
          >
            Wrecking Ball
          </button>
        )}
        {variant === 'heavy-token' && (
          <button
            type="button"
            className={`${styles.powerBtn} ${pieceMode === 'heavy' ? styles.activePower : ''}`}
            disabled={!isMyTurn || !heavyAvailable || gameOver}
            onClick={() => setPieceMode(pieceMode === 'heavy' ? 'normal' : 'heavy')}
          >
            Heavy Token
          </button>
        )}
        {variant === 'gravity-flip' && (
          <button type="button" className={styles.powerBtn} disabled={!isMyTurn || !flipAvailable || gameOver} onClick={flipGravity}>
            Flip Gravity
          </button>
        )}
      </div>

      <div className={styles.columnControls} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }, (_, column) => (
          <button key={column} type="button" className={styles.columnBtn} disabled={!isMyTurn || gameOver} onClick={() => dropInColumn(column)}>
            Drop
          </button>
        ))}
      </div>

      <div className={styles.board} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-label="Drop Four board">
        {board.map((cell, index) => {
          const isWinning = winningLine.includes(index);
          const hidden = isHiddenCell(cell);
          const piece = hidden ? null : cell;
          return (
            <div key={index} className={`${styles.cell} ${hidden ? styles.hidden : ''} ${isWinning ? styles.winning : ''}`}>
              {piece && (
                <span className={`${styles.token} ${piece.owner === playerNumber ? styles.mine : styles.rival} ${styles[piece.kind.replace('-', '') as keyof typeof styles] || ''}`}>
                  {piece.kind === 'wrecking-ball' ? 'W' : piece.kind === 'heavy' ? 'H' : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {variant === 'popout' && (
        <div className={styles.columnControls} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }, (_, column) => (
            <button key={column} type="button" className={styles.popBtn} disabled={!isMyTurn || gameOver} onClick={() => popOut(column)}>
              Pop
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface DropFourGamePageProps {
  variant?: string;
}

export default function DropFourGamePage({ variant = 'classic' }: DropFourGamePageProps) {
  const normalizedVariant = normalizeDropFourVariant(variant);
  const config = VARIANT_CONFIG[normalizedVariant];

  return (
    <GameTemplate
      gameType="drop_four"
      variant={normalizedVariant}
      gameName={config.name}
      gameIcon={config.icon}
      accentColor={config.accent}
      winEmoji="FOUR"
      winTitle="Four Connected"
      loseTitle="Line Broken"
      drawTitle="Grid Filled"
    >
      {(props) => <DropFourBoard {...props} variant={normalizedVariant} />}
    </GameTemplate>
  );
}