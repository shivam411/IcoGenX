'use client';

import type { ReactNode } from 'react';
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
  const { playerNumber, playerName, opponentName, scores, openRoomActionPrompt, gameType, variant, turnStartedAt } = useGame();
  const resolvedPlayerNumber = playerNumber === 1 ? 1 : 0;
  const gameInfo = getGameInfo(gameType, variant);
  const isMyTurn = currentPlayer !== null && currentPlayer === resolvedPlayerNumber;

  const myScore = resolvedPlayerNumber === 0 ? scores[0] : scores[1];
  const opponentScore = resolvedPlayerNumber === 0 ? scores[1] : scores[0];
  const leftName = playerName || 'You';
  const rightName = opponentName || 'Opponent';

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
            <div className={styles.scorePlayer}>
              <span className={styles.scoreName}>{leftName}</span>
              <span className={styles.scoreValue}>{myScore}</span>
            </div>
            <div className={styles.scoreDivider}>—</div>
            <div className={styles.scorePlayer}>
              <span className={styles.scoreValue}>{opponentScore}</span>
              <span className={styles.scoreName}>{rightName}</span>
            </div>
          </div>

          <div className={styles.infoBar}>
            <span className={`${styles.playerTag} ${currentPlayer === resolvedPlayerNumber ? styles.playerTagActive : ''}`}>
              🎮 {leftName}
            </span>
            <span
              className={`${styles.playerTag} ${
                currentPlayer !== null && currentPlayer === 1 - resolvedPlayerNumber
                  ? styles.playerTagActive
                  : ''
              }`}
            >
              👤 {rightName}
            </span>
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