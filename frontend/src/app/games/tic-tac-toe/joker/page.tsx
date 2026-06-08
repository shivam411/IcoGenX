'use client';

import Lobby from '@/components/Lobby';
import TicTacToeBoard from '@/components/TicTacToeBoard';
import GameDemo from '@/components/GameDemo';
import styles from '../game.module.css';

const demoSteps = [
  { board: [null, null, null, null, 'J', null, null, null, null], joker: 4, message: "A random cell becomes the Joker (🃏)" },
  { board: ['X', null, null, null, 'J', null, null, null, null], joker: 4, message: "X places a mark" },
  { board: ['X', null, 'O', null, 'J', null, null, null, null], joker: 4, message: "O places a mark" },
  { board: ['X', null, 'O', null, 'J', null, null, null, 'X'], joker: 4, message: "X places another mark" },
  { board: ['X', null, 'O', null, 'J', null, 'O', null, 'X'], joker: 4, message: "O places another mark. O wins! (Diagonal O - J - O)" },
];

export default function JokerTicTacToePage() {
  return (
    <Lobby 
      gameType="tic_tac_toe" 
      variant="joker"
      gameName="Joker Tic-Tac-Toe" 
      gameIcon="tic-tac-toe-joker"
      accentColor="#f59e0b"
      hideOverlaysOnGameOver={true}
    >
      <TicTacToeBoard 
        variantTitle="📜 Rules"
        rules={
        <>
          <ul className={styles.rulesList}>
            <li><strong>Coin Toss:</strong> Who gets X or O is decided by a coin toss at the start. X always goes first!</li>
            <li><strong>The Joker Cell:</strong> One random cell glows gold. This is the Joker cell!</li>
            <li><strong>Wildcard:</strong> The Joker cell always counts as BOTH an X and an O, even before anyone plays on it.</li>
            <li><strong>Win:</strong> Get 3 in a row. Using the Joker cell makes this much easier!</li>
          </ul>
          <GameDemo steps={demoSteps} />
        </>
        }
      />
    </Lobby>
  );
}
