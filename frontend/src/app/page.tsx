'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import styles from './page.module.css';

const games = [
  {
    id: 'tic-tac-toe',
    name: 'Tic-Tac-Toe Variants',
    icon: '❌⭕',
    description: 'Play Classic, Disappearing, or Joker Tic-Tac-Toe. No more boring draws!',
    players: '2 Players',
    category: 'Strategy',
    badgeClass: 'badge-purple',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    hasVariants: true,
  },
  {
    id: 'shut-the-box',
    name: 'Dice Tug-of-War',
    icon: '🎲',
    description: 'Roll dice, open your cards or push back your opponent\'s. First to open all 6 wins!',
    players: '2 Players',
    category: 'Strategy',
    badgeClass: 'badge-orange',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    hasVariants: false,
  },
  {
    id: 'code-guess',
    name: '4-Digit Code Breaker',
    icon: '🔐',
    description: 'Set a secret 4-digit code and try to crack your opponent\'s first. Bulls & Cows!',
    players: '2 Players',
    category: 'Logic',
    badgeClass: 'badge-cyan',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    hasVariants: false,
  },
  {
    id: 'memory-flip',
    name: 'Sequence Memory Flip',
    icon: '🃏',
    description: 'Flip cards 1-9 in order. Wrong flip? Everything resets and your opponent gets a chance!',
    players: '2 Players',
    category: 'Memory',
    badgeClass: 'badge-pink',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    hasVariants: false,
  },
  {
    id: 'higher-lower',
    name: 'Higher or Lower',
    icon: '🔢',
    description: 'A number between 1-100 is hidden. Take turns guessing — the range keeps shrinking!',
    players: '2 Players',
    category: 'Quick',
    badgeClass: 'badge-green',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    hasVariants: false,
  },
  {
    id: 'stop-clock',
    name: 'The 20-Second Challenge',
    icon: '⏱️',
    description: 'Start the timer and stop it at exactly 20 seconds. No peeking! Closest wins.',
    players: '2 Players',
    category: 'Reflex',
    badgeClass: 'badge-blue',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    hasVariants: false,
  },
];

const variants = [
  {
    id: 'classic',
    name: 'Classic',
    icon: '📝',
    desc: 'Normal 3x3. Draws are possible.'
  },
  {
    id: 'disappearing',
    name: 'Disappearing',
    icon: '🪄',
    desc: 'Max 3 marks. Oldest vanishes!'
  },
  {
    id: 'joker',
    name: 'Joker Cell',
    icon: '🃏',
    desc: 'One cell is gold and acts as X and O.'
  }
];

export default function HomePage() {
  const router = useRouter();
  const { joinRoom, connected, gameType, variant, gameStarted, error, resetGame } = useGame();
  
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [showVariants, setShowVariants] = useState(false);
  
  // Quick Join State
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Track if game was already started when we landed here
  const initialGameStarted = useRef(gameStarted);

  // Handle redirect when successfully joined from home
  useEffect(() => {
    if (gameStarted && gameType) {
      // If the game was already started when we landed on the home page, DON'T redirect
      // Instead, we will show the top banner. 
      // Only redirect if gameStarted just flipped to true (e.g. they just joined or auto-reconnected)
      if (initialGameStarted.current) {
        return;
      }
      
      if (gameType === 'tic_tac_toe') {
        router.push(`/games/tic-tac-toe/${variant || 'classic'}`);
      } else {
        router.push(`/games/${gameType.replace(/_/g, '-')}`);
      }
    }
  }, [gameStarted, gameType, variant, router]);

  // Load saved name from storage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('arena_player_name');
    if (savedName) setJoinName(savedName);
  }, []);

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim()) {
      setJoinError('Please enter your name');
      return;
    }
    if (!joinCode.trim()) {
      setJoinError('Please enter a room code');
      return;
    }
    setJoinError('');
    joinRoom(joinCode.toUpperCase(), joinName.trim());
  };

  const categories = ['All', ...Array.from(new Set(games.map(g => g.category)))];
  
  const filteredGames = games.filter(g => filter === 'All' || g.category === filter);
  
  // Pagination
  const ITEMS_PER_PAGE = 4;
  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE);
  const paginatedGames = filteredGames.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className={styles.page}>
      {gameStarted && initialGameStarted.current && (
        <div className={styles.activeGameBanner}>
          <div className={styles.activeGameContent}>
            <span className={styles.activeGameIcon}>🎮</span>
            <div>
              <strong>Active Game in Progress</strong>
              <p>You are still connected to a room.</p>
            </div>
          </div>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              initialGameStarted.current = false;
              if (gameType === 'tic_tac_toe') {
                router.push(`/games/tic-tac-toe/${variant || 'classic'}`);
              } else if (gameType) {
                router.push(`/games/${gameType.replace(/_/g, '-')}`);
              }
            }}
          >
            Return to Game
          </button>
        </div>
      )}

      {/* Background Orbs */}
      <div className={styles.bgOrbs}>
        <div className={`${styles.orb} ${styles.orb1}`} />
        <div className={`${styles.orb} ${styles.orb2}`} />
        <div className={`${styles.orb} ${styles.orb3}`} />
      </div>

      <div className={styles.content}>
        {/* Quick Join Header */}
        <div className={styles.topNav}>
          <div className={styles.navLogo}>
            <span className="text-gradient">Arena</span>
          </div>
          
          <form onSubmit={handleQuickJoin} className={styles.quickJoinForm}>
            <span className={styles.qjLabel}>Quick Join:</span>
            <input 
              className={styles.qjInput} 
              placeholder="Your Name" 
              value={joinName}
              onChange={e => setJoinName(e.target.value)}
              maxLength={15}
            />
            <input 
              className={styles.qjInput} 
              placeholder="Room Code" 
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button type="submit" className={`btn btn-primary btn-sm ${styles.qjBtn}`} disabled={!connected}>
              {connected ? 'Join' : '...'}
            </button>
            {(joinError || error) && (
              <div className={styles.qjError}>{joinError || error}</div>
            )}
          </form>
        </div>

        {/* Hero */}
        <header className={styles.header}>
          <h1 className={styles.logo}>
            Choose your <span className="text-gradient">Game</span>
          </h1>
          <p className={styles.subtitle}>Real-time multiplayer games you can play with friends</p>
        </header>

        {/* Filters */}
        <div className={styles.filterRow}>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => { setFilter(cat); setPage(1); }}
              className={`${styles.filterBtn} ${filter === cat ? styles.filterBtnActive : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Games Grid */}
        <div className={styles.gamesGrid}>
          {paginatedGames.map((game) => (
            <div
              key={game.id}
              onClick={() => {
                if (game.hasVariants) {
                  setShowVariants(true);
                } else {
                  router.push(`/games/${game.id}`);
                }
              }}
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
                  {game.category}
                </div>
                <h2 className={styles.cardTitle}>{game.name}</h2>
                <p className={styles.cardDesc}>{game.description}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.playerCount}>👥 {game.players}</span>
                  <span className={`btn btn-primary btn-sm ${styles.playBtn}`}>Play Now →</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button 
              className="btn btn-ghost btn-sm" 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
            <button 
              className="btn btn-ghost btn-sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Variants Modal */}
      {showVariants && (
        <div className={styles.modalOverlay} onClick={() => setShowVariants(false)}>
          <div className={`glass-card ${styles.modalCard}`} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Choose Variant</h2>
            <p className={styles.modalSub}>Select which version of Tic-Tac-Toe you want to play</p>
            
            <div className={styles.variantList}>
              {variants.map(v => (
                <Link key={v.id} href={`/games/tic-tac-toe/${v.id}`} className={styles.variantItem}>
                  <div className={styles.variantIcon}>{v.icon}</div>
                  <div>
                    <h3 className={styles.variantName}>{v.name}</h3>
                    <p className={styles.variantDesc}>{v.desc}</p>
                  </div>
                  <div className={styles.variantArrow}>→</div>
                </Link>
              ))}
            </div>
            
            <button className={`btn btn-ghost ${styles.closeBtn}`} onClick={() => setShowVariants(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
