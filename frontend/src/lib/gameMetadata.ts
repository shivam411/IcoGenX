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
    icon: 'tic-tac-toe-classic',
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
    icon: 'tic-tac-toe-disappearing',
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
    icon: 'tic-tac-toe-joker',
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
    icon: 'tic-tac-toe-gobblet',
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
    icon: 'tic-tac-toe-gravity',
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
    icon: 'tic-tac-toe-bidding',
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
    icon: 'tic-tac-toe-blind',
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
    icon: 'tic-tac-toe',
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
    icon: 'shut-the-box',
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
    icon: 'code-guess',
    description: 'Lock secret 4-digit codes or player-chosen number targets, then crack your opponent first.',
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
        icon: 'code-guess-digits',
        desc: 'Set a secret 4-digit code and crack your opponent first.',
        path: '/games/code-guess',
        previewSteps: ['Lock code', 'Guess digits', 'Use clues'],
      },
      {
        id: 'number-range',
        name: 'Number Range',
        icon: 'code-guess-number-range',
        desc: 'Both players lock a secret 1-100 number, then guess the opponent target with greater/less clues.',
        path: '/games/code-guess/number',
        rulesTitle: 'Number Range Rules',
        rules: ['Each player secretly locks one number in the allowed range.', 'On your turn, guess the number chosen by your opponent.', 'Each hint narrows your personal range higher or lower.', 'Find the opponent number first to win.'],
        tips: ['Middle guesses are steady, but off-center guesses can steal tempo.', 'Track your own narrowed range; your opponent has a separate one.'],
        previewSteps: ['Lock number', 'Guess target', 'Use clues'],
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
    icon: 'memory-flip',
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
    icon: 'higher-lower',
    description: 'Both players lock secret numbers across Sprint, Classic, or Expert ranges, then guess head-to-head.',
    players: '2 Players',
    category: 'Quick',
    badgeClass: 'badge-green',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    rulesTitle: 'Higher or Lower Rules',
    rules: ['Each player secretly locks one number in the variant range.', 'On your turn, guess the number chosen by your opponent.', 'Each hint tells you whether the opponent number is higher or lower.', 'Your personal range shrinks after every miss.', 'Find the exact number first to win.'],
    tips: ['Use your range bar, not the original max, when choosing.', 'A narrow miss can hand the next player an easy finish.', 'Your range and your opponent\'s range can diverge quickly.'],
    previewSteps: ['Lock number', 'Guess target', 'Shrink range'],
    variants: [
      { id: 'sprint', name: 'Sprint', icon: 'higher-lower-sprint', desc: 'A compact 1-50 range for quick rounds.', path: '/games/higher-lower/sprint', previewSteps: ['Fast range', 'Quick hints', 'Exact hit'] },
      { id: 'classic', name: 'Classic', icon: 'higher-lower-classic', desc: 'The familiar 1-100 guessing window.', path: '/games/higher-lower', previewSteps: ['1-100', 'Narrow down', 'Win'] },
      { id: 'expert', name: 'Expert', icon: 'higher-lower-expert', desc: 'A wider 1-200 range with more pressure.', path: '/games/higher-lower/expert', previewSteps: ['Wide range', 'Sharper reads', 'Exact hit'] },
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
    icon: 'stop-clock',
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
    icon: 'bluff-card',
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
    id: 'checkers',
    gameType: 'checkers',
    name: 'Checkers Variants',
    icon: 'checkers',
    description: 'Play classic checkers or tactical twists with mines, VIP pieces, portals, and infection captures.',
    players: '2 Players',
    category: 'Strategy',
    badgeClass: 'badge-blue',
    gradient: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
    rulesTitle: 'Checkers Rules',
    rules: ['Move diagonally on dark squares toward the opposite side.', 'Jump an adjacent opponent piece to capture it.', 'If any capture is available, you must take a capture.', 'Reach the far side to crown a king that can move both directions.', 'Remove all opponent moves or pieces to win.'],
    tips: ['Keep back-row guards until you can crown safely.', 'Build trades that force the capture sequence you want.', 'Kings are tempo engines; protect the path to promotion.'],
    previewSteps: ['Move diagonally', 'Force jumps', 'Crown kings'],
    variants: [
      { id: 'classic', name: 'Classic', icon: 'checkers-classic', desc: 'Standard capture-and-crown checkers.', path: '/games/checkers', previewSteps: ['Advance', 'Jump', 'Crown'] },
      { id: 'anti', name: 'Anti-Checkers', icon: 'checkers-anti', desc: 'Losing all pieces or running out of moves wins.', path: '/games/checkers/anti', rulesTitle: 'Anti-Checkers Rules', rules: ['Normal movement and forced captures still apply.', 'If you lose all pieces or cannot move, you win instead of lose.', 'Use sacrifices to empty your side before your opponent can do the same.'], tips: ['Offer captures that leave your opponent with awkward material.', 'Avoid crowning unless it helps you shed pieces faster.'], previewSteps: ['Sacrifice', 'Force takes', 'Empty first'] },
      { id: 'zombie', name: 'Zombie Checkers', icon: 'checkers-zombie', desc: 'Captured pieces convert to your side instead of leaving the board.', path: '/games/checkers/zombie', rulesTitle: 'Zombie Rules', rules: ['Jumped pieces become yours instead of being removed.', 'Converted pieces can be used on later turns.', 'Win by taking over the board or trapping the opponent.'], tips: ['Chain conversions near the center for maximum reach.', 'A bad capture can hand the opponent a stronger army.'], previewSteps: ['Jump', 'Convert', 'Swarm'] },
      { id: 'minefield', name: 'Minefield', icon: 'checkers-minefield', desc: 'Both players secretly place traps before the first move.', path: '/games/checkers/minefield', rulesTitle: 'Minefield Rules', rules: ['Before play, each player secretly marks up to three mine squares.', 'When an opponent lands on your mine, the landing area explodes.', 'Explosions remove nearby pieces and clear the mine.'], tips: ['Put mines where forced jumps are likely to end.', 'Leave yourself escape squares around suspected traps.'], previewSteps: ['Hide mines', 'Lure jumps', 'Trigger blast'] },
      { id: 'vip', name: 'VIP', icon: 'checkers-vip', desc: 'Choose one secret protected piece; capturing it wins instantly.', path: '/games/checkers/vip', rulesTitle: 'VIP Rules', rules: ['Before play, each player secretly chooses one of their pieces as VIP.', 'Capturing the opposing VIP wins immediately.', 'VIP identity is hidden from the opponent until it matters.'], tips: ['Move decoys like they matter.', 'Do not strand your VIP without a trade route.'], previewSteps: ['Choose VIP', 'Hide intent', 'Capture target'] },
      { id: 'portal', name: 'Portal', icon: 'checkers-portal', desc: 'Landing on paired portal squares teleports the moving piece.', path: '/games/checkers/portal', rulesTitle: 'Portal Rules', rules: ['Portal squares appear in pairs near the center.', 'A piece that lands on a portal moves to its paired portal.', 'Portal travel ends the jump sequence for that turn.'], tips: ['Use portals to dodge blocks or create sudden crowning routes.', 'Watch portal exits before forcing captures.'], previewSteps: ['Find portal', 'Teleport', 'Reposition'] },
    ],
    playerCount: 2,
    playerLabel: '2 Players',
    difficulty: 'medium',
    estimatedTime: '8-15 min',
    tags: ['strategy', 'board', 'variants'],
    featured: true,
  },
  {
    id: 'drop-four',
    gameType: 'drop_four',
    name: 'Drop Four Chaos',
    icon: 'drop-four',
    description: 'Connect four in a vertical grid with detonations, popouts, flipped gravity, hidden cells, and heavy tokens.',
    players: '2 Players',
    category: 'Strategy',
    badgeClass: 'badge-cyan',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #22c55e 100%)',
    rulesTitle: 'Drop Four Rules',
    rules: ['Drop tokens into one of seven columns.', 'Tokens fall under the current gravity direction.', 'Connect four horizontally, vertically, or diagonally to win.', 'Full columns cannot accept more tokens.'],
    tips: ['Build threats in two directions so one block is not enough.', 'Middle columns create the most diagonal options.', 'Count what each drop gives your opponent on the next turn.'],
    previewSteps: ['Choose column', 'Drop token', 'Connect four'],
    variants: [
      { id: 'classic', name: 'Classic', icon: 'drop-four-classic', desc: 'Standard gravity-based four-in-a-row.', path: '/games/drop-four', previewSteps: ['Drop', 'Stack', 'Connect'] },
      { id: 'wrecking-ball', name: 'Wrecking Ball', icon: 'drop-four-wrecking-ball', desc: 'Each player gets one detonating token that removes adjacent pieces.', path: '/games/drop-four/wrecking-ball', rulesTitle: 'Wrecking Ball Rules', rules: ['Each player has one Wrecking Ball token.', 'It drops like normal, then removes itself and all adjacent tokens.', 'Gravity compacts the affected columns before wins are checked.'], tips: ['Use the blast to break a loaded center stack.', 'A detonation can accidentally create a line after gravity settles.'], previewSteps: ['Arm token', 'Detonate', 'Settle'] },
      { id: 'popout', name: 'PopOut', icon: 'drop-four-popout', desc: 'Remove one of your own bottom tokens instead of dropping.', path: '/games/drop-four/popout', rulesTitle: 'PopOut Rules', rules: ['On your turn, drop normally or pop one of your own bottom tokens.', 'The remaining pieces in that column slide down.', 'Wins are checked after the popout settles.'], tips: ['Popouts can turn old stacks into sudden diagonals.', 'Do not pop a support piece that gifts the opponent a line.'], previewSteps: ['Drop', 'Pop base', 'Shift line'] },
      { id: 'gravity-flip', name: 'Gravity Flip', icon: 'drop-four-gravity-flip', desc: 'Each player can invert the grid once.', path: '/games/drop-four/gravity-flip', rulesTitle: 'Gravity Flip Rules', rules: ['Each player has one Flip Gravity power.', 'Flipping turns the board upside down and reverses gravity.', 'The board compacts under the new gravity before wins are checked.'], tips: ['Flip when the opponent stack depends on old support.', 'Plan where your tokens land after inversion.'], previewSteps: ['Build', 'Flip', 'Reconnect'] },
      { id: 'battleship-drop', name: 'Battleship Drop', icon: 'drop-four-battleship-drop', desc: 'The lower half of the grid is masked until pieces rise above it.', path: '/games/drop-four/battleship-drop', rulesTitle: 'Battleship Drop Rules', rules: ['The lower half of the grid is hidden from both players.', 'Drops still resolve server-side with normal gravity.', 'Visible top cells reveal normally when stacks rise above the screen.'], tips: ['Track column counts carefully.', 'Use opponent hesitation as a memory clue.'], previewSteps: ['Drop blind', 'Remember stacks', 'Reveal top'] },
      { id: 'heavy-token', name: 'Heavy Token', icon: 'drop-four-heavy-token', desc: 'Each player gets one token that crushes the piece beneath it.', path: '/games/drop-four/heavy-token', rulesTitle: 'Heavy Token Rules', rules: ['Each player has one Heavy token.', 'When dropped, it crushes exactly one non-heavy token beneath it.', 'Heavy tokens cannot crush other Heavy tokens.'], tips: ['Save the heavy token for a defended column.', 'Crushing can open space and create a new landing pattern.'], previewSteps: ['Arm heavy', 'Crush', 'Connect'] },
    ],
    playerCount: 2,
    playerLabel: '2 Players',
    difficulty: 'medium',
    estimatedTime: '5-12 min',
    tags: ['strategy', 'gravity', 'board'],
    featured: true,
  },
  {
    id: 'trivia-battle',
    gameType: 'trivia_battle',
    name: 'Trivia Battle',
    icon: 'trivia-battle',
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
  },
  {
    id: 'couples-truth-dare',
    gameType: 'couples_truth_dare',
    name: 'Couples Truth & Dare',
    icon: 'couples-truth-dare',
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
  {
    id: 'row-call',
    gameType: 'row_call',
    name: 'Row Call',
    icon: 'row-call',
    description: 'Dictate your opponent\'s next move in this strategic 4x4 line-connecting game.',
    players: '2 Players',
    category: 'Strategy',
    badgeClass: 'badge-purple',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
    rulesTitle: 'Row Call Rules',
    rules: [
      'Take turns placing tokens on the 4x4 grid (A-D, 1-4).',
      'The first player places a token anywhere and calls a Row or Column.',
      'The opponent MUST place their next token inside that called Row or Column.',
      'After placing their token, that player then calls a Row or Column for the other player\'s next move.',
      'You cannot call a Row or Column that is already completely full.',
      'Connect four of your tokens in a straight line (horizontally, vertically, or diagonally) to win.'
    ],
    tips: [
      'Block your opponent\'s threats while setting up your own 4-in-a-row.',
      'Call rows/columns where your opponent has no good moves or is forced to play in your threat line.',
      'Keep track of which rows and columns are close to full; they limit your opponent\'s exit options.'
    ],
    previewSteps: ['Place token', 'Call Row/Col', 'Force opponent'],
    playerCount: 2,
    playerLabel: '2 Players',
    difficulty: 'medium',
    estimatedTime: '3-6 min',
    tags: ['strategy', 'couples', 'board'],
    featured: true,
  },
  {
    id: 'dice-grid',
    gameType: 'dice_grid',
    name: 'The Dice Grid',
    icon: 'dice-grid',
    description: 'Roll dice, map coordinates, and connect four of your symbols in a line.',
    players: '2 Players',
    category: 'Strategy',
    badgeClass: 'badge-cyan',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    rulesTitle: 'The Dice Grid Rules',
    rules: [
      'On your turn, roll two six-sided dice.',
      'The roll generates a coordinate pair (e.g. 4 and 1 lets you place at Row 4 Col 1 or Row 1 Col 4).',
      'Select and claim one empty coordinate matching your roll.',
      'Double rolls only offer one coordinate.',
      'If both coordinate options are occupied, your turn ends immediately without placement.',
      'First to connect four symbols in a straight line (horizontal, vertical, diagonal) wins.'
    ],
    tips: [
      'Always check both coordinate options to block your opponent or extend your own chain.',
      'Set up forks where two different rolls can complete your four-in-a-row.',
      'Double rolls (like 3-3) are restrictive but can secure key center coordinates.'
    ],
    previewSteps: ['Roll dice', 'Choose coordinate', 'Connect four'],
    variants: [
      { id: 'classic', name: 'Classic', icon: 'dice-grid-classic', desc: 'Standard 6x6 grid with coordinate selection.', path: '/games/dice-grid', previewSteps: ['Roll', 'Select', 'Align'] },
      { id: 'obstacles', name: 'Block Obstacles', icon: 'dice-grid-obstacles', desc: 'The grid starts with three random cells blocked by dark obstacles.', path: '/games/dice-grid/obstacles', rulesTitle: 'Obstacles Rules', rules: ['Three random grid spaces are blocked by obstacles at start.', 'Obstacles cannot be claimed by either player.', 'Connect four around the obstacles to win.'], tips: ['Use obstacles to divide the board and isolate your opponent.', 'Calculate routes that wrap around the blocked cells.'], previewSteps: ['Scramble board', 'Avoid obstacles', 'Build chain'] }
    ],
    playerCount: 2,
    playerLabel: '2 Players',
    difficulty: 'medium',
    estimatedTime: '3-8 min',
    tags: ['strategy', 'dice', 'board'],
    featured: true,
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
  checkers: 'checkers',
  drop_four: 'drop-four',
  trivia_battle: 'trivia-battle',
  row_call: 'row-call',
  dice_grid: 'dice-grid',
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
        icon: numberRange.icon,
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
    icon: selectedVariant.icon,
    rulesTitle: selectedVariant.rulesTitle || game.rulesTitle,
    rules: selectedVariant.rules || game.rules,
    tips: selectedVariant.tips || game.tips,
    previewSteps: selectedVariant.previewSteps || game.previewSteps,
  };
}