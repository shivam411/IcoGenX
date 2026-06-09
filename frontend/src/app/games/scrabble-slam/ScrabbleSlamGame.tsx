// frontend/src/app/games/scrabble-slam/ScrabbleSlamGame.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

// Standard Scrabble point values for letters (adds premium detail)
const LETTER_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1,
  M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8,
  Y: 4, Z: 10, '?': 0
};

interface TileProps {
  letter: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  themeColor?: string;
}

function LetterTile({ letter, isSelected, onClick, className = '', themeColor }: TileProps) {
  const isOpponent = letter === '?';
  const point = LETTER_POINTS[letter] ?? 1;

  return (
    <div
      onClick={onClick}
      className={`
        ${styles.tile} 
        ${isSelected ? styles.tileSelected : ''} 
        ${isOpponent ? styles.tileOpponent : ''} 
        ${className}
      `}
      style={{
        '--accent-glow': themeColor,
        cursor: onClick ? 'pointer' : 'default'
      } as React.CSSProperties}
    >
      <span className={styles.tileLetter}>{letter}</span>
      {!isOpponent && <span className={styles.tilePoint}>{point}</span>}
    </div>
  );
}

function ScrabbleSlamBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<number>(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  if (!gameState) return null;

  const activeWord = gameState.active_word || 'GAME';
  const hands = gameState.player_hands || [[], []];
  const lastEvent = gameState.last_event || 'Slam cards simultaneously!';
  
  const playerIdx = playerNumber;
  const oppIdx = 1 - playerIdx;

  const myHand: string[] = hands[playerIdx] || [];
  const oppHand: string[] = hands[oppIdx] || [];

  // Theme colors: Player 1 (Cyan), Player 2 (Rose)
  const isP1 = playerIdx === 0;
  const myColor = isP1 ? '#22d3ee' : '#fb7185';
  const oppColor = isP1 ? '#fb7185' : '#22d3ee';

  // Watch for invalid word penalty message in last_event to trigger cooldown
  useEffect(() => {
    if (
      lastEvent &&
      lastEvent.includes(`Player ${playerIdx + 1}`) &&
      lastEvent.includes('Invalid Word!')
    ) {
      setCooldownTimeLeft(1.2);
    }
  }, [lastEvent, playerIdx]);

  // Handle cooldown decrement ticker
  useEffect(() => {
    if (cooldownTimeLeft > 0) {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = setInterval(() => {
        setCooldownTimeLeft((prev) => {
          if (prev <= 0.05) {
            if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return parseFloat((prev - 0.1).toFixed(2));
        });
      }, 100);
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [cooldownTimeLeft]);

  const handleTileSelect = (idx: number) => {
    if (gameOver || cooldownTimeLeft > 0) return;
    setSelectedCardIdx(idx === selectedCardIdx ? null : idx);
  };

  const handleSlamSlot = (pos: number) => {
    if (selectedCardIdx === null || gameOver || cooldownTimeLeft > 0) return;
    const letter = myHand[selectedCardIdx];
    sendAction({
      action: 'SlamLetter',
      letter,
      position: pos,
    });
    setSelectedCardIdx(null);
  };

  const wordChars = activeWord.toUpperCase().split('');

  return (
    <div className={styles.boardShell}>
      {/* Penalty lock overlay */}
      {cooldownTimeLeft > 0 && (
        <div className={styles.cooldownOverlay}>
          <div className={styles.cooldownContent}>
            <div className={styles.cooldownIcon}>🔒</div>
            <div className={styles.cooldownTitle}>INVALID WORD PENALTY</div>
            <div className={styles.cooldownBarContainer}>
              <div
                className={styles.cooldownBarFill}
                style={{ width: `${(cooldownTimeLeft / 1.2) * 100}%` }}
              />
            </div>
            <div className={styles.cooldownTimer}>{cooldownTimeLeft.toFixed(1)}s</div>
          </div>
        </div>
      )}

      {/* Opponent hand tracker */}
      <div className={styles.oppSection}>
        <div className={styles.oppInfo}>
          <span className={styles.dot} style={{ backgroundColor: oppColor }} />
          <span className={styles.oppName}>
            {allPlayerNames[oppIdx] || opponentName || 'Opponent'}
          </span>
          <span className={styles.cardsCount}>
            ({oppHand.length} {oppHand.length === 1 ? 'card' : 'cards'} left)
          </span>
        </div>
        <div className={styles.oppHandGrid}>
          {oppHand.map((_, idx) => (
            <div
              key={`opp-card-${idx}`}
              className={styles.cardBackSmall}
              style={{ borderColor: oppColor }}
            >
              <span>?</span>
            </div>
          ))}
        </div>
      </div>

      {/* Central Board Word Display */}
      <div className={styles.mainWordArena}>
        <div className={styles.wordTitle}>ACTIVE WORD</div>
        <div className={styles.lettersContainer}>
          {wordChars.map((char: string, pos: number) => {
            const isClickable = selectedCardIdx !== null && cooldownTimeLeft === 0 && !gameOver;
            return (
              <div key={`word-char-${pos}`} className={styles.wordColumn}>
                <div className={styles.wordBlock}>
                  <span className={styles.wordLetter}>{char}</span>
                  <span className={styles.wordPoint}>{LETTER_POINTS[char] ?? 1}</span>
                </div>
                <button
                  disabled={!isClickable}
                  onClick={() => handleSlamSlot(pos)}
                  className={`
                    ${styles.slamBtn} 
                    ${isClickable ? styles.slamBtnActive : ''}
                  `}
                  style={{
                    '--glow-color': myColor,
                  } as React.CSSProperties}
                >
                  {selectedCardIdx !== null ? `Slam '${myHand[selectedCardIdx]}'` : 'Slam Here'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Banner */}
      <div className={styles.eventBanner}>
        <span className={styles.eventText}>{lastEvent}</span>
      </div>

      {/* My Hand Section */}
      <div className={styles.myHandSection}>
        <div className={styles.handHeader}>
          <div className={styles.playerMeta}>
            <span className={styles.dot} style={{ backgroundColor: myColor }} />
            <span className={styles.playerName}>Your Hand ({myHand.length} cards)</span>
          </div>
          <span className={styles.instructions}>
            {selectedCardIdx !== null
              ? 'Now click a Slam button under any letter above!'
              : 'Click a card below to select it'}
          </span>
        </div>

        {myHand.length === 0 ? (
          <div className={styles.emptyHand}>Spelled all cards! Waiting for validation...</div>
        ) : (
          <div className={styles.handGrid}>
            {myHand.map((letter, idx) => (
              <LetterTile
                key={`my-card-${idx}`}
                letter={letter}
                isSelected={idx === selectedCardIdx}
                onClick={() => handleTileSelect(idx)}
                themeColor={myColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScrabbleSlamGamePage() {
  return (
    <GameTemplate
      gameType="scrabble_slam"
      gameName="Scrabble Slam!"
      gameIcon="scrabble-slam"
      accentColor="#ea580c"
      winEmoji="🔤"
      winTitle="Perfect Spelling!"
      loseTitle="Letters Exhausted"
      drawTitle="No Moves Left"
    >
      {(props) => <ScrabbleSlamBoard {...props} />}
    </GameTemplate>
  );
}
