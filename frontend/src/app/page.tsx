'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getGamePath, useGame } from '@/context/GameContext';
import { GAME_CATALOG, type GameCatalogItem } from '@/lib/gameMetadata';
import styles from './page.module.css';

const games: GameCatalogItem[] = GAME_CATALOG;

export default function HomePage() {
  const router = useRouter();
  const { joinRoom, connected, error, gameStarted, gameType, variant } = useGame();
  
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedGame, setSelectedGame] = useState<GameCatalogItem | null>(null);
  
  // Quick Join State
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [quickJoinPending, setQuickJoinPending] = useState(false);

  // Load saved name from storage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('arena_player_name');
    if (savedName) setJoinName(savedName);
  }, []);

  useEffect(() => {
    if (!quickJoinPending || !gameStarted || !gameType) return;

    const path = getGamePath(gameType, variant);
    if (!path) return;
    setQuickJoinPending(false);
    router.push(path);
  }, [quickJoinPending, gameStarted, gameType, variant, router]);

  useEffect(() => {
    if (error) setQuickJoinPending(false);
  }, [error]);

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
    setQuickJoinPending(true);
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
                if (game.variants) {
                  setSelectedGame(game);
                } else {
                  router.push(`/games/${game.id}`);
                }
              }}
              className={`glass-card ${styles.gameCard}`}
            >
              <div className={styles.variantBadge}>
                {game.variants?.length ? `${game.variants.length} variants` : '1 mode'}
              </div>
              <div
                className={styles.cardBanner}
                style={{ background: game.gradient }}
              >
                <span>{game.icon}</span>
                <div className={styles.gameplayPreview}>
                  <div className={styles.previewTitle}>Gameplay</div>
                  <div className={styles.previewSteps}>
                    {game.previewSteps.map((step) => (
                      <span key={step}>{step}</span>
                    ))}
                  </div>
                </div>
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
      {selectedGame?.variants && (
        <div className={styles.modalOverlay} onClick={() => setSelectedGame(null)}>
          <div className={`glass-card ${styles.modalCard}`} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Choose Variant</h2>
            <p className={styles.modalSub}>Select which version of {selectedGame.name.replace(' Variants', '')} you want to play</p>
            
            <div className={styles.variantList}>
              {selectedGame.variants.map(v => (
                <Link key={v.id} href={v.path} className={styles.variantItem}>
                  <div className={styles.variantIcon}>{v.icon}</div>
                  <div>
                    <h3 className={styles.variantName}>{v.name}</h3>
                    <p className={styles.variantDesc}>{v.desc}</p>
                  </div>
                  <div className={styles.variantArrow}>→</div>
                </Link>
              ))}
            </div>
            
            <button className={`btn btn-ghost ${styles.closeBtn}`} onClick={() => setSelectedGame(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
