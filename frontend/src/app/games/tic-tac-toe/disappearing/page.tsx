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
  { board: ['X', 'O', 'O', null, 'X', null, null, null, 'X'], fading: 0, message: "X places 3rd mark. The 1st mark begins to fade!" },
  { board: ['X', 'O', 'O', 'O', 'X', null, null, null, 'X'], fading: 0, message: "O places 3rd mark. X must act fast!" },
  { board: [null, 'O', 'O', 'O', 'X', null, 'X', null, 'X'], message: "X places 4th mark. The 1st mark disappears!" },
];

export default function DisappearingTicTacToePage() {
  return (
    <Lobby 
      gameType="tic_tac_toe" 
      variant="disappearing"
      gameName="Disappearing Tic-Tac-Toe" 
      gameIcon="🪄" 
      accentColor="#8b5cf6"
    >
      <TicTacToeBoard 
        variantTitle="📜 Rules"
        rules={
        <>
          <ul className={styles.rulesList}>
            <li><strong>Coin Toss:</strong> Who gets X or O is decided by a coin toss at the start. X always goes first!</li>
            <li><strong>Max 3 Symbols:</strong> You can only have a maximum of 3 symbols on the board.</li>
            <li><strong>Disappearing Act:</strong> When you place your 4th symbol, your very 1st symbol will disappear from the board!</li>
            <li><strong>Fading Hint:</strong> The symbol that is about to disappear will fade and pulse to warn you.</li>
            <li><strong>Win:</strong> Get 3 in a row before your symbols vanish to win!</li>
          </ul>
          <GameDemo steps={demoSteps} />
        </>
        }
      />
    </Lobby>
  );
}
