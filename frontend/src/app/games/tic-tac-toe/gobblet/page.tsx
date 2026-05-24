'use client';

import Lobby from '@/components/Lobby';
import TicTacToeBoard from '@/components/TicTacToeBoard';
import styles from '../game.module.css';

export default function GobbletTicTacToePage() {
  return (
    <Lobby
      gameType="tic_tac_toe"
      variant="gobblet"
      gameName="Gobblet Gobblers"
      gameIcon="🪆"
      accentColor="#22c55e"
      hideOverlaysOnGameOver={true}
    >
      <TicTacToeBoard
        variantTitle="📜 Rules"
        rules={
          <ul className={styles.rulesList}>
            <li><strong>Coin Toss:</strong> Who gets X or O is decided before the first move. X goes first.</li>
            <li><strong>Pieces:</strong> Each player has 2 small, 2 medium, and 2 large pieces.</li>
            <li><strong>Cover:</strong> A bigger piece can cover any smaller top piece, even the opponent&apos;s.</li>
            <li><strong>Move:</strong> Tap your top piece to move it. Hidden pieces underneath come back when uncovered.</li>
            <li><strong>Win:</strong> The visible top pieces count for 3 in a row.</li>
          </ul>
        }
      />
    </Lobby>
  );
}