'use client';

import Lobby from '@/components/Lobby';
import TicTacToeBoard from '@/components/TicTacToeBoard';
import styles from '../game.module.css';

export default function BiddingTicTacToePage() {
  return (
    <Lobby
      gameType="tic_tac_toe"
      variant="bidding"
      gameName="Bidding Tic-Tac-Toe"
      gameIcon="🪙"
      accentColor="#eab308"
    >
      <TicTacToeBoard
        variantTitle="📜 Rules"
        rules={
          <ul className={styles.rulesList}>
            <li><strong>Chips:</strong> Each player starts with 100 chips.</li>
            <li><strong>Auction:</strong> Both players bid secretly at the same time.</li>
            <li><strong>Place:</strong> The higher bidder spends their bid and places one mark.</li>
            <li><strong>Tie:</strong> Equal bids are spent, and no mark is placed that round.</li>
            <li><strong>Win:</strong> Get 3 in a row before your opponent does.</li>
          </ul>
        }
      />
    </Lobby>
  );
}