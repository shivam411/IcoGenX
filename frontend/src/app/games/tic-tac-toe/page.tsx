'use client';

import Lobby from '@/components/Lobby';
import { useGame } from '@/context/GameContext';
import styles from './game.module.css';
import Link from 'next/link';

function TicTacToeBoard() {
  const { gameState, playerNumber, playerName, opponentName, sendAction, gameOver, winner } = useGame();

  if (!gameState) return null;

  const board: (number | null)[] = gameState.board;
  const currentPlayer: number = gameState.currentPlayer;
  const fadingCells: (number | null)[] = gameState.fadingCells || [];
  const isMyTurn = currentPlayer === playerNumber;

  const p1Name = playerNumber === 0 ? (playerName || 'You') : (opponentName || 'Opponent');
  const p2Name = playerNumber === 1 ? (playerName || 'You') : (opponentName || 'Opponent');

  const handleClick = (cell: number) => {
    if (!isMyTurn || board[cell] !== null || gameOver) return;
    sendAction({ game: 'TicTacToe', cell });
  };

  const getCellClass = (idx: number) => {
    const classes = [styles.cell];
    if (board[idx] === 0) classes.push(styles.cellX);
    if (board[idx] === 1) classes.push(styles.cellO);
    if (board[idx] !== null && !isMyTurn) classes.push(styles.cellDisabled);
    // Fading cell indicator
    if (fadingCells.includes(idx)) classes.push(styles.cellFading);
    return classes.join(' ');
  };

  const getWinnerName = (w: string | null) => {
    if (!w) return null;
    if (w === 'Player 1') return p1Name;
    if (w === 'Player 2') return p2Name;
    return w;
  };

  const winnerName = getWinnerName(winner);

  return (
    <div className={styles.gameWrapper}>
      <Link href="/" className={`btn btn-ghost btn-sm ${styles.backBtn}`}>← Back</Link>

      <div className={styles.infoBar}>
        <span className={`${styles.playerTag} ${currentPlayer === 0 ? styles.playerTagActive : ''}`}>
          ❌ {p1Name}
        </span>
        <span className={`${styles.playerTag} ${currentPlayer === 1 ? styles.playerTagActive : ''}`}>
          ⭕ {p2Name}
        </span>
      </div>

      <div className={styles.turnIndicator}>
        {isMyTurn ? '🎯 Your turn!' : '⏳ Opponent\'s turn...'}
      </div>

      <div className={styles.board}>
        {board.map((cell: number | null, idx: number) => (
          <div
            key={idx}
            className={getCellClass(idx)}
            onClick={() => handleClick(idx)}
          >
            {cell === 0 ? '✕' : cell === 1 ? '○' : ''}
          </div>
        ))}
      </div>

      {gameOver && (
        <div className={styles.winOverlay}>
          <div className={`glass-card ${styles.winCard}`}>
            <span className={styles.winEmoji}>
              {winnerName === playerName ? '🎉' : winnerName ? '😢' : '🤝'}
            </span>
            <h2 className={styles.winTitle}>
              {winnerName ? (winnerName === playerName ? 'You Win!' : 'You Lose!') : 'Draw!'}
            </h2>
            <p className={styles.winSub}>
              {winnerName ? `${winnerName} wins the game!` : 'No winner this time'}
            </p>
            <div className={styles.winActions}>
              <Link href="/" className="btn btn-primary">Play Again</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TicTacToePage() {
  return (
    <Lobby gameType="tic_tac_toe" gameName="Disappearing Tic-Tac-Toe" gameIcon="❌⭕" accentColor="#8b5cf6">
      <TicTacToeBoard />
    </Lobby>
  );
}
