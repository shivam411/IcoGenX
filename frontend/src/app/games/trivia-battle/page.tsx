'use client';

import GameTemplate from '@/components/GameTemplate';
import TriviaBoard from '@/components/TriviaBoard';

export default function TriviaBattlePage() {
  return (
    <GameTemplate
      gameType="trivia_battle"
      gameName="Trivia Battle"
      gameIcon="trivia-battle"
      accentColor="#ec4899"
      winEmoji="🏆"
      winTitle="Trivia Champion!"
      loseTitle="Good Effort!"
      drawTitle="Tie Match!"
    >
      {(props) => <TriviaBoard {...props} />}
    </GameTemplate>
  );
}
