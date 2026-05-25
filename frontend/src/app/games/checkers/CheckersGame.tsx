'use client';

import { useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

type CheckersVariant = 'classic' | 'anti' | 'zombie' | 'minefield' | 'vip' | 'portal';

interface CheckerPiece {
  owner: number;
  isKing: boolean;
  isVip: boolean;
}

const VARIANT_CONFIG: Record<CheckersVariant, { name: string; icon: string; accent: string }> = {
  classic: { name: 'Classic Checkers', icon: 'checkers-classic', accent: '#0369a1' },
  anti: { name: 'Anti-Checkers', icon: 'checkers-anti', accent: '#be123c' },
  zombie: { name: 'Zombie Checkers', icon: 'checkers-zombie', accent: '#15803d' },
  minefield: { name: 'Minefield Checkers', icon: 'checkers-minefield', accent: '#b45309' },
  vip: { name: 'VIP Checkers', icon: 'checkers-vip', accent: '#7c3aed' },
  portal: { name: 'Portal Checkers', icon: 'checkers-portal', accent: '#0891b2' },
};

function normalizeCheckersVariant(value: string | undefined): CheckersVariant {
  if (value === 'anti' || value === 'zombie' || value === 'minefield' || value === 'vip' || value === 'portal') {
    return value;
  }
  return 'classic';
}

function isDarkSquare(index: number) {
  return (Math.floor(index / 8) + (index % 8)) % 2 === 1;
}

function CheckersBoard({ gameState, playerNumber, isMyTurn, sendAction, gameOver, variant }: GameBoardProps & { variant: CheckersVariant }) {
  const [selectedFrom, setSelectedFrom] = useState<number | null>(null);
  const [selectedMines, setSelectedMines] = useState<number[]>([]);
  const [selectedVip, setSelectedVip] = useState<number | null>(null);

  const board: Array<CheckerPiece | null> = gameState?.board || Array(64).fill(null);
  const myMines: number[] = gameState?.myMines || [];
  const portals = gameState?.portals || {};
  const needsSetup = Boolean(gameState?.needsSetup);
  const mySetupComplete = Boolean(gameState?.mySetupComplete);
  const mustJumpFrom: number | null = typeof gameState?.mustJumpFrom === 'number' ? gameState.mustJumpFrom : null;
  const lastEvent = typeof gameState?.lastEvent === 'string' ? gameState.lastEvent : null;

  const submitSetup = () => {
    if (variant === 'minefield') {
      sendAction({ game: 'CheckersSecret', mines: selectedMines });
      return;
    }
    if (variant === 'vip' && selectedVip !== null) {
      sendAction({ game: 'CheckersSecret', vip: selectedVip });
    }
  };

  const handleSetupSquare = (index: number) => {
    if (!isDarkSquare(index)) return;
    if (variant === 'minefield') {
      setSelectedMines((current) => {
        if (current.includes(index)) return current.filter((item) => item !== index);
        if (current.length >= 3) return current;
        return [...current, index];
      });
      return;
    }
    if (variant === 'vip' && board[index]?.owner === playerNumber) {
      setSelectedVip(index);
    }
  };

  const handlePlaySquare = (index: number) => {
    if (gameOver || !isMyTurn || needsSetup) return;
    const piece = board[index];
    if (piece?.owner === playerNumber) {
      setSelectedFrom(index);
      return;
    }
    if (selectedFrom !== null && isDarkSquare(index)) {
      sendAction({ game: 'CheckersMove', from: selectedFrom, to: index });
      setSelectedFrom(null);
    }
  };

  const setupMode = needsSetup && !mySetupComplete && (variant === 'minefield' || variant === 'vip');
  const canSubmitSetup = variant === 'minefield' ? selectedMines.length > 0 : selectedVip !== null;

  return (
    <div className={styles.shell}>
      <div className={styles.statusBar}>
        <span>{needsSetup ? 'Setup phase' : isMyTurn ? 'Your move' : 'Opponent move'}</span>
        {mustJumpFrom !== null && <strong>Continue jump from square {mustJumpFrom + 1}</strong>}
        {lastEvent && <strong>{lastEvent}</strong>}
      </div>

      {setupMode && (
        <section className={styles.setupPanel}>
          <h2>{variant === 'minefield' ? 'Place Your Mines' : 'Choose Your VIP'}</h2>
          <p>
            {variant === 'minefield'
              ? 'Mark up to three dark squares. Opponent pieces that land there trigger an explosion.'
              : 'Pick one of your starting pieces. If it is captured, the opponent wins immediately.'}
          </p>
          <button className="btn btn-primary" type="button" onClick={submitSetup} disabled={!canSubmitSetup}>
            Lock Setup
          </button>
        </section>
      )}

      {needsSetup && mySetupComplete && (
        <section className={styles.setupPanel}>
          <h2>Setup Locked</h2>
          <p>Waiting for the other player to finish their secret setup.</p>
        </section>
      )}

      <div className={styles.board} aria-label="Checkers board">
        {board.map((piece, index) => {
          const mineSelected = selectedMines.includes(index) || myMines.includes(index);
          const portal = Object.prototype.hasOwnProperty.call(portals, String(index));
          const isSelected = selectedFrom === index || selectedVip === index;
          return (
            <button
              key={index}
              type="button"
              className={`${styles.square} ${isDarkSquare(index) ? styles.dark : styles.light} ${isSelected ? styles.selected : ''} ${mineSelected ? styles.mine : ''} ${portal ? styles.portal : ''}`}
              onClick={() => (setupMode ? handleSetupSquare(index) : handlePlaySquare(index))}
              aria-label={`Square ${index + 1}`}
            >
              {piece && (
                <span className={`${styles.piece} ${piece.owner === playerNumber ? styles.minePiece : styles.rivalPiece}`}>
                  {piece.isVip ? 'VIP' : piece.isKing ? 'K' : ''}
                </span>
              )}
              {!piece && mineSelected && <span className={styles.marker}>M</span>}
              {!piece && portal && <span className={styles.marker}>P</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface CheckersGamePageProps {
  variant?: string;
}

export default function CheckersGamePage({ variant = 'classic' }: CheckersGamePageProps) {
  const normalizedVariant = normalizeCheckersVariant(variant);
  const config = VARIANT_CONFIG[normalizedVariant];

  return (
    <GameTemplate
      gameType="checkers"
      variant={normalizedVariant}
      gameName={config.name}
      gameIcon={config.icon}
      accentColor={config.accent}
      winEmoji="WIN"
      winTitle="Board Captured"
      loseTitle="Board Lost"
    >
      {(props) => <CheckersBoard {...props} variant={normalizedVariant} />}
    </GameTemplate>
  );
}