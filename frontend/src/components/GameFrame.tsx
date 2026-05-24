'use client';

import React, { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { useGame } from '@/context/GameContext';
import { getGameInfo } from '@/lib/gameMetadata';
import RulesTipPanel from './RulesTipPanel';
import TurnTimer from './TurnTimer';
import styles from './GameFrame.module.css';

interface GameFrameProps {
  turnText: ReactNode;
  rules: ReactNode | string[];
  tips?: string[];
  rulesTitle?: string;
  currentPlayer?: number | null;
  children: ReactNode;
}

export default function GameFrame({
  turnText,
  rules,
  tips,
  rulesTitle = 'Rules',
  currentPlayer = null,
  children,
}: GameFrameProps) {
  const { playerNumber, playerName, opponentName, allPlayerNames, scores, openRoomActionPrompt, gameType, variant, turnStartedAt } = useGame();
  const gameInfo = getGameInfo(gameType, variant);
  const isMyTurn = currentPlayer !== null && currentPlayer === playerNumber;

  const getPlayerDisplayName = (idx: number) => {
    if (idx === playerNumber) return `${playerName || 'You'} (You)`;
    return allPlayerNames[idx] || (idx === 0 ? 'Player 1' : idx === 1 ? (opponentName || 'Player 2') : `Player ${idx + 1}`);
  };

  const handleExit = () => {
    openRoomActionPrompt();
  };

  return (
    <div className={styles.frame}>
      <div className={styles.topBar}>
        <button type="button" onClick={handleExit} className={`btn btn-ghost btn-sm ${styles.exitBtn}`}>
          🛑 Exit
        </button>
      </div>

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <div className={styles.scoreBoard}>
            {scores.length <= 2 ? (
              <>
                <div className={styles.scorePlayer}>
                  <span className={styles.scoreName}>{getPlayerDisplayName(0)}</span>
                  <span className={styles.scoreValue}>{scores[0] ?? 0}</span>
                </div>
                <div className={styles.scoreDivider}>—</div>
                <div className={styles.scorePlayer}>
                  <span className={styles.scoreValue}>{scores[1] ?? 0}</span>
                  <span className={styles.scoreName}>{getPlayerDisplayName(1)}</span>
                </div>
              </>
            ) : (
              scores.map((score, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <div className={styles.scoreDivider}>—</div>}
                  <div className={styles.scorePlayer}>
                    <span className={styles.scoreName}>{getPlayerDisplayName(idx)}</span>
                    <span className={styles.scoreValue}>{score}</span>
                  </div>
                </React.Fragment>
              ))
            )}
          </div>

          <div className={styles.infoBar}>
            {scores.map((_, idx) => (
              <span
                key={idx}
                className={`${styles.playerTag} ${
                  currentPlayer !== null && currentPlayer === idx ? styles.playerTagActive : ''
                }`}
              >
                {idx === playerNumber ? '🎮' : '👤'} {getPlayerDisplayName(idx)}
              </span>
            ))}
          </div>

          <div className={styles.turnIndicator}>{turnText}</div>
          <div className={styles.turnTimerRow}>
            <TurnTimer active={isMyTurn} startedAt={turnStartedAt} />
          </div>

          <div className={styles.content}>{children}</div>
        </div>

        <aside className={styles.rulesDock}>
          <RulesTipPanel title={rulesTitle} rules={rules} tips={tips || gameInfo?.tips} defaultOpen={false} compact />
        </aside>
      </div>
    </div>
  );
}