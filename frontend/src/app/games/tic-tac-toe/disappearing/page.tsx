'use client';

import Lobby from '@/components/Lobby';
import TicTacToeBoard from '@/components/TicTacToeBoard';
import GameDemo from '@/components/GameDemo';
import styles from '../game.module.css';

const demoSteps = [
  { board: ['X', null, null, null, null, null, null, null, null], message: "X places 1st mark" },
  { board: ['X', 'O', null, null, null, null, null, null, null], message: "O places 1st mark" },
  { board: ['X', 'O', null, null, 'X', null, null, null, null], message: "X places 2nd mark" },
  { board: ['X', 'O', 'O', null, 'X', null, null, null, null], message: "O places 2nd mark" },
  { board: ['X', 'O', 'O', null, 'X', null, null, 'X', null], message: "X places 3rd mark" },
  { board: ['X', 'O', 'O', 'O', 'X', null, null, 'X', null], message: "O places 3rd mark" },
  { board: ['X', 'O', 'O', 'O', 'X', 'X', null, 'X', null], fading: 0, message: "X places 4th mark. The 1st mark starts fading!" },
  { board: ['X', 'O', 'O', 'O', 'X', 'X', null, 'X', 'O'], fading: 0, message: "O places 4th mark. X's oldest mark is next to vanish!" },
  { board: [null, 'O', 'O', 'O', 'X', 'X', 'X', 'X', 'O'], message: "X places 5th mark. The 1st mark disappears!" },
];

export default function DisappearingTicTacToePage() {
  return (
    <Lobby 
      gameType="tic_tac_toe" 
      variant="disappearing"
      gameName="Disappearing Tic-Tac-Toe" 
      gameIcon="tic-tac-toe-disappearing"
      accentColor="#8b5cf6"
      hideOverlaysOnGameOver={true}
    >
      <TicTacToeBoard 
        variantTitle="📜 Rules"
        rules={
        <>
          <ul className={styles.rulesList}>
            <li><strong>Coin Toss:</strong> Who gets X or O is decided by a coin toss at the start. X always goes first!</li>
            <li><strong>Max 4 Symbols:</strong> You can keep up to 4 symbols on the board at once.</li>
            <li><strong>Disappearing Act:</strong> When you place your 5th symbol, your very 1st symbol disappears from the board.</li>
            <li><strong>Fading Hint:</strong> Once you have 4 symbols down, your oldest one fades to warn you that it will vanish next.</li>
            <li><strong>Win:</strong> Get 3 in a row before your symbols vanish to win!</li>
          </ul>
          <GameDemo steps={demoSteps} />
        </>
        }
      />
    </Lobby>
  );
}
