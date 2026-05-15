'use client';

import Lobby from '@/components/Lobby';
import { useGame } from '@/context/GameContext';
import { useState, useEffect } from 'react';
import styles from './game.module.css';
import Link from 'next/link';

function TicTacToeBoard() {
  const { gameState, playerNumber, playerName, opponentName, sendAction, gameOver, winner } = useGame();
  const [tossPhase, setTossPhase] = useState<'waiting' | 'flipping' | 'result' | 'done'>('waiting');

  useEffect(() => {
    if (!gameState) return;
    if (gameState.coinTossed && tossPhase === 'waiting') {
      // Coin toss just triggered
      setTossPhase('flipping');
      setTimeout(() => setTossPhase('result'), 2000);
      setTimeout(() => setTossPhase('done'), 5000);
    }
  }, [gameState, tossPhase]);

  // Handle joining a game already in progress
  useEffect(() => {
    if (gameState && gameState.coinTossed && tossPhase === 'waiting') {
       // If we load in and it's already tossed, but we didn't see the transition (e.g. refresh)
       // actually the previous effect handles it by animating. If we want to skip animation on refresh,
       // it's a bit more complex. Let's just always animate if waiting -> coinTossed.
    }
  }, []);

  if (!gameState) return null;

  const board: (number | null)[] = gameState.board;
  const currentPlayer: number = gameState.currentPlayer;
  const fadingCells: (number | null)[] = gameState.fadingCells || [];
  const xPlayer: number | undefined = gameState.xPlayer;
  const isMyTurn = currentPlayer === playerNumber;
  const coinTossed: boolean = gameState.coinTossed;

  const p1Name = playerNumber === 0 ? (playerName || 'You') : (opponentName || 'Opponent');
  const p2Name = playerNumber === 1 ? (playerName || 'You') : (opponentName || 'Opponent');

  const handleClick = (cell: number) => {
    if (!isMyTurn || board[cell] !== null || gameOver) return;
    sendAction({ game: 'TicTacToe', cell });
  };

  const getCellClass = (idx: number) => {
    const classes = [styles.cell];
    if (board[idx] !== null) {
      if (board[idx] === xPlayer) classes.push(styles.cellX);
      else classes.push(styles.cellO);
    }
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

  // PRE-GAME TOSS UI
  if (!coinTossed || tossPhase !== 'done') {
    return (
      <div className={styles.gameWrapper}>
        <div className={styles.topBar}>
          <Link href="/" className={`btn btn-ghost btn-sm ${styles.endGameBtn}`}>🛑 End Game</Link>
        </div>
        
        <div className={`glass-card ${styles.winCard}`}>
          {tossPhase === 'waiting' && (
            <>
              <span className={styles.winEmoji}>🪙</span>
              <h2 className={styles.winTitle}>Coin Toss</h2>
              <p className={styles.winSub}>
                Who gets ❌ is decided by a coin toss! ❌ always goes first.
              </p>
              <div className={styles.winActions}>
                {playerNumber === 0 ? (
                  <button className="btn btn-primary" onClick={() => sendAction({ game: 'TicTacToeTossCoin' })}>
                    Toss Coin
                  </button>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>Waiting for creator to toss...</p>
                )}
              </div>
            </>
          )}

          {tossPhase === 'flipping' && (
            <>
              <span className={styles.winEmoji} style={{ animation: 'flip 0.5s ease-in-out infinite' }}>🪙</span>
              <h2 className={styles.winTitle}>Flipping...</h2>
            </>
          )}

          {tossPhase === 'result' && xPlayer !== undefined && (
            <>
              <span className={styles.winEmoji}>✨</span>
              <h2 className={styles.winTitle}>Result!</h2>
              <p className={styles.winSub}>
                <strong>{xPlayer === playerNumber ? (playerName || 'You') : opponentName}</strong> won the toss and gets ❌!
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gameWrapper}>
      <div className={styles.topBar}>
        <Link href="/" className={`btn btn-ghost btn-sm ${styles.endGameBtn}`}>🛑 End Game</Link>
      </div>

      <div className={styles.gameLayout}>
        <div className={styles.boardContainer}>
          <div className={styles.infoBar}>
            <span className={`${styles.playerTag} ${currentPlayer === 0 ? styles.playerTagActive : ''}`}>
              {0 === xPlayer ? '❌' : '⭕'} {p1Name}
            </span>
            <span className={`${styles.playerTag} ${currentPlayer === 1 ? styles.playerTagActive : ''}`}>
              {1 === xPlayer ? '❌' : '⭕'} {p2Name}
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
                {cell !== null ? (cell === xPlayer ? '✕' : '○') : ''}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.rulesContainer}>
          <h3 className={styles.rulesTitle}>📜 Rules</h3>
          <ul className={styles.rulesList}>
            <li><strong>Coin Toss:</strong> Who gets X or O is decided by a coin toss at the start. X always goes first!</li>
            <li><strong>Max 3 Symbols:</strong> You can only have a maximum of 3 symbols on the board.</li>
            <li><strong>Disappearing Act:</strong> When you place your 4th symbol, your very 1st symbol will disappear from the board!</li>
            <li><strong>Fading Hint:</strong> The symbol that is about to disappear will fade and pulse to warn you.</li>
            <li><strong>Win:</strong> Get 3 in a row before your symbols vanish to win!</li>
          </ul>
        </div>
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
              <Link href="/" className="btn btn-primary">Back to Menu</Link>
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
