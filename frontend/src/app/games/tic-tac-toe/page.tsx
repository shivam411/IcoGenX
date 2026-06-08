/* frontend/src/app/games/tic-tac-toe/page.tsx */
'use client';

import { useState, useEffect } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

function TicTacToeBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [tossPhase, setTossPhase] = useState<'waiting' | 'flipping' | 'result' | 'done'>('waiting');

  useEffect(() => {
    if (!gameState) return;
    if (gameState.coinTossed && tossPhase === 'waiting') {
      setTossPhase('flipping');
      const flipTimer = setTimeout(() => setTossPhase('result'), 2000);
      const doneTimer = setTimeout(() => setTossPhase('done'), 5000);
      return () => {
        clearTimeout(flipTimer);
        clearTimeout(doneTimer);
      };
    }
  }, [gameState, tossPhase]);

  const board: (number | null)[] = gameState.board;
  const fadingCells: (number | null)[] = gameState.fadingCells || [];
  const xPlayer: number | undefined = gameState.xPlayer;
  const coinTossed: boolean = gameState.coinTossed;
  const opponentLabel = opponentName || 'Opponent';

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
    if (fadingCells.includes(idx)) classes.push(styles.cellFading);
    return classes.join(' ');
  };

  // PRE-GAME TOSS UI
  if (!coinTossed || tossPhase !== 'done') {
    return (
      <div className={`glass-card ${styles.winCard}`} style={{ margin: '40px auto', maxWidth: '440px', padding: '40px 32px', textAlign: 'center' }}>
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
              <strong>{xPlayer === playerNumber ? (playerName || 'You') : opponentLabel}</strong> won the toss and gets ❌!
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={styles.boardContainer}>
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
  );
}

export default function TicTacToePage() {
  return (
    <GameTemplate
      gameType="tic_tac_toe"
      gameName="Disappearing Tic-Tac-Toe"
      gameIcon="tic-tac-toe"
      accentColor="#8b5cf6"
    >
      {(props) => <TicTacToeBoard {...props} />}
    </GameTemplate>
  );
}
