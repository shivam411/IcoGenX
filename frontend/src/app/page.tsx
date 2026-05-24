'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getGamePath, useGame } from '@/context/GameContext';
import { GAME_CATALOG, type GameCatalogItem } from '@/lib/gameMetadata';
import { getVariantMetricId } from '@/lib/socialMetrics';
import { recordGamePlay } from '@/lib/useGameSocial';
import GameCard from '@/components/GameCard';
import AdSlot from '@/components/AdSlot';
import styles from './page.module.css';

const games: GameCatalogItem[] = GAME_CATALOG;

export default function HomePage() {
  const router = useRouter();
  const { joinRoom, connected, error, roomCode, gameType, variant, pendingRoomAction } = useGame();

  const [filter, setFilter] = useState('All');
  const [playerFilter, setPlayerFilter] = useState<'all' | '2p' | '3-4p'>('all');
  const [page, setPage] = useState(1);
  const [selectedGame, setSelectedGame] = useState<GameCatalogItem | null>(null);
  const [comingSoonGame, setComingSoonGame] = useState<GameCatalogItem | null>(null);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribedGameId, setSubscribedGameId] = useState<string | null>(null);
  const [variantPlayCounts, setVariantPlayCounts] = useState<Record<string, number>>({});

  // Quick join — now a toggleable action, not always-on
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const quickJoinPending = pendingRoomAction?.kind === 'joining';

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

  useEffect(() => {
    if (!selectedGame?.variants?.length) return;

    const metricIds = selectedGame.variants.map((item) => getVariantMetricId(selectedGame.id, item.id));
    let cancelled = false;

    fetch(`/api/games/social?ids=${metricIds.join(',')}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`variant_social_${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const nextCounts: Record<string, number> = {};
        for (const metricId of metricIds) {
          nextCounts[metricId] = data.social?.[metricId]?.plays ?? 0;
        }
        setVariantPlayCounts((current) => ({ ...current, ...nextCounts }));
      })
      .catch(() => {
        if (!cancelled) setVariantPlayCounts((current) => ({ ...current }));
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGame]);

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

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribeEmail || !comingSoonGame) return;
    setSubscribedGameId(comingSoonGame.id);
    setSubscribeEmail('');
  };

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const { categories, totalGames, totalVariants } = useMemo(() => {
    const cats = ['All', ...Array.from(new Set(games.map((g) => g.category)))];
    const variantCount = games.reduce((sum, g) => sum + (g.variants?.length ?? 1), 0);
    return { categories: cats, totalGames: games.length, totalVariants: variantCount };
  }, []);

  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      // Category filter
      const matchesCategory = filter === 'All' || g.category === filter;
      // Player count filter
      let matchesPlayerCount = true;
      if (playerFilter === '2p') {
        matchesPlayerCount = g.playerCount === 2;
      } else if (playerFilter === '3-4p') {
        matchesPlayerCount = g.playerCount >= 3;
      }
      return matchesCategory && matchesPlayerCount;
    });
  }, [filter, playerFilter]);

  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / ITEMS_PER_PAGE));
  const paginatedGames = filteredGames.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className={styles.page}>
      {/* Background effects */}
      <div className={styles.bgOrbs} aria-hidden>
        <div className={`${styles.orb} ${styles.orb1}`} />
        <div className={`${styles.orb} ${styles.orb2}`} />
        <div className={`${styles.orb} ${styles.orb3}`} />
        <div className={styles.bgGrid} />
      </div>

      <div className={styles.content}>
        {/* ---------- Hero ---------- */}
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <span className={styles.dot} aria-hidden />
              Live multiplayer · no install
            </span>
            <h1 className={styles.heroTitle}>
              Quick, clever games
              <br />
              <span className={styles.heroAccent}>built for two &amp; more.</span>
            </h1>
            <p className={styles.heroSub}>
              Pick a game, share a 6-character room code, and play head-to-head in your browser.
              Every game has fast variants for short, decisive matches.
            </p>

            <div className={styles.heroActions}>
              <button type="button" className={`btn btn-primary ${styles.heroCta}`} onClick={scrollToCatalog}>
                ▶ Browse {totalGames} games
              </button>
              <button
                type="button"
                className={`btn btn-ghost ${styles.heroCta}`}
                onClick={() => setJoinOpen((open) => !open)}
                aria-expanded={joinOpen}
                aria-controls="quick-join-panel"
              >
                {joinOpen ? '× Close quick join' : '⚡ Quick join a room'}
              </button>
            </div>

            <dl className={styles.heroStats} aria-label="At a glance">
              <div className={styles.heroStat}>
                <dt>Games</dt>
                <dd>{totalGames}</dd>
              </div>
              <div className={styles.heroStat}>
                <dt>Variants</dt>
                <dd>{totalVariants}</dd>
              </div>
              <div className={styles.heroStat}>
                <dt>Per room</dt>
                <dd>2-4 Players</dd>
              </div>
              <div className={styles.heroStat}>
                <dt>Sign-up</dt>
                <dd>Optional</dd>
              </div>
            </dl>
          </div>

          {/* Hero side panel: how-a-match-flows preview */}
          <aside className={styles.heroVisual} aria-hidden>
            <div className={styles.previewTile}>
              <div className={styles.previewTileHeader}>
                <span className={styles.previewTag}>How a match flows</span>
                <span className={styles.previewBadge}>2-4P</span>
              </div>
              <ol className={styles.flowList}>
                <li><span>1</span> Pick a game &amp; variant</li>
                <li><span>2</span> Share your room code</li>
                <li><span>3</span> Play, react, rematch</li>
              </ol>
              <div className={styles.previewBoard} role="presentation">
                {Array.from({ length: 9 }).map((_, i) => {
                  const mark = [0, 4, 8].includes(i) ? '✕' : [2, 6].includes(i) ? '○' : '';
                  return (
                    <div key={i} className={styles.previewCell}>{mark}</div>
                  );
                })}
              </div>
            </div>
          </aside>
        </section>

        {/* Quick Join slide-down */}
        {joinOpen && (
          <div id="quick-join-panel" className={`glass-card ${styles.joinPanel}`}>
            <form onSubmit={handleQuickJoin} className={styles.joinForm}>
              <div className={styles.joinFields}>
                <label className={styles.joinField}>
                  <span>Your name</span>
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
                  <span>Room code</span>
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
                {!connected ? 'Connecting…' : quickJoinPending ? 'Joining…' : 'Join room →'}
              </button>
            </form>
            {(joinError || error) && <div className={styles.joinError}>{joinError || error}</div>}
            <p className={styles.joinHint}>
              No room code? Pick a game below &mdash; you&apos;ll get one to share.
            </p>
          </div>
        )}

        {/* ---------- Featured Section & Couples Corner ---------- */}
        {filter === 'All' && playerFilter === 'all' && page === 1 && (
          <section className={styles.featuredSection}>
            <div className={styles.featuredHeader}>
              <h2 className={styles.featuredTitle}>
                <span>✨</span> Featured &amp; Couples Corner
              </h2>
              <p className={styles.featuredSub}>Handpicked favorites for date nights, party nights, and quick challenges.</p>
            </div>
            <div className={styles.featuredGrid}>
              {games.filter((g) => g.featured).map((game) => (
                <GameCard
                  key={`featured-${game.id}`}
                  game={game}
                  onOpenVariants={setSelectedGame}
                  onNotifyComingSoon={setComingSoonGame}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---------- Catalog ---------- */}
        <section ref={catalogRef} className={styles.catalog} aria-labelledby="catalog-heading">
          <header className={styles.catalogHeader}>
            <div className={styles.catalogHeaderCopy}>
              <h2 id="catalog-heading" className={styles.catalogTitle}>Game catalog</h2>
              <p className={styles.catalogSub}>Explore our full collection of multiplayer games.</p>
            </div>
            <div className={styles.filterControls}>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Category</span>
                <div className={styles.filterRow} role="tablist" aria-label="Filter games by category">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={filter === cat}
                      onClick={() => {
                        setFilter(cat);
                        setPage(1);
                      }}
                      className={`${styles.filterBtn} ${filter === cat ? styles.filterBtnActive : ''}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Players</span>
                <div className={styles.filterRow} role="tablist" aria-label="Filter games by player count">
                  {[
                    { id: 'all', label: 'All Players' },
                    { id: '2p', label: '👥 2 Players' },
                    { id: '3-4p', label: '👥👥 3-4 Players' },
                  ].map((pOpt) => (
                    <button
                      key={pOpt.id}
                      type="button"
                      role="tab"
                      aria-selected={playerFilter === pOpt.id}
                      onClick={() => {
                        setPlayerFilter(pOpt.id as any);
                        setPage(1);
                      }}
                      className={`${styles.filterBtn} ${playerFilter === pOpt.id ? styles.filterBtnActive : ''}`}
                    >
                      {pOpt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <div className={styles.gamesGrid}>
            {paginatedGames.length === 0 ? (
              <div className={styles.emptyStateCard}>
                <span className={styles.emptyIcon}>🎮</span>
                <h3>No games found</h3>
                <p>We are actively developing more multiplayer games for this category. Stay tuned!</p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setFilter('All');
                    setPlayerFilter('all');
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              paginatedGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onOpenVariants={setSelectedGame}
                  onNotifyComingSoon={setComingSoonGame}
                />
              ))
            )}
          </div>

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Catalog pagination">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </nav>
          )}
        </section>

        <AdSlot slotId="home-leaderboard" shape="leaderboard" label="Homepage leaderboard" />

        <footer className={styles.footerNote}>
          <span>Built for friends &amp; couples · works on phones · zero install</span>
        </footer>
      </div>

      {/* Variants Modal */}
      {selectedGame?.variants && (
        <div className={styles.modalOverlay} onClick={() => setSelectedGame(null)}>
          <div
            className={`glass-card ${styles.modalCard}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Choose variant for ${selectedGame.name}`}
          >
            <h2 className={styles.modalTitle}>Choose a variant</h2>
            <p className={styles.modalSub}>
              Pick how you want to play {selectedGame.name.replace(' Variants', '')}.
            </p>

            <div className={styles.variantList}>
              {selectedGame.variants.map((v) => {
                const metricId = getVariantMetricId(selectedGame.id, v.id);
                return (
                  <Link
                    key={v.id}
                    href={v.path}
                    className={styles.variantItem}
                    onClick={() => {
                      setVariantPlayCounts((current) => ({
                        ...current,
                        [metricId]: (current[metricId] ?? 0) + 1,
                      }));
                      void recordGamePlay(metricId);
                    }}
                  >
                    <div className={styles.variantIcon}>{v.icon}</div>
                    <div className={styles.variantBody}>
                      <div className={styles.variantMetaRow}>
                        <h3 className={styles.variantName}>{v.name}</h3>
                        <span className={styles.variantPlays}>▶ {variantPlayCounts[metricId] ?? 0}</span>
                      </div>
                      <p className={styles.variantDesc}>{v.desc}</p>
                    </div>
                    <div className={styles.variantArrow}>→</div>
                  </Link>
                );
              })}
            </div>

            <button className={`btn btn-ghost ${styles.closeBtn}`} onClick={() => setSelectedGame(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Coming Soon Modal */}
      {comingSoonGame && (
        <div className={styles.modalOverlay} onClick={() => setComingSoonGame(null)}>
          <div
            className={`glass-card ${styles.modalCard}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Coming soon info for ${comingSoonGame.name}`}
          >
            <div className={styles.comingSoonHeader}>
              <span className={styles.comingSoonModalIcon} style={{ background: comingSoonGame.gradient }}>
                {comingSoonGame.icon}
              </span>
              <div>
                <h2 className={styles.modalTitle}>{comingSoonGame.name}</h2>
                <span className="badge badge-pink">v2.1 Beta</span>
              </div>
            </div>

            <p className={styles.modalSub} style={{ marginTop: '1rem', fontSize: '1.02rem', lineHeight: '1.5' }}>
              {comingSoonGame.description}
            </p>

            <div className={styles.comingSoonDetails}>
              <h4 className={styles.comingSoonDetailsTitle}>Game Rules &amp; Highlights:</h4>
              <ul className={styles.comingSoonRulesList}>
                {comingSoonGame.rules.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>
            </div>

            {subscribedGameId === comingSoonGame.id ? (
              <div className={styles.subscribeSuccess}>
                <span>🎉</span> You are on the beta access list for {comingSoonGame.name}!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className={styles.comingSoonForm}>
                <p className={styles.subscribeText}>
                  We are finalizing this game. Register your email for instant beta access!
                </p>
                <div className={styles.subscribeFields}>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    className={styles.subscribeInput}
                    value={subscribeEmail}
                    onChange={(e) => setSubscribeEmail(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">
                    Get Beta Invite 🚀
                  </button>
                </div>
              </form>
            )}

            <button className={`btn btn-ghost ${styles.closeBtn}`} onClick={() => setComingSoonGame(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
