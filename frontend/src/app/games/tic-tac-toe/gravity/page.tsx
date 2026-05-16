'use client';

import Lobby from '@/components/Lobby';
import TicTacToeBoard from '@/components/TicTacToeBoard';
import styles from '../game.module.css';

export default function GravityTicTacToePage() {
  return (
    <Lobby
      gameType="tic_tac_toe"
      variant="gravity"
      gameName="Gravity Tic-Tac-Toe"
      gameIcon="⬇️"
      accentColor="#14b8a6"
    >
      <TicTacToeBoard
        variantTitle="📜 Rules"
        rules={
          <ul className={styles.rulesList}>
            <li><strong>Coin Toss:</strong> Who gets X or O is decided before the first move. X goes first.</li>
            <li><strong>Drop:</strong> Pick a column. Your mark falls to the lowest empty space.</li>
            <li><strong>Columns:</strong> A full column cannot be chosen again.</li>
            <li><strong>Win:</strong> Get 3 visible marks in a row horizontally, vertically, or diagonally.</li>
          </ul>
        }
      />
    </Lobby>
  );
}