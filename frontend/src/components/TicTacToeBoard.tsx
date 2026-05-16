'use client';

import { useGame } from '@/context/GameContext';
import styles from '../app/games/tic-tac-toe/game.module.css';
import Link from 'next/link';
import CoinToss from '@/components/CoinToss';
import { useState } from 'react';

import { useRouter } from 'next/navigation';

interface TicTacToeBoardProps {
  variantTitle: string;
  rules: React.ReactNode;
}

export default function TicTacToeBoard({ variantTitle, rules }: TicTacToeBoardProps) {
  const router = useRouter();
  const { 
    gameState, playerNumber, playerName, opponentName, sendAction, 
    gameOver, winner, scores, requestPlayAgain, 
    playAgainRequested, opponentPlayAgainRequested, leaveRoom
  } = useGame();
  
  const [tossComplete, setTossComplete] = useState(false);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  if (!gameState) return null;

  const board: (number | null)[] = gameState.board;
  const currentPlayer: number = gameState.currentPlayer;
  const fadingCells: (number | null)[] = gameState.fadingCells || [];
  const xPlayer: number | undefined = gameState.xPlayer;
  const isMyTurn = currentPlayer === playerNumber;
  const coinTossed: boolean = gameState.coinTossed;
  const jokerCell: number | undefined = gameState.jokerCell;

  const p1Name = playerNumber === 0 ? (playerName || 'You') : (opponentName || 'Opponent');
  const p2Name = playerNumber === 1 ? (playerName || 'You') : (opponentName || 'Opponent');

  const handleClick = (cell: number) => {
    if (gameOver) return;
    if (!isMyTurn) {
      setWarningMsg("Not your turn! Waiting for opponent.");
      setTimeout(() => setWarningMsg(null), 2000);
      return;
    }
    if (board[cell] !== null) return;

    sendAction({ game: 'TicTacToe', cell });
  };

  const handleExit = () => {
    leaveRoom();
    router.push('/');
  };

  const getCellClass = (idx: number) => {
    const classes = [styles.cell];
    
    // Joker styling
    if (jokerCell === idx) {
      classes.push(styles.cellJoker);
    }

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

  // If coin hasn't been tossed or animation is running, show CoinToss
  if (!coinTossed || !tossComplete) {
    // If we reconnect to an already running game where the coin was tossed, fast forward
    if (coinTossed && !tossComplete && (board.some(c => c !== null) || gameOver)) {
      setTossComplete(true);
    } else {
      return (
        <CoinToss
          isCreator={playerNumber === 0}
          onToss={() => sendAction({ game: 'TicTacToeTossCoin' })}
          result={xPlayer !== undefined ? xPlayer : null}
          playerNumber={playerNumber || 0}
          playerName={playerName || 'You'}
          opponentName={opponentName || 'Opponent'}
          onComplete={() => setTossComplete(true)}
        />
      );
    }
  }

  // Determine score display order
  const myScore = playerNumber === 0 ? scores[0] : scores[1];
  const oppScore = playerNumber === 0 ? scores[1] : scores[0];

  return (
    <div className={styles.gameWrapper}>
      <div className={styles.topBar}>
        <button onClick={handleExit} className={`btn btn-ghost btn-sm ${styles.endGameBtn}`}>🛑 Exit</button>
      </div>

      <div className={styles.gameLayout}>
        <div className={styles.boardContainer}>
          
          <div className={styles.scoreBoard}>
            <div className={styles.scorePlayer}>
              <span className={styles.scoreName}>{playerName}</span>
              <span className={styles.scoreValue}>{myScore}</span>
            </div>
            <div className={styles.scoreDivider}>—</div>
            <div className={styles.scorePlayer}>
              <span className={styles.scoreValue}>{oppScore}</span>
              <span className={styles.scoreName}>{opponentName}</span>
            </div>
          </div>

          <div className={styles.infoBar}>
            <span className={`${styles.playerTag} ${currentPlayer === 0 ? styles.playerTagActive : ''}`}>
              {0 === xPlayer ? '❌' : '⭕'} {p1Name}
            </span>
            <span className={`${styles.playerTag} ${currentPlayer === 1 ? styles.playerTagActive : ''}`}>
              {1 === xPlayer ? '❌' : '⭕'} {p2Name}
            </span>
          </div>

          <div className={styles.turnIndicator}>
            {warningMsg ? (
              <span className={styles.warningText}>{warningMsg}</span>
            ) : isMyTurn ? (
              '🎯 Your turn!'
            ) : (
              '⏳ Opponent\'s turn...'
            )}
          </div>

          <div className={styles.board}>
            {board.map((cell: number | null, idx: number) => (
              <div
                key={idx}
                className={getCellClass(idx)}
                onClick={() => handleClick(idx)}
              >
                {cell !== null ? (cell === xPlayer ? '✕' : '○') : (jokerCell === idx ? '🃏' : '')}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.rulesContainer}>
          <h3 className={styles.rulesTitle}>{variantTitle}</h3>
          {rules}
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
              {winnerName ? `${winnerName} won this round!` : "It's a tie!"}
            </p>
            
            <div className={styles.playAgainStatus}>
              {playAgainRequested ? (
                <p>Waiting for opponent to accept...</p>
              ) : opponentPlayAgainRequested ? (
                <p>{opponentName} wants to play again!</p>
              ) : null}
            </div>

            <div className={styles.winActions}>
              {!playAgainRequested && (
                <button 
                  className="btn btn-primary" 
                  onClick={requestPlayAgain}
                >
                  🔄 Play Again
                </button>
              )}
              <button onClick={handleExit} className="btn btn-ghost">Change Game</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
