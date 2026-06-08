'use client';

import Lobby from '@/components/Lobby';
import TicTacToeBoard from '@/components/TicTacToeBoard';
import styles from '../game.module.css';

export default function BlindTicTacToePage() {
  return (
    <Lobby
      gameType="tic_tac_toe"
      variant="blind"
      gameName="Blind Tic-Tac-Toe"
      gameIcon="tic-tac-toe-blind"
      accentColor="#f97316"
      hideOverlaysOnGameOver={true}
    >
      <TicTacToeBoard
        variantTitle="📜 Rules"
        rules={
          <ul className={styles.rulesList}>
            <li><strong>Coin Toss:</strong> Who gets X or O is decided before the first move. X goes first.</li>
            <li><strong>Memory:</strong> The board shows numbered squares instead of visible marks.</li>
            <li><strong>Call:</strong> Pick a square number on your turn.</li>
            <li><strong>Miss:</strong> If that square was already taken, you lose the turn.</li>
            <li><strong>Reveal:</strong> The final board is revealed when the round ends.</li>
          </ul>
        }
      />
    </Lobby>
  );
}