'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getGamePath, useGame } from '@/context/GameContext';
import { GAME_CATALOG, type GameCatalogItem } from '@/lib/gameMetadata';
import styles from './page.module.css';

const games: GameCatalogItem[] = GAME_CATALOG;

export default function HomePage() {
  const router = useRouter();
  const { joinRoom, connected, roomCode, gameType, variant, pendingRoomAction } = useGame();

  const [filter, setFilter] = useState('All');
  const [playerFilter, setPlayerFilter] = useState<'all' | '2p' | '3-4p'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [quizMood, setQuizMood] = useState<string | null>('strategy');

  // Quick join room inputs
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const quickJoinPending = pendingRoomAction?.kind === 'joining';

  // Interactive Mini-Demo Board State (Hero interactive mini-game)
  const [demoBoard, setDemoBoard] = useState<(string | null)[]>(['X', null, 'O', null, 'X', null, 'O', null, null]);
  const [demoTurn, setDemoTurn] = useState<'X' | 'O'>('X');
  const [demoWinner, setDemoWinner] = useState<string | null>(null);

  const catalogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('arena_player_name');
    if (savedName) setJoinName(savedName);
  }, []);

  useEffect(() => {
    if (pendingRoomAction || !roomCode || !gameType) return;
    const path = getGamePath(gameType, variant);
    if (!path) return;
    router.push(path);
  }, [pendingRoomAction, roomCode, gameType, variant, router]);

  // Mini-game click handler for live hero experience
  const handleDemoCellClick = (index: number) => {
    if (demoBoard[index] || demoWinner) return;
    const nextBoard = [...demoBoard];
    nextBoard[index] = demoTurn;
    setDemoBoard(nextBoard);

    // Simple check
    const winningLines = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6]
    ];
    let won = false;
    for (const [a, b, c] of winningLines) {
      if (nextBoard[a] && nextBoard[a] === nextBoard[b] && nextBoard[a] === nextBoard[c]) {
        setDemoWinner(nextBoard[a]);
        won = true;
        break;
      }
    }

    if (!won) {
      setDemoTurn(demoTurn === 'X' ? 'O' : 'X');
    }
  };

  const resetDemo = () => {
    setDemoBoard([null, null, null, null, null, null, null, null, null]);
    setDemoTurn('X');
    setDemoWinner(null);
  };

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickJoinPending) return;
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

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const { totalGames, totalVariants } = useMemo(() => {
    const variantCount = games.reduce((sum, g) => sum + (g.variants?.length ?? 1), 0);
    return { totalGames: games.length, totalVariants: variantCount };
  }, []);

  // Filtered games logic
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      const matchesCategory = filter === 'All' || g.category === filter;
      let matchesPlayerCount = true;
      if (playerFilter === '2p') matchesPlayerCount = g.playerCount === 2;
      else if (playerFilter === '3-4p') matchesPlayerCount = g.playerCount >= 3;
      return matchesCategory && matchesPlayerCount;
    });
  }, [filter, playerFilter]);

  // Quiz Recommendations
  const quizRecommendedGames = useMemo(() => {
    if (!quizMood) return games.slice(0, 3);
    if (quizMood === 'strategy') return games.filter(g => g.category === 'Strategy').slice(0, 3);
    if (quizMood === 'quick') return games.filter(g => g.estimatedTime.includes('1') || g.estimatedTime.includes('2')).slice(0, 3);
    if (quizMood === 'couples') return games.filter(g => g.tags.includes('couples')).slice(0, 3);
    if (quizMood === 'logic') return games.filter(g => g.category === 'Logic').slice(0, 3);
    if (quizMood === 'party') return games.filter(g => g.category === 'Party').slice(0, 3);
    return games.slice(0, 3);
  }, [quizMood]);

  return (
    <div className={styles.page}>
      {/* Dynamic Background Effects */}
      <div className={styles.bgOrbs} aria-hidden>
        <div className={`${styles.orb} ${styles.orb1}`} />
        <div className={`${styles.orb} ${styles.orb2}`} />
        <div className={`${styles.orb} ${styles.orb3}`} />
        <div className={styles.bgGrid} />
      </div>

      <div className={styles.content}>
        
        {/* ==================== HERO SECTION ==================== */}
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.dot} aria-hidden />
              <span>Real-Time WebSockets · Instant Room Codes · 100% Free</span>
            </div>

            <h1 className={styles.heroTitle}>
              PLAY FREE MULTIPLAYER<br />
              <span className={styles.heroAccent}>BROWSER GAMES</span>
            </h1>

            <p className={styles.heroSub}>
              Instant 6-character room codes. Zero downloads or sign-ups required.
              Challenge friends, family, or partners to 36+ real-time strategy, logic, and reflex games.
            </p>

            <div className={styles.heroActions}>
              <button type="button" className={`btn btn-primary ${styles.heroCtaMain}`} onClick={scrollToCatalog}>
                🎮 Browse 36+ Games
              </button>
              <button
                type="button"
                className={`btn btn-ghost ${styles.heroCtaJoin}`}
                onClick={() => setJoinOpen(!joinOpen)}
                aria-expanded={joinOpen}
              >
                {joinOpen ? '× Close Quick Join' : '⚡ Quick Join Room'}
              </button>
            </div>

            <dl className={styles.heroStats} aria-label="IcoGenX Metrics">
              <div className={styles.heroStat}>
                <dt>Free Games</dt>
                <dd>{totalGames}</dd>
              </div>
              <div className={styles.heroStat}>
                <dt>Game Variants</dt>
                <dd>{totalVariants}</dd>
              </div>
              <div className={styles.heroStat}>
                <dt>Netcode</dt>
                <dd>WebSockets</dd>
              </div>
              <div className={styles.heroStat}>
                <dt>Sign-Up</dt>
                <dd>Optional</dd>
              </div>
            </dl>
          </div>

          {/* Right Side: Interactive Live Mini-Game Demo */}
          <aside className={styles.heroVisual}>
            <div className={styles.interactiveDemoCard}>
              <div className={styles.demoCardHeader}>
                <span className={styles.demoBadge}>Interactive Demo</span>
                <span className={styles.demoTitle}>Play Disappearing Tic-Tac-Toe</span>
              </div>

              <div className={styles.miniBoard}>
                {demoBoard.map((cell, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles.miniCell} ${cell === 'X' ? styles.cellX : cell === 'O' ? styles.cellO : ''}`}
                    onClick={() => handleDemoCellClick(idx)}
                    disabled={!!cell || !!demoWinner}
                  >
                    {cell}
                  </button>
                ))}
              </div>

              <div className={styles.demoStatus}>
                {demoWinner ? (
                  <p className={styles.winText}>✨ Player {demoWinner} Wins! <button onClick={resetDemo} className={styles.resetBtn}>Reset Demo</button></p>
                ) : (
                  <p>Current Turn: <strong>Player {demoTurn}</strong></p>
                )}
              </div>

              <Link href="/games/tic-tac-toe" className={styles.demoPlayFullBtn}>
                Play Full Room Game →
              </Link>
            </div>
          </aside>
        </section>

        {/* ==================== QUICK JOIN SLIDE-DOWN ==================== */}
        {joinOpen && (
          <div id="quick-join-panel" className={`glass-card ${styles.joinPanel}`}>
            <h3 className={styles.joinPanelTitle}>⚡ Join a Private Room</h3>
            <form onSubmit={handleQuickJoin} className={styles.joinForm}>
              <div className={styles.joinFields}>
                <label className={styles.joinField}>
                  <span>Your Name</span>
                  <input
                    className={styles.joinInput}
                    placeholder="e.g. Shivam"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    maxLength={15}
                    autoFocus
                  />
                </label>
                <label className={styles.joinField}>
                  <span>6-Character Room Code</span>
                  <input
                    className={`${styles.joinInput} ${styles.joinInputCode}`}
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                </label>
              </div>
              <button
                type="submit"
                className={`btn btn-primary ${styles.joinSubmit}`}
                disabled={!connected || quickJoinPending}
              >
                {!connected ? 'Connecting…' : quickJoinPending ? 'Joining…' : 'Join Room →'}
              </button>
            </form>
            {joinError && <p className={styles.joinErrorMsg}>{joinError}</p>}
          </div>
        )}

        {/* ==================== LIVE ACTIVITY PULSE BAR ==================== */}
        <section className={styles.activityBar}>
          <div className={styles.activityItem}>
            <span className={styles.pulseDot} />
            <span>Real-Time Matchmaking Active</span>
          </div>
          <div className={styles.activityItem}>
            <span>⚡ Ultra-Low Latency WebSocket Server</span>
          </div>
          <div className={styles.activityItem}>
            <span>🛡️ 100% Free &amp; Guest Ready</span>
          </div>
        </section>

        {/* ==================== FIND YOUR GAME QUIZ ==================== */}
        <section className={styles.quizSection}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionTag}>🎯 Instant Game Recommender</span>
            <h2>Find Your Game in Seconds</h2>
            <p>What kind of experience are you looking for today?</p>
          </header>

          <div className={styles.quizTabs}>
            <button
              type="button"
              className={`${styles.quizTab} ${quizMood === 'strategy' ? styles.quizTabActive : ''}`}
              onClick={() => setQuizMood('strategy')}
            >
              ♟️ Strategy &amp; Tactics
            </button>
            <button
              type="button"
              className={`${styles.quizTab} ${quizMood === 'quick' ? styles.quizTabActive : ''}`}
              onClick={() => setQuizMood('quick')}
            >
              ⚡ 2-Minute Quick Match
            </button>
            <button
              type="button"
              className={`${styles.quizTab} ${quizMood === 'couples' ? styles.quizTabActive : ''}`}
              onClick={() => setQuizMood('couples')}
            >
              ❤️ Date Night / Couples
            </button>
            <button
              type="button"
              className={`${styles.quizTab} ${quizMood === 'logic' ? styles.quizTabActive : ''}`}
              onClick={() => setQuizMood('logic')}
            >
              🧠 Logic &amp; Code Breaking
            </button>
            <button
              type="button"
              className={`${styles.quizTab} ${quizMood === 'party' ? styles.quizTabActive : ''}`}
              onClick={() => setQuizMood('party')}
            >
              🎉 3-4 Player Party
            </button>
          </div>

          <div className={styles.quizGrid}>
            {quizRecommendedGames.map((game) => (
              <div key={game.id} className={styles.quizCard}>
                <div className={styles.quizCardHeader}>
                  <span className={`badge ${game.badgeClass}`}>{game.category}</span>
                  <span className={styles.quizTime}>⏱️ {game.estimatedTime}</span>
                </div>
                <h3 className={styles.quizCardTitle}>{game.name}</h3>
                <p className={styles.quizCardDesc}>{game.description}</p>
                <Link href={`/games/${game.id}`} className="btn btn-primary btn-sm">
                  Play Now →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ==================== FEATURED GAMES ==================== */}
        <section className={styles.featuredSection}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionTag}>✨ Trending Titles</span>
            <h2>Popular 2-Player &amp; Multiplayer Browser Games</h2>
            <p>Handpicked strategy, logic, and reflex games ready for instant room code matches.</p>
          </header>

          <div className={styles.featuredGrid}>
            {games.filter(g => g.featured).slice(0, 4).map((game) => (
              <article key={game.id} className={`glass-card ${styles.featuredCard}`}>
                <div className={styles.featuredBanner} style={{ background: game.gradient }}>
                  <div className={styles.featuredBadge}>{game.variants?.length || 1} Mode</div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.tagRow}>
                    <span className={`badge ${game.badgeClass}`}>{game.category}</span>
                    <span className={styles.playerTag}>👥 {game.players}</span>
                  </div>
                  <h3 className={styles.cardTitle}>
                    <Link href={`/games/${game.id}`}>{game.name}</Link>
                  </h3>
                  <p className={styles.cardDesc}>{game.description}</p>
                  <div className={styles.cardFooter}>
                    <span>⏱️ {game.estimatedTime}</span>
                    <Link href={`/games/${game.id}`} className="btn btn-primary btn-sm">
                      Play Now →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ==================== CATEGORY EXPLORER ==================== */}
        <section className={styles.categorySection} id="game-catalog" ref={catalogRef}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionTag}>🎯 Explore By Genre</span>
            <h2>Discover Games by Category</h2>
          </header>

          <div className={styles.filterRow}>
            {['All', 'Strategy', 'Logic', 'Memory', 'Quick', 'Reflex', 'Cards', 'Party', 'Couples'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${styles.filterBtn} ${filter === cat ? styles.filterBtnActive : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className={styles.catalogGrid}>
            {filteredGames.map((game) => (
              <article key={game.id} className={styles.catalogCard}>
                <div className={styles.catalogCardBody}>
                  <span className={`badge ${game.badgeClass}`}>{game.category}</span>
                  <h3 className={styles.catalogTitle}>
                    <Link href={`/games/${game.id}`}>{game.name}</Link>
                  </h3>
                  <p className={styles.catalogDesc}>{game.description}</p>
                  <div className={styles.catalogFooter}>
                    <span>👥 {game.playerLabel}</span>
                    <Link href={`/games/${game.id}`} className="btn btn-primary btn-sm">
                      Play →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ==================== HOW IT WORKS TIMELINE ==================== */}
        <section className={styles.howItWorksSection}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionTag}>⚡ Zero Friction</span>
            <h2>How a Match Flows on IcoGenX</h2>
          </header>

          <div className={styles.timelineGrid}>
            <div className={styles.timelineCard}>
              <div className={styles.timelineStep}>1</div>
              <h3>Pick a Game &amp; Variant</h3>
              <p>Choose from 36+ strategy, logic, and reflex browser games.</p>
            </div>
            <div className={styles.timelineCard}>
              <div className={styles.timelineStep}>2</div>
              <h3>Share 6-Digit Code</h3>
              <p>Click 'Create Room' and send the 6-character link to your friend.</p>
            </div>
            <div className={styles.timelineCard}>
              <div className={styles.timelineStep}>3</div>
              <h3>Play Real-Time</h3>
              <p>Powered by Rust WebSockets for instant, lag-free move synchronization.</p>
            </div>
            <div className={styles.timelineCard}>
              <div className={styles.timelineStep}>4</div>
              <h3>Rematch Instantly</h3>
              <p>Finish your match and hit rematch without leaving the room.</p>
            </div>
          </div>
        </section>

        {/* ==================== SEO-OPTIMIZED SSR GUIDE COPY ==================== */}
        <section className={styles.seoContentSection}>
          <h2>Free 2-Player Online Games with Instant Room Codes</h2>
          <p>
            Welcome to <strong>IcoGenX</strong>, the modern indie multiplayer gaming platform built for quick, clever, and tactical 2-player browser matches.
            Whether you want to play a quick 2-minute round of <em>Disappearing Tic-Tac-Toe</em>, test your deductive reasoning in <em>Code Breaker</em>, or invert gravity in <em>Drop Four Chaos</em>, IcoGenX makes online gaming effortless.
          </p>

          <h3>Why Choose IcoGenX for Online Multiplayer Games?</h3>
          <ul>
            <li><strong>Zero Install Required:</strong> Play natively inside Chrome, Safari, Firefox, or mobile browsers.</li>
            <li><strong>Instant Private Lobbies:</strong> Share 6-character room codes with friends to join the same match in under 5 seconds.</li>
            <li><strong>High-Performance Netcode:</strong> Powered by Rust WebSockets for real-time move synchronization.</li>
          </ul>

          <h3>Frequently Asked Questions (FAQ)</h3>
          <div className={styles.faqList}>
            <details className={styles.faqItem}>
              <summary><h4>Are all games on IcoGenX free to play?</h4></summary>
              <p>Yes! Every game and variant on IcoGenX is 100% free with no paywalls or mandatory account sign-ups.</p>
            </details>
            <details className={styles.faqItem}>
              <summary><h4>Do I need to download an application?</h4></summary>
              <p>No downloads are needed. All games run directly inside desktop and mobile web browsers.</p>
            </details>
            <details className={styles.faqItem}>
              <summary><h4>How do room codes work?</h4></summary>
              <p>Generating a room creates a 6-character code (e.g. <code>ABC123</code>). Send that code to your friend so they can join your lobby instantly.</p>
            </details>
          </div>
        </section>

      </div>
    </div>
  );
}
