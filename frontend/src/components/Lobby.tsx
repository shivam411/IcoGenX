'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getGamePath, useGame } from '@/context/GameContext';
import { getGameInfo } from '@/lib/gameMetadata';
import RulesTipPanel from './RulesTipPanel';
import styles from './Lobby.module.css';

interface LobbyProps {
  gameType: string;
  variant?: string;
  gameName: string;
  gameIcon: string;
  accentColor: string;
  children: React.ReactNode;
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

export default function Lobby({ gameType, variant, gameName, gameIcon, accentColor, children }: LobbyProps) {
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
    switchVariant,
  } = useGame();
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [reactionDockHidden, setReactionDockHidden] = useState(false);
  const [reactionDockPosition, setReactionDockPosition] = useState<{ x: number; y: number } | null>(null);
  const [reactionDockDragging, setReactionDockDragging] = useState(false);
  const reactionDockRef = useRef<HTMLDivElement | null>(null);
  const reactionDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const activeGameType = currentGameType || gameType;
  const activeVariant = currentVariant || variant || null;
  const gameInfo = getGameInfo(activeGameType, activeVariant);
  const variantOptions = ROOM_VARIANTS[activeGameType] || null;
  const canSwitchVariant = Boolean(roomCode && variantOptions);
  const isCreator = playerNumber === 0;

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
    createRoom(gameType, variant || null, name.trim());
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

        {renderVariantSwitcher(true)}

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
      </>
    );
  }

  if (roomCode) {
    return (
      <div className={styles.container}>
        <div className={styles.roomShell}>
          <div className={`glass-card ${styles.waitingBox}`}>
            <div className={styles.waitingPulse} style={{ '--accent': accentColor } as React.CSSProperties}>
              <span className={styles.gameIconLarge}>{gameIcon}</span>
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
            <span className={styles.gameIconLarge}>{gameIcon}</span>
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
