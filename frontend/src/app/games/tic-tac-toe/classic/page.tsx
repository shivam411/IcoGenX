'use client';

import Lobby from '@/components/Lobby';
import TicTacToeBoard from '@/components/TicTacToeBoard';
import styles from '../game.module.css';

export default function ClassicTicTacToePage() {
  return (
    <Lobby 
      gameType="tic_tac_toe" 
      variant="classic"
      gameName="Classic Tic-Tac-Toe" 
      gameIcon="❌⭕" 
      accentColor="#3b82f6"
      hideOverlaysOnGameOver={true}
    >
      <TicTacToeBoard 
        variantTitle="📜 Rules"
        rules={
          <ul className={styles.rulesList}>
            <li><strong>Coin Toss:</strong> Who gets X or O is decided by a coin toss at the start. X always goes first!</li>
            <li><strong>Classic Mode:</strong> Get 3 in a row horizontally, vertically, or diagonally to win.</li>
            <li><strong>Draw:</strong> If the board fills up without a winner, it's a draw!</li>
          </ul>
        }
      />
    </Lobby>
  );
}
