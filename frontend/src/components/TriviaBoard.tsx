'use client';

import { GameBoardProps } from '@/components/GameTemplate';
import styles from './trivia.module.css';
import { useEffect, useState } from 'react';

const optionLetters = ['A', 'B', 'C', 'D'];

export default function TriviaBoard({
  gameState,
  playerNumber,
  allPlayerNames,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [timeLeft, setTimeLeft] = useState(15.0);

  // Extract game states safely
  const currentRound = gameState?.currentRound ?? 0;
  const totalRounds = gameState?.totalRounds ?? 10;
  const category = gameState?.category ?? '';
  const question = gameState?.question ?? '';
  const choices: string[] = gameState?.choices ?? [];
  const correctIdx = gameState?.correctIdx ?? null;
  const roundCompleted = gameState?.roundCompleted ?? false;
  const answers = gameState?.answers ?? {};

  const myIndex = playerNumber ?? 0;
  const myAnswerState = answers[myIndex.toString()];

  // Track if current player has locked in their answer
  const hasAnswered = roundCompleted
    ? myAnswerState !== null && myAnswerState !== undefined
    : myAnswerState?.answered === true;

  // Track timeLeft with high frequency countdown
  useEffect(() => {
    if (!gameState || roundCompleted || gameOver) {
      return;
    }

    setTimeLeft(15.0);
    const roundStart = Date.now();

    const interval = setInterval(() => {
      const elapsed = (Date.now() - roundStart) / 1000;
      const remaining = Math.max(0, 15.0 - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, currentRound, roundCompleted, gameOver]);

  // Auto-submit when time runs out and player hasn't selected yet
  useEffect(() => {
    if (timeLeft <= 0 && !hasAnswered && !roundCompleted && !gameOver && gameState) {
      sendAction({
        action: 'submit_answer',
        choice: 99, // timeout value
        time_ms: 15000,
      });
    }
  }, [timeLeft, hasAnswered, roundCompleted, gameOver, gameState, sendAction]);

  if (!gameState) return null;

  const handleSelectOption = (idx: number) => {
    if (hasAnswered || roundCompleted || gameOver) return;
    const elapsedMs = Math.round((15.0 - timeLeft) * 1000);
    sendAction({
      action: 'submit_answer',
      choice: idx,
      time_ms: elapsedMs,
    });
  };

  const handleNextRound = () => {
    sendAction({
      action: 'next_round',
    });
  };

  // Determine option button class based on current phase (guessing vs result)
  const getOptionClass = (idx: number) => {
    const classes = [styles.optionButton];

    if (roundCompleted) {
      const isCorrect = correctIdx === idx;
      // In roundCompleted mode, answers contains the raw choices selected by each player
      const myChoice = answers[myIndex.toString()];
      const isSelected = myChoice === idx;

      if (isCorrect) {
        classes.push(styles.optionCorrect);
      } else if (isSelected) {
        classes.push(styles.optionIncorrect);
      }
    } else {
      // In active guessing mode, check if player has selected this option
      const isSelected = myAnswerState?.choice === idx;
      if (isSelected) {
        classes.push(styles.optionSelected);
      }
    }

    return classes.join(' ');
  };

  const renderPlayerStatus = (idx: number) => {
    const playerAns = answers[idx.toString()];

    if (roundCompleted) {
      const choiceIdx = playerAns; // raw choice
      const questionCorrectIdx = correctIdx;

      if (choiceIdx === 99 || choiceIdx === null || choiceIdx === undefined) {
        return <span className={styles.statusIndicator}>⏰</span>; // timeout
      }

      if (choiceIdx === questionCorrectIdx) {
        return <span className={styles.statusIndicator} style={{ color: '#10b981' }}>✅</span>;
      } else {
        return <span className={styles.statusIndicator} style={{ color: '#ef4444' }}>❌</span>;
      }
    } else {
      const answered = playerAns?.answered === true;
      return answered ? (
        <span className={styles.statusIndicator} title="Answer Locked">🔒</span>
      ) : (
        <span className={styles.statusIndicator} title="Thinking...">⏳</span>
      );
    }
  };

  const timerPercent = (timeLeft / 15.0) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Timer bar */}
      <div className={styles.timerBarContainer}>
        <div
          className={`${styles.timerBar} ${timeLeft <= 3 && !roundCompleted ? styles.timerUrgent : ''}`}
          style={{ width: `${roundCompleted ? 0 : timerPercent}%` }}
        />
      </div>

      {/* Round Header */}
      <div className={styles.roundHeader}>
        <span className={styles.categoryTag}>{category}</span>
        <span className={styles.roundNumber}>
          Round {currentRound + 1} / {totalRounds}
        </span>
      </div>

      {/* Question Text */}
      <div className={styles.questionBox}>
        <h2 className={styles.questionText}>{question}</h2>
      </div>

      {/* Choices Grid */}
      <div className={styles.optionsGrid}>
        {choices.map((choice, idx) => {
          const displayLetter = optionLetters[idx] || '';
          return (
            <button
              key={idx}
              className={getOptionClass(idx)}
              onClick={() => handleSelectOption(idx)}
              disabled={hasAnswered || roundCompleted || gameOver}
            >
              <span className={styles.optionLetter}>{displayLetter}</span>
              <span>{choice}</span>
            </button>
          );
        })}
      </div>

      {/* Next Round controls */}
      {roundCompleted && !gameOver && (
        <div className={styles.nextRoundContainer}>
          <button className={`${styles.nextBtn} btn btn-primary`} onClick={handleNextRound}>
            Next Round ➔
          </button>
        </div>
      )}

      {/* Players status footer */}
      <div className={styles.playersProgress}>
        {allPlayerNames.map((name, idx) => {
          const isMe = idx === myIndex;
          const playerScoreVal = gameState?.scores?.[idx] ?? 0;
          return (
            <div key={idx} className={`${styles.playerCard} ${isMe ? styles.playerCardActive : ''}`}>
              <div className={styles.playerInfo}>
                <span className={styles.playerName}>{name || `Player ${idx + 1}`}</span>
                <span className={styles.playerScore}>{playerScoreVal} pts</span>
              </div>
              {renderPlayerStatus(idx)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
