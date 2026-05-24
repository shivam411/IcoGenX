/* frontend/src/app/games/bluff-card/page.tsx */
'use client';

import { useMemo, useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

interface BluffCard {
  id: string;
  rank: string;
  suit: string;
}

const SUIT_SYMBOLS: Record<string, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

const RED_SUITS = new Set(['H', 'D']);

function BluffCardBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  const hand: BluffCard[] = gameState.hand || [];
  const lastPlay = gameState.lastPlay;
  const lastChallenge = gameState.lastChallenge;
  const currentRank: string = gameState.currentRank;
  const pileCount: number = gameState.pileCount || 0;
  const myCount: number = gameState.handCount ?? hand.length;
  const opponentCount: number = gameState.opponentCardCount ?? 0;
  const canChallenge = Boolean(isMyTurn && lastPlay && lastPlay.player !== playerNumber && !gameOver);
  const canPlay = Boolean(isMyTurn && !gameOver);
  const opponentLabel = opponentName || 'Opponent';
  const playerLabel = playerName || 'You';
  
  const getActorName = (actor: number) => (actor === playerNumber ? playerLabel : opponentLabel);

  const selectedSummary = useMemo(() => {
    if (!selectedCards.length) return 'Select 1 to 4 cards to play face down.';
    return `${selectedCards.length} card${selectedCards.length === 1 ? '' : 's'} selected as ${currentRank}`;
  }, [currentRank, selectedCards.length]);

  const toggleCard = (idx: number) => {
    setSelectedCards((current) => {
      if (current.includes(idx)) return current.filter((item) => item !== idx);
      if (current.length >= 4) return current;
      return [...current, idx].sort((a, b) => a - b);
    });
  };

  const handlePlay = () => {
    if (!selectedCards.length) return;
    sendAction({ game: 'BluffCard', action: 'play', card_indices: selectedCards });
    setSelectedCards([]);
  };

  const handleChallenge = () => {
    sendAction({ game: 'BluffCard', action: 'challenge', card_indices: [] });
    setSelectedCards([]);
  };

  return (
    <div className={styles.tableArea}>
      <div className={styles.statusGrid}>
        <div className={styles.statusCard}>
          <span className={styles.statusLabel}>Your hand</span>
          <strong>{myCount}</strong>
        </div>
        <div className={`${styles.statusCard} ${styles.claimCard}`}>
          <span className={styles.statusLabel}>Claim rank</span>
          <strong>{currentRank}</strong>
        </div>
        <div className={styles.statusCard}>
          <span className={styles.statusLabel}>{opponentLabel}</span>
          <strong>{opponentCount}</strong>
        </div>
      </div>

      <div className={styles.pileZone}>
        <div className={styles.cardPile}>
          <span>{pileCount}</span>
        </div>
        <div className={styles.pileText}>
          {lastPlay ? (
            <>
              {getActorName(lastPlay.player)} played {lastPlay.count} as <strong>{lastPlay.claimedRank}</strong>
            </>
          ) : (
            <>No active claim yet. Start with <strong>{currentRank}</strong>.</>
          )}
        </div>
      </div>

      {lastChallenge && (
        <div className={`${styles.challengeBanner} ${lastChallenge.wasBluff ? styles.challengeCaught : styles.challengeHonest}`}>
          <strong>{lastChallenge.wasBluff ? 'Bluff caught' : 'Honest play'}</strong>
          <span>
            {getActorName(lastChallenge.collector)} picked up the pile after revealing{' '}
            {lastChallenge.revealed.map((card: BluffCard) => card.id).join(', ')}.
          </span>
        </div>
      )}

      <div className={styles.handPanel}>
        <div className={styles.handHeader}>
          <span>{selectedSummary}</span>
          <span>{canPlay ? 'Choose carefully' : 'Waiting'}</span>
        </div>

        <div className={styles.handGrid}>
          {hand.map((card, idx) => {
            const selected = selectedCards.includes(idx);
            const red = RED_SUITS.has(card.suit);
            return (
              <button
                key={`${card.id}-${idx}`}
                type="button"
                className={`${styles.playingCard} ${selected ? styles.cardSelected : ''} ${red ? styles.cardRed : ''}`}
                onClick={() => canPlay && toggleCard(idx)}
                disabled={!canPlay}
                aria-pressed={selected}
              >
                <span>{card.rank}</span>
                <span>{SUIT_SYMBOLS[card.suit] || card.suit}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isMyTurn && !gameOver && (
        <div className={styles.actionRow}>
          <button className="btn btn-primary" onClick={handlePlay} disabled={!selectedCards.length}>
            Play as {currentRank}
          </button>
          <button className="btn btn-ghost" onClick={handleChallenge} disabled={!canChallenge}>
            Call Bluff
          </button>
        </div>
      )}
    </div>
  );
}

export default function BluffCardPage() {
  return (
    <GameTemplate
      gameType="bluff_card"
      gameName="Bluff Card Game"
      gameIcon="🂠"
      accentColor="#be123c"
      winTitle="You Bluffed Best!"
      loseTitle="Out of Cards!"
    >
      {(props) => <BluffCardBoard {...props} />}
    </GameTemplate>
  );
}