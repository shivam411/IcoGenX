export interface GameVariantMetadata {
  id: string;
  name: string;
  icon: string;
  desc: string;
  path: string;
  rulesTitle?: string;
  rules?: string[];
  tips?: string[];
  previewSteps?: string[];
}

export interface GameCatalogItem {
  id: string;
  gameType: string;
  name: string;
  icon: string;
  description: string;
  players: string;
  category: string;
  badgeClass: string;
  gradient: string;
  rulesTitle: string;
  rules: string[];
  tips: string[];
  previewSteps: string[];
  variants?: GameVariantMetadata[];
  playerCount: number;
  playerLabel: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  featured?: boolean;
  isComingSoon?: boolean;
}

const TIC_TAC_TOE_VARIANTS: GameVariantMetadata[] = [
  {
    id: 'classic',
    name: 'Classic',
    icon: '📝',
    desc: 'Normal 3x3. Draws are possible.',
    path: '/games/tic-tac-toe/classic',
    rulesTitle: 'Classic Rules',
    rules: ['Take turns placing marks on the 3x3 board.', 'Make three in a row horizontally, vertically, or diagonally.', 'A full board without a line ends in a draw.'],
    tips: ['Corners give you more fork chances than edges.', 'Block a two-in-a-row before building your own threat.'],
    previewSteps: ['Place X/O', 'Block forks', 'Make a line'],
  },
  {
    id: 'disappearing',
    name: 'Disappearing',
    icon: '🪄',
    desc: 'Keep 4 marks in play. Your oldest vanishes on the 5th move.',
    path: '/games/tic-tac-toe/disappearing',
    rulesTitle: 'Disappearing Rules',
    rules: ['Each player can keep only four marks on the board.', 'When you place a fifth mark, your oldest mark disappears.', 'Make three in a row while planning around the vanishing order.'],
    tips: ['Track your oldest mark before setting up a line.', 'Sometimes a disappearing mark opens the winning lane.'],
    previewSteps: ['Place mark', 'Oldest fades', 'Time the line'],
  },
  {
    id: 'joker',
    name: 'Joker Cell',
    icon: '🃏',
    desc: 'One cell is gold and acts as X and O.',
    path: '/games/tic-tac-toe/joker',
    rulesTitle: 'Joker Rules',
    rules: ['One highlighted cell counts as both X and O even when empty.', 'A winning line through the Joker ends the game immediately.', 'Both players can use the Joker as part of their line.'],
    tips: ['Treat every line through the Joker as urgent.', 'Win by controlling the cells around the Joker, not just the Joker itself.'],
    previewSteps: ['Spot Joker', 'Build around it', 'Strike through'],
  },
  {
    id: 'gobblet',
    name: 'Gobblet Gobblers',
    icon: '🪆',
    desc: 'Small, medium, and large pieces can cover smaller ones.',
    path: '/games/tic-tac-toe/gobblet',
    rulesTitle: 'Gobblet Rules',
    rules: ['Each player has small, medium, and large pieces.', 'Larger pieces can cover smaller pieces.', 'Uncovering a piece can reveal an older threat.'],
    tips: ['Do not cover a line unless you know what is underneath.', 'Save a large piece for late defense.'],
    previewSteps: ['Choose size', 'Cover pieces', 'Reveal threats'],
  },
  {
    id: 'gravity',
    name: 'Gravity',
    icon: '⬇️',
    desc: 'Drop marks into columns and let them fall to the bottom.',
    path: '/games/tic-tac-toe/gravity',
    rulesTitle: 'Gravity Rules',
    rules: ['Pick a column instead of a cell.', 'Your mark falls to the lowest open slot in that column.', 'Make three in a row after gravity settles the board.'],
    tips: ['Count what your drop gives the opponent above it.', 'Middle columns create more diagonal pressure.'],
    previewSteps: ['Drop mark', 'Stack columns', 'Connect three'],
  },
  {
    id: 'bidding',
    name: 'Bidding',
    icon: '🪙',
    desc: 'Spend chips in auctions to win the right to place.',
    path: '/games/tic-tac-toe/bidding',
    rulesTitle: 'Bidding Rules',
    rules: ['Bid chips to win the right to place the next mark.', 'Higher bid wins the turn and spends those chips.', 'Make three in a row before your chip economy runs dry.'],
    tips: ['Save chips when a square is not urgent.', 'Spend hard when one move creates or blocks a win.'],
    previewSteps: ['Bid chips', 'Win turn', 'Place mark'],
  },
  {
    id: 'blind',
    name: 'Blind Memory',
    icon: '🙈',
    desc: 'Call numbered squares from memory. Occupied calls lose turns.',
    path: '/games/tic-tac-toe/blind',
    rulesTitle: 'Blind Rules',
    rules: ['Choose numbered squares from memory.', 'Calling an occupied square wastes your turn.', 'Remember the hidden board well enough to make three in a row.'],
    tips: ['Replay the board in your head after every turn.', 'Use corner numbers as anchors.'],
    previewSteps: ['Memorize', 'Call square', 'Reveal mark'],
  },
];

export const GAME_CATALOG: GameCatalogItem[] = [
  {
    id: 'tic-tac-toe',
    gameType: 'tic_tac_toe',
    name: 'Tic-Tac-Toe Variants',
    icon: '❌⭕',
    description: 'Play Classic, Gobblet, Gravity, Bidding, Blind, and more Tic-Tac-Toe twists.',
    players: '2 Players',
    category: 'Strategy',
    badgeClass: 'badge-purple',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    rulesTitle: 'Tic-Tac-Toe Rules',
    rules: TIC_TAC_TOE_VARIANTS[0].rules || [],
    tips: ['Look for moves that create two threats at once.', 'Center is powerful because it touches four winning lines.'],
    previewSteps: ['Pick variant', 'Place marks', 'Win the line'],
    variants: TIC_TAC_TOE_VARIANTS,
    playerCount: 2,
    playerLabel: '2 Players',
    difficulty: 'easy',
    estimatedTime: '2-5 min',
    tags: ['strategy', 'couples', 'classic'],
    featured: true,
  },
  {
    id: 'shut-the-box',
    gameType: 'shut_the_box',
    name: 'Dice Tug-of-War',
    icon: '🎲',
    description: 'Roll, advance your cards, and automatically pull matching opponent cards back.',
    players: '2 Players',
    category: 'Strategy',
    badgeClass: 'badge-orange',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    rulesTitle: 'Dice Tug-of-War Rules',
    rules: ['Roll one die, then choose unopened cards that add up to the roll.', 'Your selected cards move forward automatically.', 'Exact matching opponent cards move back automatically.', 'First player to move all six cards forward wins.'],
    tips: ['Pick the exact matching number when you want to pull an opponent card back.', 'A single high card can be stronger than two low cards if it blocks the opponent.', 'Check the opponent row before choosing equal-sum combinations.', 'If the opponent has 3 open, choosing your 3 sends their 3 back.'],
    previewSteps: ['Roll die', 'Pick sum', 'Push track'],
    playerCount: 2,
    playerLabel: '2 Players',
    difficulty: 'easy',
    estimatedTime: '3-6 min',
    tags: ['strategy', 'couples', 'dice'],
    featured: false,
  },
  {
    id: 'code-guess',
    gameType: 'code_guess',
    name: 'Code Breaker',
    icon: '🔐',
    description: 'Break a secret 4-digit code or chase a number with higher/lower clues.',
    players: '2 Players',
    category: 'Logic',
    badgeClass: 'badge-cyan',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    rulesTitle: 'Code Breaker Rules',
    rules: ['Each player locks in a secret 4-digit code.', 'On your turn, submit one 4-digit guess.', 'Green means right digit and right spot; yellow means right digit, wrong spot.', 'Crack the opponent code first to win.'],
    tips: ['Use early guesses to test different digits, not just positions.', 'Repeated patterns are risky because every clue gives more structure.'],
    previewSteps: ['Set code', 'Read clues', 'Crack first'],
    variants: [
      {
        id: 'digits',
        name: '4-Digit Code',
        icon: '🔐',
        desc: 'Set a secret 4-digit code and crack your opponent first.',
        path: '/games/code-guess',
        previewSteps: ['Lock code', 'Guess digits', 'Use clues'],
      },
      {
        id: 'number-range',
        name: 'Number Range',
        icon: '🔎',
        desc: 'Guess a 1-100 number with greater/less clues.',
        path: '/games/code-guess/number',
        rulesTitle: 'Number Range Rules',
        rules: ['Guess the hidden number inside the current range.', 'Each hint narrows the range higher or lower.', 'Use the shrinking window to force the answer first.'],
        tips: ['Middle guesses are steady, but off-center guesses can steal tempo.', 'Do not repeat a number already outside the shown range.'],
        previewSteps: ['Pick number', 'Shrink range', 'Hit target'],
      },
    ],
    playerCount: 2,
    playerLabel: '2 Players',
    difficulty: 'hard',
    estimatedTime: '5-10 min',
    tags: ['logic', 'puzzles', 'couples'],
    featured: true,
  },
  {
    id: 'memory-flip',
    gameType: 'memory_flip',
    name: 'Sequence Memory Flip',
    icon: '🃏',
    description: 'Flip cards 1-9 in order. Wrong flip gives your opponent a chance.',
    players: '2 Players',
    category: 'Memory',
    badgeClass: 'badge-pink',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    rulesTitle: 'Memory Flip Rules',
    rules: ['Find the next number in sequence, starting at 1.', 'Correct cards stay revealed.', 'A wrong flip ends your turn.', 'Complete the sequence first to win.'],
    tips: ['Say the revealed locations quietly in order after each turn.', 'A wrong guess still teaches both players, so watch opponent misses.'],
    previewSteps: ['Flip card', 'Remember spot', 'Run sequence'],
    playerCount: 2,
    playerLabel: '2 Players',
    difficulty: 'medium',
    estimatedTime: '3-5 min',
    tags: ['memory', 'quick', 'couples'],
    featured: false,
  },
  {
    id: 'higher-lower',
    gameType: 'higher_lower',
    name: 'Higher or Lower Variants',
    icon: '🔢',
    description: 'Guess hidden numbers across Sprint, Classic, or Expert ranges as the window shrinks.',
    players: '2 Players',
    category: 'Quick',
    badgeClass: 'badge-green',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    rulesTitle: 'Higher or Lower Rules',
    rules: ['Guess the hidden number inside the active range.', 'Each hint tells everyone whether the answer is higher or lower.', 'The range shrinks after every miss.', 'Find the exact number first to win.'],
    tips: ['Use the range bar, not the original max, when choosing.', 'A narrow miss can hand the next player an easy finish.'],
    previewSteps: ['Guess', 'Read hint', 'Shrink range'],
    variants: [
      { id: 'sprint', name: 'Sprint', icon: '⚡', desc: 'A compact 1-50 range for quick rounds.', path: '/games/higher-lower/sprint', previewSteps: ['Fast range', 'Quick hints', 'Exact hit'] },
      { id: 'classic', name: 'Classic', icon: '🔢', desc: 'The familiar 1-100 guessing window.', path: '/games/higher-lower', previewSteps: ['1-100', 'Narrow down', 'Win'] },
      { id: 'expert', name: 'Expert', icon: '🧩', desc: 'A wider 1-200 range with more pressure.', path: '/games/higher-lower/expert', previewSteps: ['Wide range', 'Sharper reads', 'Exact hit'] },
    ],
    playerCount: 2,
    playerLabel: '2 Players',
    difficulty: 'easy',
    estimatedTime: '2-4 min',
    tags: ['quick', 'numbers'],
    featured: false,
  },
  {
    id: 'stop-clock',
    gameType: 'stop_clock',
    name: 'The 20-Second Challenge',
    icon: '⏱️',
    description: 'Start the timer and stop it at exactly 20 seconds. Closest wins.',
    players: '2 Players',
    category: 'Reflex',
    badgeClass: 'badge-blue',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    rulesTitle: 'Stop Clock Rules',
    rules: ['Both players ready up before the round starts.', 'Start your timer, then it hides after 3 seconds.', 'Stop as close to 20.00 seconds as possible.', 'Closest time wins.'],
    tips: ['Count in steady chunks instead of chasing the hidden timer.', 'Stopping early by a little is often safer than drifting late.'],
    previewSteps: ['Ready up', 'Timer hides', 'Stop close'],
    playerCount: 2,
    playerLabel: '2 Players',
    difficulty: 'medium',
    estimatedTime: '1-2 min',
    tags: ['reflex', 'quick', 'timing'],
    featured: true,
  },
  {
    id: 'bluff-card',
    gameType: 'bluff_card',
    name: 'Bluff Card Game',
    icon: '🂠',
    description: 'Play cards face down, claim the current rank, and decide when to call bluff.',
    players: '2 Players',
    category: 'Cards',
    badgeClass: 'badge-purple',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #be123c 100%)',
    rulesTitle: 'Bluff Rules',
    rules: ['The claim rank moves from A through K and repeats.', 'On your turn, play 1 to 4 cards face down as the current rank.', 'Your opponent may call bluff before playing.', 'If the play was false, the bluffer takes the pile; if it was honest, the challenger takes it.', 'First player to empty their hand wins.'],
    tips: ['Small honest plays make later bluffs more believable.', 'Call bluff when the claimed rank conflicts with cards you already hold.', 'A big pile is worth challenging only when you have a strong read.'],
    previewSteps: ['Claim rank', 'Play face down', 'Call bluff'],
    playerCount: 2,
    playerLabel: '2 Players',
    difficulty: 'medium',
    estimatedTime: '5-10 min',
    tags: ['cards', 'bluffing', 'couples'],
    featured: false,
  },
  {
    id: 'trivia-battle',
    gameType: 'trivia_battle',
    name: 'Trivia Battle',
    icon: '⚔️',
    description: 'Compete in real-time fast-paced trivia. Multiple choice questions across science, history, and pop culture.',
    players: '3-4 Players',
    category: 'Party',
    badgeClass: 'badge-pink',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    rulesTitle: 'Trivia Battle Rules',
    rules: ['Players answer multiple-choice questions simultaneously.', 'Faster correct answers award more points.', 'The player with the most points after 10 rounds wins.'],
    tips: ['Speed is important, but a wrong answer gives zero points.', 'Use double-score powerups wisely if available.'],
    previewSteps: ['Read question', 'Answer fast', 'Top scoreboard'],
    playerCount: 4,
    playerLabel: '3-4 Players',
    difficulty: 'easy',
    estimatedTime: '5-10 min',
    tags: ['party', 'quiz', 'friends'],
    featured: true,
    isComingSoon: true,
  },
  {
    id: 'couples-truth-dare',
    gameType: 'couples_truth_dare',
    name: 'Couples Truth & Dare',
    icon: '💖',
    description: 'An intimate and fun game for couples. Discover new things about your partner with tailored prompts and challenges.',
    players: '2 Players',
    category: 'Couples',
    badgeClass: 'badge-pink',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
    rulesTitle: 'Couples Truth & Dare Rules',
    rules: ['Take turns choosing Truth or Dare.', 'Complete the card prompt honestly or perform the dare.', 'Rate each other\'s answers to earn couple points.'],
    tips: ['Answer honestly to build deeper connections.', 'Keep the mood lighthearted and fun.'],
    previewSteps: ['Truth or Dare', 'Read prompt', 'Share & bond'],
    playerCount: 2,
    playerLabel: '2 Players',
    difficulty: 'easy',
    estimatedTime: '5-15 min',
    tags: ['couples', 'party', 'social'],
    featured: true,
    isComingSoon: true,
  },
];

const GAME_TYPE_TO_ID: Record<string, string> = {
  tic_tac_toe: 'tic-tac-toe',
  shut_the_box: 'shut-the-box',
  code_guess: 'code-guess',
  memory_flip: 'memory-flip',
  higher_lower: 'higher-lower',
  stop_clock: 'stop-clock',
  bluff_card: 'bluff-card',
};

export function getGameCatalogItem(gameTypeOrId: string | null | undefined) {
  if (!gameTypeOrId) return null;
  const id = GAME_TYPE_TO_ID[gameTypeOrId] || gameTypeOrId;
  return GAME_CATALOG.find((game) => game.id === id || game.gameType === gameTypeOrId) || null;
}

export function getGameInfo(gameTypeOrId: string | null | undefined, variant?: string | null) {
  const game = getGameCatalogItem(gameTypeOrId);
  if (!game) return null;

  if (game.gameType === 'higher_lower' && variant === 'code_breaker_number') {
    const codeBreaker = getGameCatalogItem('code_guess');
    const numberRange = codeBreaker?.variants?.find((item) => item.id === 'number-range');
    if (codeBreaker && numberRange) {
      return {
        ...codeBreaker,
        rulesTitle: numberRange.rulesTitle || codeBreaker.rulesTitle,
        rules: numberRange.rules || codeBreaker.rules,
        tips: numberRange.tips || codeBreaker.tips,
        previewSteps: numberRange.previewSteps || codeBreaker.previewSteps,
      };
    }
  }

  const selectedVariant = game.variants?.find((item) => item.id === variant);
  if (!selectedVariant) return game;

  return {
    ...game,
    rulesTitle: selectedVariant.rulesTitle || game.rulesTitle,
    rules: selectedVariant.rules || game.rules,
    tips: selectedVariant.tips || game.tips,
    previewSteps: selectedVariant.previewSteps || game.previewSteps,
  };
}