'use client';

import { useGame } from '@/context/GameContext';
import styles from '../app/games/tic-tac-toe/game.module.css';
import CoinToss from '@/components/CoinToss';
import { useState } from 'react';

import { useRouter } from 'next/navigation';

interface TicTacToeBoardProps {
  variantTitle: string;
  rules: React.ReactNode;
}

type GobbletPiece = {
  player: number;
  size: number;
};

const sizeLabels = ['S', 'M', 'L'];

export default function TicTacToeBoard({ variantTitle, rules }: TicTacToeBoardProps) {
  const router = useRouter();
  const { 
    gameState, playerNumber, playerName, opponentName, sendAction, 
    gameOver, winner, scores, requestPlayAgain, 
    playAgainRequested, opponentPlayAgainRequested, leaveRoom
  } = useGame();
  
  const [tossComplete, setTossComplete] = useState(false);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [selectedGobbletSize, setSelectedGobbletSize] = useState<number | null>(null);
  const [selectedGobbletFrom, setSelectedGobbletFrom] = useState<number | null>(null);
  const [bidValue, setBidValue] = useState('0');

  if (!gameState) return null;

  const board: (number | null)[] = gameState.board;
  const currentPlayer: number = gameState.currentPlayer;
  const fadingCells: (number | null)[] = gameState.fadingCells || [];
  const xPlayer: number | undefined = gameState.xPlayer;
  const isMyTurn = currentPlayer === playerNumber;
  const coinTossed: boolean = gameState.coinTossed;
  const jokerCell: number | undefined = gameState.jokerCell;
  const variant: string = gameState.variant || 'classic';
  const gobbletStacks: GobbletPiece[][] = gameState.gobbletStacks || [];
  const remainingPieces: number[][] = gameState.remainingPieces || [[0, 0, 0], [0, 0, 0]];
  const biddingChips: number[] = gameState.biddingChips || [0, 0];
  const pendingBids: boolean[] = gameState.pendingBids || [false, false];
  const biddingPhase: string = gameState.biddingPhase || 'bidding';
  const biddingWinner: number | null = gameState.biddingWinner ?? null;
  const lastBids: number[] | null = gameState.lastBids || null;
  const lastEvent: string | null = gameState.lastEvent || null;

  const p1Name = playerNumber === 0 ? (playerName || 'You') : (opponentName || 'Opponent');
  const p2Name = playerNumber === 1 ? (playerName || 'You') : (opponentName || 'Opponent');

  const showWarning = (message: string) => {
    setWarningMsg(message);
    setTimeout(() => setWarningMsg(null), 2000);
  };

  const getTopPiece = (idx: number) => {
    const stack = gobbletStacks[idx] || [];
    return stack.length > 0 ? stack[stack.length - 1] : null;
  };

  const handleGobbletCellClick = (cell: number) => {
    if (gameOver) return;
    if (!isMyTurn) {
      showWarning('Not your turn.');
      return;
    }

    const topPiece = getTopPiece(cell);
    if (selectedGobbletFrom !== null && selectedGobbletSize !== null) {
      sendAction({ game: 'TicTacToeGobble', from: selectedGobbletFrom, to: cell, size: selectedGobbletSize });
      setSelectedGobbletFrom(null);
      setSelectedGobbletSize(null);
      return;
    }

    if (selectedGobbletSize !== null) {
      sendAction({ game: 'TicTacToeGobble', from: null, to: cell, size: selectedGobbletSize });
      setSelectedGobbletSize(null);
      return;
    }

    if (topPiece?.player === playerNumber) {
      setSelectedGobbletFrom(cell);
      setSelectedGobbletSize(topPiece.size);
      return;
    }

    showWarning('Pick a piece first.');
  };

  const handleClick = (cell: number) => {
    if (variant === 'gobblet') {
      handleGobbletCellClick(cell);
      return;
    }

    if (gameOver) return;

    if (variant === 'bidding') {
      if (biddingPhase !== 'placing' || biddingWinner !== playerNumber) {
        showWarning('Win the auction first.');
        return;
      }
      if (board[cell] !== null) {
        showWarning('That square is taken.');
        return;
      }
      sendAction({ game: 'TicTacToe', cell });
      return;
    }

    if (!isMyTurn) {
      showWarning('Not your turn.');
      return;
    }

    if (variant === 'gravity') {
      const column = cell % 3;
      const columnOpen = [0, 1, 2].some((row) => board[row * 3 + column] === null);
      if (!columnOpen) {
        showWarning('That column is full.');
        return;
      }
      sendAction({ game: 'TicTacToe', cell: column });
      return;
    }

    if (variant !== 'blind' && board[cell] !== null) return;
    sendAction({ game: 'TicTacToe', cell });
  };

  const handleSelectGobbletSize = (size: number) => {
    if (!isMyTurn || gameOver) return;
    setSelectedGobbletFrom(null);
    setSelectedGobbletSize(selectedGobbletSize === size ? null : size);
  };

  const handleSubmitBid = () => {
    const maxBid = biddingChips[playerNumber || 0] || 0;
    const bid = Math.max(0, Math.min(maxBid, Number(bidValue) || 0));
    sendAction({ game: 'TicTacToeBid', bid });
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

    if (variant === 'gobblet') {
      classes.push(styles.cellGobblet);
      if (selectedGobbletFrom === idx) classes.push(styles.cellSelected);
    }

    if (variant === 'gravity') classes.push(styles.cellGravity);
    if (variant === 'bidding' && biddingPhase === 'placing' && biddingWinner === playerNumber) {
      classes.push(styles.cellBidding);
    }

    if (board[idx] !== null) {
      if (variant !== 'blind' || gameOver) {
        if (board[idx] === xPlayer) classes.push(styles.cellX);
        else classes.push(styles.cellO);
      }
    }
    if (board[idx] !== null && !isMyTurn && variant !== 'blind' && variant !== 'gravity') classes.push(styles.cellDisabled);
    // Fading cell indicator
    if (fadingCells.includes(idx)) classes.push(styles.cellFading);
    return classes.join(' ');
  };

  const renderCellContent = (cell: number | null, idx: number) => {
    if (variant === 'blind' && !gameOver) {
      return <span className={styles.cellNumber}>{idx + 1}</span>;
    }

    if (variant === 'gobblet') {
      const topPiece = getTopPiece(idx);
      if (!topPiece) return null;
      return (
        <span className={styles.gobbletPiece}>
          <span>{topPiece.player === xPlayer ? '✕' : '○'}</span>
          <small>{sizeLabels[topPiece.size - 1]}</small>
        </span>
      );
    }

    return cell !== null ? (cell === xPlayer ? '✕' : '○') : (jokerCell === idx ? '🃏' : '');
  };

  const renderVariantControls = () => {
    if (variant === 'gobblet') {
      const myRemaining = remainingPieces[playerNumber || 0] || [0, 0, 0];
      return (
        <div className={styles.variantPanel}>
          <div className={styles.pieceBank}>
            {[1, 2, 3].map((size) => (
              <button
                key={size}
                className={`${styles.pieceButton} ${selectedGobbletSize === size && selectedGobbletFrom === null ? styles.pieceButtonActive : ''}`}
                onClick={() => handleSelectGobbletSize(size)}
                disabled={!isMyTurn || gameOver || myRemaining[size - 1] === 0}
                title={`${sizeLabels[size - 1]} piece`}
              >
                <span>{sizeLabels[size - 1]}</span>
                <small>{myRemaining[size - 1]}</small>
              </button>
            ))}
          </div>
          {selectedGobbletFrom !== null && (
            <button className={styles.clearSelectionButton} onClick={() => { setSelectedGobbletFrom(null); setSelectedGobbletSize(null); }}>
              Clear selection
            </button>
          )}
        </div>
      );
    }

    if (variant === 'bidding') {
      const myIndex = playerNumber || 0;
      const maxBid = biddingChips[myIndex] || 0;
      const bidSubmitted = pendingBids[myIndex];
      return (
        <div className={styles.variantPanel}>
          <div className={styles.chipRow}>
            <span>{p1Name}: {biddingChips[0]}</span>
            <span>{p2Name}: {biddingChips[1]}</span>
          </div>
          {lastBids && (
            <div className={styles.lastBids}>Last bids: {lastBids[0]} / {lastBids[1]}</div>
          )}
          {biddingPhase === 'bidding' ? (
            <div className={styles.bidControls}>
              <input
                className="input"
                type="number"
                min={0}
                max={maxBid}
                value={bidValue}
                onChange={(event) => setBidValue(event.target.value)}
                disabled={bidSubmitted || gameOver}
              />
              <button className="btn btn-primary" onClick={handleSubmitBid} disabled={bidSubmitted || gameOver}>
                Bid
              </button>
            </div>
          ) : (
            <div className={styles.lastBids}>
              {biddingWinner === playerNumber ? 'Place your mark' : 'Opponent is placing'}
            </div>
          )}
        </div>
      );
    }

    if (lastEvent && (variant === 'blind' || variant === 'gravity')) {
      return <div className={styles.variantPanel}>{lastEvent}</div>;
    }

    return null;
  };

  const getWinnerName = (w: string | null) => {
    if (!w) return null;
    if (w === 'Player 1') return p1Name;
    if (w === 'Player 2') return p2Name;
    return w;
  };

  const winnerName = getWinnerName(winner);

  // If coin hasn't been tossed or animation is running, show CoinToss
  if (variant !== 'bidding' && (!coinTossed || !tossComplete)) {
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
            ) : variant === 'bidding' ? (
              biddingPhase === 'bidding'
                ? (pendingBids[playerNumber || 0] ? 'Bid locked. Waiting for opponent...' : 'Set your bid.')
                : (biddingWinner === playerNumber ? 'Auction won. Place your mark.' : 'Opponent won the auction.')
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
                {renderCellContent(cell, idx)}
              </div>
            ))}
          </div>

          {renderVariantControls()}
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
