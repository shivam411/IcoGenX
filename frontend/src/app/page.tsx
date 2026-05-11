import Link from 'next/link';
import styles from './page.module.css';

const games = [
  {
    id: 'tic-tac-toe',
    name: 'Disappearing Tic-Tac-Toe',
    icon: '❌⭕',
    description: 'Classic tic-tac-toe with a twist — your oldest mark disappears after 3! No more draws.',
    players: '2 Players',
    badge: 'Strategy',
    badgeClass: 'badge-purple',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  },
  {
    id: 'shut-the-box',
    name: 'Dice Tug-of-War',
    icon: '🎲',
    description: 'Roll dice, open your cards or push back your opponent\'s. First to open all 6 wins!',
    players: '2 Players',
    badge: 'Luck & Strategy',
    badgeClass: 'badge-orange',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  },
  {
    id: 'code-guess',
    name: '4-Digit Code Breaker',
    icon: '🔐',
    description: 'Set a secret 4-digit code and try to crack your opponent\'s first. Bulls & Cows!',
    players: '2 Players',
    badge: 'Logic',
    badgeClass: 'badge-cyan',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  },
  {
    id: 'memory-flip',
    name: 'Sequence Memory Flip',
    icon: '🃏',
    description: 'Flip cards 1-9 in order. Wrong flip? Everything resets and your opponent gets a chance!',
    players: '2 Players',
    badge: 'Memory',
    badgeClass: 'badge-pink',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  },
  {
    id: 'higher-lower',
    name: 'Higher or Lower',
    icon: '🔢',
    description: 'A number between 1-100 is hidden. Take turns guessing — the range keeps shrinking!',
    players: '2 Players',
    badge: 'Quick',
    badgeClass: 'badge-green',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  {
    id: 'stop-clock',
    name: 'The 20-Second Challenge',
    icon: '⏱️',
    description: 'Start the timer and stop it at exactly 20 seconds. No peeking! Closest wins.',
    players: '2 Players',
    badge: 'Reflex',
    badgeClass: 'badge-blue',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      {/* Background Orbs */}
      <div className={styles.bgOrbs}>
        <div className={`${styles.orb} ${styles.orb1}`} />
        <div className={`${styles.orb} ${styles.orb2}`} />
        <div className={`${styles.orb} ${styles.orb3}`} />
      </div>

      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.logo}>
            <span className="text-gradient">Arena</span>
          </h1>
          <p className={styles.subtitle}>Real-time multiplayer games you can play with friends</p>
        </header>

        {/* Games Grid */}
        <div className={styles.gamesGrid}>
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className={`glass-card ${styles.gameCard}`}
            >
              <div
                className={styles.cardBanner}
                style={{ background: game.gradient }}
              >
                <span>{game.icon}</span>
              </div>
              <div className={styles.cardBody}>
                <div className={`badge ${game.badgeClass}`} style={{ marginBottom: 10 }}>
                  {game.badge}
                </div>
                <h2 className={styles.cardTitle}>{game.name}</h2>
                <p className={styles.cardDesc}>{game.description}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.playerCount}>👥 {game.players}</span>
                  <span className={`btn btn-primary btn-sm ${styles.playBtn}`}>Play Now →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
