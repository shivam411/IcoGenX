'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getGamePath, useGame } from '@/context/GameContext';
import { getGameInfo } from '@/lib/gameMetadata';
import GameIcon from './GameIcon';
import RulesTipPanel from './RulesTipPanel';
import { Celebration } from './Celebration';
import styles from './Lobby.module.css';

interface LobbyProps {
  gameType: string;
  variant?: string;
  gameName: string;
  gameIcon: string;
  accentColor: string;
  children: React.ReactNode;
  hideOverlaysOnGameOver?: boolean;
}

const QUICK_REACTIONS = ['😀', '😮', '😅', '😤', '🎉', '👏'];
const REACTION_DOCK_POSITION_KEY = 'arena_reaction_dock_position';
const REACTION_DOCK_HIDDEN_KEY = 'arena_reaction_dock_hidden';

const ROOM_VARIANTS: Record<string, Array<{ id: string; label: string }>> = {
  tic_tac_toe: [
    { id: 'classic', label: 'Classic' },
    { id: 'disappearing', label: 'Disappearing' },
    { id: 'joker', label: 'Joker' },
    { id: 'gobblet', label: 'Gobblet' },
    { id: 'gravity', label: 'Gravity' },
    { id: 'bidding', label: 'Bidding' },
    { id: 'blind', label: 'Blind' },
  ],
  higher_lower: [
    { id: 'classic', label: 'Classic' },
    { id: 'sprint', label: 'Sprint' },
    { id: 'expert', label: 'Expert' },
    { id: 'code_breaker_number', label: 'Number Range' },
  ],
};

export default function Lobby({ gameType, variant, gameName, gameIcon, accentColor, children, hideOverlaysOnGameOver = false }: LobbyProps) {
  const {
    connected,
    roomCode,
    gameStarted,
    playerNumber,
    error,
    createRoom,
    joinRoom,
    playerName,
    opponentName,
    recentEmojis,
    sendEmoji,
    gameType: currentGameType,
    variant: currentVariant,
    gameOver,
    leaveRoom,
    requestPlayAgain,
    playAgainRequested,
    opponentPlayAgainRequested,
    switchVariant,
    roomActionPromptOpen,
    closeRoomActionPrompt,
    matchFormat,
    gameOverReason,
    scores,
    winner,
    changeMatchFormat,
  } = useGame();
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'single' | 'series_5'>('single');
  const [showCelebration, setShowCelebration] = useState(false);
  const celebratedRef = useRef(false);
  const [reactionDockHidden, setReactionDockHidden] = useState(false);
  const [reactionDockPosition, setReactionDockPosition] = useState<{ x: number; y: number } | null>(null);
  const [reactionDockDragging, setReactionDockDragging] = useState(false);
  const reactionDockRef = useRef<HTMLDivElement | null>(null);
  const reactionDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const player1Name = playerNumber === 0 ? (playerName || 'Player 1') : (opponentName || 'Player 1');
  const player2Name = playerNumber === 1 ? (playerName || 'Player 2') : (opponentName || 'Player 2');

  const getWinnerDisplayName = (w: string | null) => {
    if (!w) return 'Nobody';
    if (w === 'Player 1') return playerNumber === 0 ? (playerName || 'Player 1') : (opponentName || 'Player 1');
    if (w === 'Player 2') return playerNumber === 1 ? (playerName || 'Player 2') : (opponentName || 'Player 2');
    return w;
  };

  const activeGameType = currentGameType || gameType;
  const activeVariant = currentVariant || variant || null;
  const gameInfo = getGameInfo(activeGameType, activeVariant);
  const variantOptions = ROOM_VARIANTS[activeGameType] || null;
  const canSwitchVariant = Boolean(roomCode && variantOptions);
  const isCreator = playerNumber === 0;
  const displayIcon = gameInfo?.icon || gameIcon;
  const [pendingVariant, setPendingVariant] = useState(activeVariant || variantOptions?.[0]?.id || '');
  const showRoomActionModal = (!hideOverlaysOnGameOver && gameOver) || roomActionPromptOpen;

  useEffect(() => {
    setPendingVariant(activeVariant || variantOptions?.[0]?.id || '');
  }, [activeVariant, variantOptions]);

  useEffect(() => {
    if (!(roomCode || gameStarted)) {
      return;
    }

    const targetPath = getGamePath(activeGameType, activeVariant);
    if (!targetPath || pathname === targetPath) {
      return;
    }

    router.replace(targetPath);
  }, [roomCode, gameStarted, activeGameType, activeVariant, pathname, router]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedHidden = window.localStorage.getItem(REACTION_DOCK_HIDDEN_KEY);
    setReactionDockHidden(savedHidden === 'true');

    const savedPosition = window.localStorage.getItem(REACTION_DOCK_POSITION_KEY);
    if (!savedPosition) {
      return;
    }

    try {
      const parsed = JSON.parse(savedPosition) as { x?: number; y?: number };
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        setReactionDockPosition({ x: parsed.x, y: parsed.y });
      }
    } catch {
      window.localStorage.removeItem(REACTION_DOCK_POSITION_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(REACTION_DOCK_HIDDEN_KEY, String(reactionDockHidden));
  }, [reactionDockHidden]);

  useEffect(() => {
    if (typeof window === 'undefined' || !reactionDockPosition) {
      return;
    }
    window.localStorage.setItem(REACTION_DOCK_POSITION_KEY, JSON.stringify(reactionDockPosition));
  }, [reactionDockPosition]);

  useEffect(() => {
    if (gameOver && gameOverReason === 'SeriesCompleted') {
      if (!celebratedRef.current) {
        setShowCelebration(true);
        celebratedRef.current = true;
      }
    } else {
      celebratedRef.current = false;
      setShowCelebration(false);
    }
  }, [gameOver, gameOverReason]);

  useEffect(() => {
    if (!reactionDockDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = reactionDragRef.current;
      const dockElement = reactionDockRef.current;
      if (!dragState || !dockElement) {
        return;
      }

      const width = dockElement.offsetWidth || 0;
      const height = dockElement.offsetHeight || 0;
      const maxX = Math.max(12, window.innerWidth - width - 12);
      const maxY = Math.max(12, window.innerHeight - height - 12);
      const nextX = Math.min(Math.max(12, event.clientX - dragState.offsetX), maxX);
      const nextY = Math.min(Math.max(12, event.clientY - dragState.offsetY), maxY);

      setReactionDockPosition({ x: nextX, y: nextY });
    };

    const stopDragging = () => {
      reactionDragRef.current = null;
      setReactionDockDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
    };
  }, [reactionDockDragging]);

  const handleCreate = () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    createRoom(gameType, variant || null, name.trim(), selectedFormat);
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    if (joinCode) joinRoom(joinCode, name.trim(), gameType, variant || null);
  };

  const handleVariantChange = (nextVariant: string) => {
    if (!variantOptions || nextVariant === activeVariant) {
      return;
    }
    switchVariant(nextVariant);
  };

  const handleModalVariantChange = () => {
    if (!variantOptions || pendingVariant === activeVariant) {
      return;
    }
    switchVariant(pendingVariant);
    closeRoomActionPrompt();
  };

  const handleGoHome = () => {
    closeRoomActionPrompt();
    leaveRoom();
    router.push('/');
  };

  const handleReactionDockPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dockElement = reactionDockRef.current;
    if (!dockElement) {
      return;
    }

    const rect = dockElement.getBoundingClientRect();
    reactionDragRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setReactionDockPosition({ x: rect.left, y: rect.top });
    setReactionDockDragging(true);
  };

  const reactionDockStyle = reactionDockPosition
    ? {
        left: `${reactionDockPosition.x}px`,
        top: `${reactionDockPosition.y}px`,
        bottom: 'auto',
        transform: 'none',
      }
    : undefined;

  const renderVariantSwitcher = (floating: boolean) => {
    if (!canSwitchVariant || !variantOptions) {
      return null;
    }

    const selectId = floating ? 'room-variant-floating' : 'room-variant-waiting';

    return (
      <div className={floating ? styles.variantDock : styles.variantPanel}>
        <label className={styles.variantLabel} htmlFor={selectId}>Room variant</label>
        <select
          id={selectId}
          aria-label="Room variant"
          className={styles.variantSelect}
          value={activeVariant || variantOptions[0].id}
          onChange={(event) => handleVariantChange(event.target.value)}
          disabled={!isCreator}
        >
          {variantOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p className={styles.variantHint}>
          {isCreator ? 'Switch variants without leaving the room.' : 'Only the creator can switch variants.'}
        </p>
      </div>
    );
  };

  const renderMatchFormatSwitcher = () => {
    if (!roomCode) return null;

    return (
      <div className={styles.variantPanel} style={{ marginTop: '12px' }}>
        <label className={styles.variantLabel} htmlFor="room-match-format">Match Format</label>
        <select
          id="room-match-format"
          aria-label="Match Format"
          className={styles.variantSelect}
          value={matchFormat}
          onChange={(event) => changeMatchFormat(event.target.value as 'single' | 'series_5')}
          disabled={!isCreator}
        >
          <option value="single">Single Match</option>
          <option value="series_5">5-Match Series (Best of 5)</option>
        </select>
        <p className={styles.variantHint}>
          {isCreator ? 'Switch match format without leaving the room.' : 'Only the creator can change the match format.'}
        </p>
      </div>
    );
  };

  if (!connected) {
    return (
      <div className={styles.container}>
        <div className={styles.connectingBox}>
          <div className={styles.spinner} />
          <p>Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (gameStarted) {
    return (
      <>
        {children}

        <div className={styles.reactionFeed} aria-live="polite">
          {recentEmojis.map((reaction) => (
            <div
              key={reaction.id}
              className={`${styles.reactionBubble} ${reaction.fromSelf ? styles.reactionBubbleSelf : styles.reactionBubbleOpponent}`}
            >
              <span className={styles.reactionEmoji}>{reaction.emoji}</span>
              <span className={styles.reactionSender}>
                {reaction.fromSelf ? (playerName || 'You') : (opponentName || 'Opponent')}
              </span>
            </div>
          ))}
        </div>

        {reactionDockHidden ? (
          <button
            type="button"
            className={styles.reactionToggleBtn}
            style={reactionDockStyle}
            onClick={() => setReactionDockHidden(false)}
            aria-label="Show reactions"
          >
            🙂 Reactions
          </button>
        ) : (
          <div className={styles.reactionDock} ref={reactionDockRef} style={reactionDockStyle}>
            <div className={styles.reactionDockHeader}>
              <button
                type="button"
                className={styles.reactionDockHandle}
                onPointerDown={handleReactionDockPointerDown}
                aria-label="Drag emoji bar"
              >
                ⋮⋮
              </button>
              <span className={styles.reactionDockLabel}>React</span>
              <button
                type="button"
                className={styles.reactionDockHide}
                onClick={() => setReactionDockHidden(true)}
                aria-label="Hide reactions"
              >
                Hide
              </button>
            </div>
            <div className={styles.reactionButtons}>
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={styles.reactionBtn}
                  onClick={() => sendEmoji(emoji)}
                  aria-label={`Send ${emoji} reaction`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {showRoomActionModal && (
          <div className={styles.roomActionOverlay} role="dialog" aria-modal="true" aria-labelledby="room-action-title">
            <div className={`glass-card ${styles.roomActionCard}`}>
              <div className={styles.roomActionHeader}>
                <div>
                  <p className={styles.roomActionEyebrow}>{gameOver ? 'Round Complete' : 'End Game'}</p>
                  <h2 id="room-action-title" className={styles.roomActionTitle}>
                    {gameOver ? 'Choose what happens next.' : 'Choose how to leave this room.'}
                  </h2>
                </div>
                {!gameOver && (
                  <button
                    type="button"
                    className={styles.roomActionClose}
                    onClick={closeRoomActionPrompt}
                    aria-label="Close room actions"
                  >
                    ✕
                  </button>
                )}
              </div>

              {gameOver ? (
                matchFormat === 'series_5' ? (
                  <div className={styles.seriesStatusBox}>
                    <p className={styles.seriesStatusLabel}>
                      {gameOverReason === 'SeriesCompleted' ? '🏆 Series Completed' : '⚡ Series in Progress'}
                    </p>
                    <div className={styles.seriesScoreRow}>
                      <span className={`${styles.seriesPlayerName} ${winner === 'Player 1' ? styles.seriesWinnerNameHighlight : ''}`}>
                        {player1Name}
                      </span>
                      <span className={styles.seriesScoreDisplay}>
                        {scores[0]} - {scores[1]}
                      </span>
                      <span className={`${styles.seriesPlayerName} ${winner === 'Player 2' ? styles.seriesWinnerNameHighlight : ''}`}>
                        {player2Name}
                      </span>
                    </div>
                    <p className={styles.seriesStatusHint}>
                      {gameOverReason === 'SeriesCompleted'
                        ? `${getWinnerDisplayName(winner)} wins the 5-match series!`
                        : `First to 3 wins. Play the next game!`}
                    </p>
                  </div>
                ) : (
                  <p className={styles.roomActionText}>
                    Start another round, switch this room to a different variant, or head back home.
                  </p>
                )
              ) : (
                <p className={styles.roomActionText}>
                  Switch this room to another variant or go back to the home page.
                </p>
              )}

              {gameOver && (
                <div className={styles.roomActionSection}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={requestPlayAgain}
                    disabled={playAgainRequested}
                  >
                    {playAgainRequested
                      ? 'Waiting for opponent...'
                      : matchFormat === 'series_5'
                      ? gameOverReason === 'SeriesCompleted'
                        ? '🏆 Start New Series'
                        : '⚡ Play Next Game'
                      : '🔄 Play Again'}
                  </button>
                  {opponentPlayAgainRequested && !playAgainRequested && (
                    <p className={styles.roomActionStatus}>{opponentName || 'Opponent'} wants to play again.</p>
                  )}
                </div>
              )}

              {variantOptions && variantOptions.length > 0 && (
                <div className={styles.roomActionSection}>
                  <label className={styles.variantLabel} htmlFor="room-action-variant">Change variant</label>
                  <div className={styles.roomActionVariantRow}>
                    <select
                      id="room-action-variant"
                      aria-label="Change variant"
                      className={styles.variantSelect}
                      value={pendingVariant}
                      onChange={(event) => setPendingVariant(event.target.value)}
                      disabled={!isCreator}
                    >
                      {variantOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleModalVariantChange}
                      disabled={!isCreator || pendingVariant === activeVariant}
                    >
                      Change Variant
                    </button>
                  </div>
                  <p className={styles.roomActionStatus}>
                    {isCreator ? 'Only shown here after the round or when ending the game.' : 'Only the creator can change variants.'}
                  </p>
                </div>
              )}

              <button type="button" className="btn btn-ghost" onClick={handleGoHome}>
                Go to Home Page
              </button>
            </div>
          </div>
        )}
        {showCelebration && (
          <Celebration
            type="series"
            winnerName={getWinnerDisplayName(winner)}
            onComplete={() => setShowCelebration(false)}
          />
        )}
      </>
    );
  }

  if (roomCode) {
    return (
      <div className={styles.container}>
        <div className={styles.roomShell}>
          <div className={`glass-card ${styles.waitingBox}`}>
            <div className={styles.waitingPulse} style={{ '--accent': accentColor } as React.CSSProperties}>
              <GameIcon icon={displayIcon} className={styles.gameIconLarge} />
            </div>
            <h2 className={styles.waitingTitle}>Waiting for Opponent</h2>
            <p className={styles.waitingSub}>Share this code with a friend</p>
            <div className={styles.codeDisplay}>
              <span className={styles.codeText}>{roomCode}</span>
              <button
                className={`btn btn-sm btn-ghost ${styles.copyBtn}`}
                onClick={() => navigator.clipboard.writeText(roomCode)}
              >
                📋 Copy
              </button>
            </div>
            <div className={styles.dotLoader}>
              <span /><span /><span />
            </div>
            <p className={styles.playerTag}>
              You are {playerName || 'Player'} {playerNumber !== null ? `(P${playerNumber + 1})` : ''}
            </p>

            {renderVariantSwitcher(false)}
            {renderMatchFormatSwitcher()}
          </div>

          {gameInfo && (
            <RulesTipPanel
              className={styles.lobbyRules}
              title={gameInfo.rulesTitle}
              rules={gameInfo.rules}
              tips={gameInfo.tips}
              accentColor={accentColor}
              defaultOpen
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.roomShell}>
        <div className={`glass-card ${styles.lobbyCard}`}>
          <button 
            className={styles.backBtn} 
            onClick={() => router.push('/')}
            aria-label="Back to home"
          >
            ← Back
          </button>
          <div className={styles.header}>
            <GameIcon icon={displayIcon} className={styles.gameIconLarge} />
            <h1 className={styles.title}>{gameName}</h1>
          </div>

          <div className={styles.nameSection}>
            <label className={styles.nameLabel}>Your Name</label>
            <input
              className="input"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) setNameError(false);
              }}
              maxLength={15}
              style={nameError ? { borderColor: 'var(--accent-red, #ef4444)' } : {}}
            />
            {nameError && (
              <div style={{ color: 'var(--accent-red, #ef4444)', fontSize: '0.8rem', marginTop: '6px', textAlign: 'left' }}>
                ⚠️ Please enter your name first
              </div>
            )}
          </div>

          <div className={styles.formatSection}>
            <label className={styles.formatLabel}>Match Format</label>
            <div className={styles.formatSelector}>
              <button
                type="button"
                className={`${styles.formatBtn} ${selectedFormat === 'single' ? styles.formatBtnActive : ''}`}
                onClick={() => setSelectedFormat('single')}
              >
                ⚡ Single Match
              </button>
              <button
                type="button"
                className={`${styles.formatBtn} ${selectedFormat === 'series_5' ? styles.formatBtnActive : ''}`}
                onClick={() => setSelectedFormat('series_5')}
              >
                🏆 5-Match Series
              </button>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleCreate}
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}
            >
              🎮 Create Room
            </button>

            <div className={styles.divider}>
              <span>or join a room</span>
            </div>

            <div className={styles.joinRow}>
              <input
                className="input"
                placeholder="Enter room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <button
                className="btn btn-ghost"
                onClick={handleJoin}
                disabled={!joinCode}
              >
                Join
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.errorBanner}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {gameInfo && (
          <RulesTipPanel
            className={styles.lobbyRules}
            title={gameInfo.rulesTitle}
            rules={gameInfo.rules}
            tips={gameInfo.tips}
            accentColor={accentColor}
            defaultOpen={false}
          />
        )}
      </div>
    </div>
  );
}
