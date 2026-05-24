'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const LOCAL_WS_PORT = 6100;
const PRODUCTION_WS_URL = 'wss://api.icogenx.com/ws';
const WS_DEBUG = process.env.NEXT_PUBLIC_DEBUG_WS === '1';

function wsLog(...args: unknown[]) {
  if (WS_DEBUG) console.log(...args);
}

function wsWarn(...args: unknown[]) {
  if (WS_DEBUG) console.warn(...args);
}

function wsError(...args: unknown[]) {
  if (WS_DEBUG) console.error(...args);
}

// Treat private LAN IPs and *.local mDNS names as local hosts so that
// the same build can serve devices on the same Wi-Fi without needing
// a Cloudflare tunnel or external proxy.
function isPrivateLanHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') return true;
  if (hostname.endsWith('.local')) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  // 172.16.0.0 – 172.31.255.255
  const m = hostname.match(/^172\.(\d{1,3})\./);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function resolveWebSocketUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === 'undefined') {
    return PRODUCTION_WS_URL;
  }

  const hostname = window.location.hostname.toLowerCase();
  if (isPrivateLanHostname(hostname)) {
    // Use the same hostname the user typed in the browser so phones/tablets
    // on the same LAN reach the host machine, not their own loopback.
    const wsScheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsScheme}//${hostname}:${LOCAL_WS_PORT}/ws`;
  }

  return PRODUCTION_WS_URL;
}

interface GameState {
  [key: string]: any;
}

export interface SavedSession {
  roomCode: string;
  playerName: string;
  gameType: string | null;
  variant: string | null;
  path: string | null;
  reconnectDeadline: number | null;
}

interface EmojiReaction {
  id: number;
  emoji: string;
  fromSelf: boolean;
}

export type PendingRoomActionKind = 'creating' | 'joining' | 'rejoining';

export interface PendingRoomAction {
  kind: PendingRoomActionKind;
  roomCode: string | null; // null for create until server replies
  startedAt: number;
}

const RECONNECT_WINDOW_MS = 20_000;
const PENDING_ROOM_ACTION_TIMEOUT_MS = 8_000;
const OUTBOUND_QUEUE_MAX_AGE_MS = 5_000;
const OUTBOUND_QUEUE_MAX_LEN = 16;
const STORAGE_ROOM_CODE = 'arena_room_code';
const STORAGE_PLAYER_NAME = 'arena_player_name';
const STORAGE_GAME_TYPE = 'arena_game_type';
const STORAGE_VARIANT = 'arena_variant';
const STORAGE_GAME_PATH = 'arena_game_path';
const STORAGE_RECONNECT_DEADLINE = 'arena_reconnect_deadline';

export function getGamePath(gameType: string | null, variant: string | null) {
  if (!gameType) return null;
  if (gameType === 'tic_tac_toe') {
    return `/games/tic-tac-toe/${variant || 'classic'}`;
  }
  if (gameType === 'higher_lower') {
    if (variant === 'code_breaker_number') return '/games/code-guess/number';
    return variant && variant !== 'classic'
      ? `/games/higher-lower/${variant}`
      : '/games/higher-lower';
  }
  return `/games/${gameType.replace(/_/g, '-')}`;
}

function readSavedSession(): SavedSession | null {
  if (typeof window === 'undefined') return null;

  const roomCode = localStorage.getItem(STORAGE_ROOM_CODE);
  const playerName = localStorage.getItem(STORAGE_PLAYER_NAME);
  if (!roomCode || !playerName) return null;

  const gameType = localStorage.getItem(STORAGE_GAME_TYPE);
  const variant = localStorage.getItem(STORAGE_VARIANT);
  const path = localStorage.getItem(STORAGE_GAME_PATH) || getGamePath(gameType, variant);
  let reconnectDeadline = Number(localStorage.getItem(STORAGE_RECONNECT_DEADLINE));

  if (!Number.isFinite(reconnectDeadline) || reconnectDeadline <= Date.now()) {
    reconnectDeadline = Date.now() + RECONNECT_WINDOW_MS;
    localStorage.setItem(STORAGE_RECONNECT_DEADLINE, String(reconnectDeadline));
  }

  return { roomCode, playerName, gameType, variant, path, reconnectDeadline };
}

function clearSavedSessionStorage() {
  localStorage.removeItem(STORAGE_ROOM_CODE);
  localStorage.removeItem(STORAGE_GAME_TYPE);
  localStorage.removeItem(STORAGE_VARIANT);
  localStorage.removeItem(STORAGE_GAME_PATH);
  localStorage.removeItem(STORAGE_RECONNECT_DEADLINE);
}

interface WebSocketContextType {
  connected: boolean;
  playerId: string | null;
  playerNumber: number | null;
  roomCode: string | null;
  playerName: string | null;
  opponentName: string | null;
  allPlayerNames: string[];
  playerCount: number;
  gameState: GameState | null;
  gameType: string | null;
  variant: string | null;
  turnStartedAt: number | null;
  scores: number[];
  gameStarted: boolean;
  gameOver: boolean;
  winner: string | null;
  error: string | null;
  opponentDisconnected: boolean;
  savedSession: SavedSession | null;
  savedSessionSecondsLeft: number | null;
  opponentReconnectSecondsLeft: number | null;
  playAgainRequested: boolean;
  opponentPlayAgainRequested: boolean;
  recentEmojis: EmojiReaction[];
  roomActionPromptOpen: boolean;
  pendingRoomAction: PendingRoomAction | null;
  matchFormat: 'single' | 'series_5';
  gameOverReason: string | null;
  cancelPendingRoomAction: () => void;
  createRoom: (gameType: string, variant: string | null, playerName: string, format?: 'single' | 'series_5') => void;
  joinRoom: (roomCode: string, playerName: string, gameType?: string | null, variant?: string | null) => void;
  joinSavedSession: () => void;
  clearSavedSession: () => void;
  leaveRoom: () => void;
  sendAction: (action: any) => void;
  sendEmoji: (emoji: string) => void;
  switchVariant: (variant: string) => void;
  changeMatchFormat: (format: 'single' | 'series_5') => void;
  requestPlayAgain: () => void;
  resetGame: () => void;
  openRoomActionPrompt: () => void;
  closeRoomActionPrompt: () => void;
  // Friends & Presence System
  friends: any[];
  activeInvite: { inviteId: string; fromUserId: string; fromName: string; gameType: string; variant: string | null; roomCode: string } | null;
  declinedInvite: { inviteId: string; fromName: string } | null;
  clearDeclinedInvite: () => void;
  sendGameInvite: (toUserId: string, gameType: string, variant?: string | null) => void;
  declineGameInvite: (inviteId: string, fromUserId: string) => void;
  acceptGameInvite: (invite: { roomCode: string; gameType: string; variant: string | null }) => void;
  addFriend: (friendCode: string) => Promise<any>;
  respondToFriendRequest: (friendshipId: string, action: 'accept' | 'decline') => Promise<any>;
  refetchFriends: () => Promise<void>;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const intentionalCloseRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outboundQueueRef = useRef<{ msg: any; queuedAt: number }[]>([]);
  const pendingRoomActionRef = useRef<PendingRoomAction | null>(null);
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [playerName, setPlayerNameState] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [allPlayerNames, setAllPlayerNames] = useState<string[]>([]);
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameType, setGameType] = useState<string | null>(null);
  const [variant, setVariant] = useState<string | null>(null);
  const [turnStartedAt, setTurnStartedAt] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([0, 0]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);
  const [opponentReconnectDeadline, setOpponentReconnectDeadline] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [playAgainRequested, setPlayAgainRequested] = useState(false);
  const [opponentPlayAgainRequested, setOpponentPlayAgainRequested] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<EmojiReaction[]>([]);
  const [roomActionPromptOpen, setRoomActionPromptOpen] = useState(false);
  const [pendingRoomAction, setPendingRoomActionState] = useState<PendingRoomAction | null>(null);
  const [matchFormat, setMatchFormat] = useState<'single' | 'series_5'>('single');
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);

  // Social & Friends State
  const [friends, setFriends] = useState<any[]>([]);
  const [activeInvite, setActiveInvite] = useState<{ inviteId: string; fromUserId: string; fromName: string; gameType: string; variant: string | null; roomCode: string } | null>(null);
  const [declinedInvite, setDeclinedInvite] = useState<{ inviteId: string; fromName: string } | null>(null);

  const setPendingRoomAction = useCallback((next: PendingRoomAction | null) => {
    pendingRoomActionRef.current = next;
    setPendingRoomActionState(next);
  }, []);

  // Refs for stable callbacks
  const playerIdRef = useRef<string | null>(null);
  const currentTurnOwnerRef = useRef<number | null>(null);
  const handleMessageRef = useRef<(event: MessageEvent) => void>(() => {});

  const syncGameState = useCallback((nextState: GameState | null, options?: { resetTurnClock?: boolean }) => {
    setGameState(nextState);

    const nextTurnOwner = typeof nextState?.currentPlayer === 'number'
      ? nextState.currentPlayer
      : null;

    if (nextTurnOwner === null) {
      currentTurnOwnerRef.current = null;
      setTurnStartedAt(null);
      return;
    }

    if (options?.resetTurnClock || currentTurnOwnerRef.current !== nextTurnOwner) {
      currentTurnOwnerRef.current = nextTurnOwner;
      setTurnStartedAt(Date.now());
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      wsLog('[WS] ← Received:', msg.type, msg);
      switch (msg.type) {
        case 'Welcome':
          setPlayerId(msg.player_id);
          setSavedSession(readSavedSession());
          setPlayerNameState(localStorage.getItem(STORAGE_PLAYER_NAME));
          break;
        case 'RoomCreated':
          localStorage.setItem(STORAGE_ROOM_CODE, msg.room_code);
          localStorage.setItem(STORAGE_GAME_TYPE, msg.game_type);
          if (msg.variant) localStorage.setItem(STORAGE_VARIANT, msg.variant);
          else localStorage.removeItem(STORAGE_VARIANT);
          localStorage.setItem(STORAGE_GAME_PATH, getGamePath(msg.game_type, msg.variant || null) || '/');
          localStorage.removeItem(STORAGE_RECONNECT_DEADLINE);
          setSavedSession(null);
          setRoomCode(msg.room_code);
          setGameType(msg.game_type);
          setVariant(msg.variant || null);
          if (msg.match_format) setMatchFormat(msg.match_format);
          setPlayerCount(msg.player_count || 2);
          setAllPlayerNames(() => {
            const names = Array(msg.player_count || 2).fill('');
            const myName = localStorage.getItem(STORAGE_PLAYER_NAME) || 'Player 1';
            names[0] = myName;
            return names;
          });
          setGameStarted(false);
          syncGameState(null);
          setGameOver(false);
          setWinner(null);
          setGameOverReason(null);
          setPlayAgainRequested(false);
          setOpponentPlayAgainRequested(false);
          setRecentEmojis([]);
          setRoomActionPromptOpen(false);
          setPlayerNumber(0); // Creator is always player 0
          if (pendingRoomActionRef.current?.kind === 'creating') {
            pendingRoomActionRef.current = null;
            setPendingRoomActionState(null);
          }
          break;
        case 'PlayerJoined':
          if (msg.player_number !== undefined) {
            setPlayerCount(msg.player_count || 2);
            setAllPlayerNames((prev) => {
              const next = [...prev];
              while (next.length < (msg.player_count || 2)) {
                next.push('');
              }
              next[msg.player_number] = msg.player_name;
              return next;
            });

            // If I am joining, this confirms my number
            if (msg.player_id === playerIdRef.current) {
              setPlayerNumber(msg.player_number);
              if (msg.game_type) setGameType(msg.game_type);
              setVariant(msg.variant || null);
              if (msg.match_format) setMatchFormat(msg.match_format);
              if (msg.game_type) {
                localStorage.setItem(STORAGE_GAME_TYPE, msg.game_type);
                if (msg.variant) localStorage.setItem(STORAGE_VARIANT, msg.variant);
                else localStorage.removeItem(STORAGE_VARIANT);
                localStorage.setItem(STORAGE_GAME_PATH, getGamePath(msg.game_type, msg.variant || null) || '/');
                localStorage.removeItem(STORAGE_RECONNECT_DEADLINE);
                setSavedSession(null);
              }
              // Joining flow acknowledged by the server
              const pending = pendingRoomActionRef.current;
              if (pending && (pending.kind === 'joining' || pending.kind === 'rejoining')) {
                pendingRoomActionRef.current = null;
                setPendingRoomActionState(null);
              }
            } else {
              // Someone else joined, they are my opponent
              setOpponentName(msg.player_name);
              setOpponentDisconnected(false);
              setOpponentReconnectDeadline(null);
              if (msg.match_format) setMatchFormat(msg.match_format);
            }
          }
          break;
        case 'GameStart':
          setGameStarted(true);
          syncGameState(msg.game_state, { resetTurnClock: true });
          if (msg.scores) setScores(msg.scores);
          if (msg.game_type) setGameType(msg.game_type);
          setVariant(msg.variant || null);
          if (msg.match_format) setMatchFormat(msg.match_format);
          setGameOver(false);
          setWinner(null);
          setGameOverReason(null);
          setPlayAgainRequested(false);
          setOpponentPlayAgainRequested(false);
          setRecentEmojis([]);
          setRoomActionPromptOpen(false);
          if (msg.players) {
            const names = Array(msg.scores.length).fill('');
            msg.players.forEach((p: any) => {
              names[p.player_number] = p.player_name;
            });
            setAllPlayerNames(names);
            setPlayerCount(msg.scores.length);
            
            // Set opponentName to first non-me player for backward compatibility
            const meIndex = msg.players.find((p: any) => p.player_id === playerIdRef.current)?.player_number ?? 0;
            const otherPlayer = msg.players.find((p: any) => p.player_number !== meIndex);
            if (otherPlayer) {
              setOpponentName(otherPlayer.player_name);
            }
          }
          if (msg.game_type) {
            localStorage.setItem(STORAGE_GAME_TYPE, msg.game_type);
            if (msg.variant) localStorage.setItem(STORAGE_VARIANT, msg.variant);
            else localStorage.removeItem(STORAGE_VARIANT);
            localStorage.setItem(STORAGE_GAME_PATH, getGamePath(msg.game_type, msg.variant || null) || '/');
            localStorage.removeItem(STORAGE_RECONNECT_DEADLINE);
            setSavedSession(null);
          }
          break;
        case 'GameUpdate':
          syncGameState(msg.game_state);
          break;
        case 'EmojiSent': {
          const reactionId = Date.now() + Math.random();
          setRecentEmojis((prev) => [
            ...prev.slice(-3),
            {
              id: reactionId,
              emoji: msg.emoji,
              fromSelf: msg.player_id === playerIdRef.current,
            },
          ]);
          setTimeout(() => {
            setRecentEmojis((prev) => prev.filter((reaction) => reaction.id !== reactionId));
          }, 2200);
          break;
        }
        case 'GameOver':
          setGameOver(true);
          setWinner(msg.winner);
          setGameOverReason(msg.reason || null);
          currentTurnOwnerRef.current = null;
          setTurnStartedAt(null);
          setRoomActionPromptOpen(false);
          break;
        case 'Error':
          wsWarn('[WS] Error from server:', msg.message);
          if (msg.message === 'Room not found' || msg.message === 'Room is full') {
            clearSavedSessionStorage();
            setSavedSession(null);
            setRoomCode(null);
          }
          // Any server error cancels an in-flight room action so the UI
          // surfaces the error instead of hanging on "Joining...".
          if (pendingRoomActionRef.current) {
            pendingRoomActionRef.current = null;
            setPendingRoomActionState(null);
          }
          setError(msg.message);
          setTimeout(() => setError(null), 5000);
          break;
        case 'OpponentDisconnected':
          setOpponentDisconnected(true);
          setOpponentReconnectDeadline(Date.now() + RECONNECT_WINDOW_MS);
          break;
        case 'PlayAgainRequested':
          setOpponentPlayAgainRequested(true);
          break;
        case 'PlayAgainAccepted':
          syncGameState(msg.game_state, { resetTurnClock: true });
          if (msg.scores) setScores(msg.scores);
          setGameOver(false);
          setWinner(null);
          setGameOverReason(null);
          setPlayAgainRequested(false);
          setOpponentPlayAgainRequested(false);
          break;
        case 'MatchFormatChanged':
          if (msg.format) setMatchFormat(msg.format);
          break;
        case 'PresenceUpdate':
          setFriends((prev) =>
            prev.map((f) =>
              f.friend.id === msg.user_id
                ? { ...f, online: msg.online, currentRoom: msg.current_room }
                : f
            )
          );
          break;
        case 'GameInviteReceived':
          setActiveInvite({
            inviteId: msg.invite_id,
            fromUserId: msg.from_user_id,
            fromName: msg.from_name,
            gameType: msg.game_type,
            variant: msg.variant || null,
            roomCode: msg.room_code,
          });
          break;
        case 'GameInviteDeclined':
          setDeclinedInvite({
            inviteId: msg.invite_id,
            fromName: msg.from_name,
          });
          setTimeout(() => {
            setDeclinedInvite(null);
          }, 5000);
          break;
      }
    } catch (e) {
      wsError('[WS] Failed to parse message:', e);
    }
  }, [syncGameState]);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const wsUrl = resolveWebSocketUrl();
    intentionalCloseRef.current = false;
    wsLog('[WS] Connecting to', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      wsLog('[WS] Connected to', wsUrl);
      setConnected(true);
      // Flush any messages queued while the socket was closed/connecting.
      const queue = outboundQueueRef.current;
      outboundQueueRef.current = [];
      const now = Date.now();
      for (const entry of queue) {
        if (now - entry.queuedAt > OUTBOUND_QUEUE_MAX_AGE_MS) {
          wsWarn('[WS] Dropping stale queued message:', entry.msg?.type);
          continue;
        }
        try {
          ws.send(JSON.stringify(entry.msg));
          wsLog('[WS] → Flushed queued:', entry.msg?.type);
        } catch (err) {
          wsError('[WS] Failed to flush queued message', err);
        }
      }
    };

    ws.onclose = (event) => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      wsLog(`[WS] Disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
      setConnected(false);
      if (intentionalCloseRef.current) {
        intentionalCloseRef.current = false;
        return;
      }
      if (reconnectTimerRef.current === null) {
        wsLog('[WS] Attempting to reconnect in 2s...');
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connectWs();
        }, 2000);
      }
    };

    ws.onerror = (err) => {
      wsError('[WS] Error Event:', err);
    };

    ws.onmessage = (e) => handleMessageRef.current(e);
  }, []); // Stable connection function

  // Keep refs in sync
  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  useEffect(() => {
    connectWs();
    setSavedSession(readSavedSession());

    return () => {
      // Cleanup on unmount
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null as any;
      }
      intentionalCloseRef.current = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connectWs]);

  useEffect(() => {
    if (!savedSession?.reconnectDeadline && !opponentReconnectDeadline) return;

    const timer = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [savedSession?.reconnectDeadline, opponentReconnectDeadline]);

  // Time-bound any in-flight room action so the UI never gets stuck on
  // "Joining..." if the server (or the network) silently drops the
  // request. After PENDING_ROOM_ACTION_TIMEOUT_MS we clear the pending
  // marker and surface a recoverable error.
  useEffect(() => {
    if (!pendingRoomAction) return;
    const elapsed = Date.now() - pendingRoomAction.startedAt;
    const remaining = Math.max(0, PENDING_ROOM_ACTION_TIMEOUT_MS - elapsed);
    const timer = setTimeout(() => {
      if (pendingRoomActionRef.current !== pendingRoomAction) return;
      pendingRoomActionRef.current = null;
      setPendingRoomActionState(null);
      setError("Couldn't reach the room. Please check your connection and try again.");
      setTimeout(() => setError(null), 5000);
    }, remaining);
    return () => clearTimeout(timer);
  }, [pendingRoomAction]);

  const send = useCallback((msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsLog('[WS] → Sending:', msg.type, msg);
      wsRef.current.send(JSON.stringify(msg));
      return;
    }
    // Queue room/identity messages so a transient disconnect doesn't
    // silently swallow a Join/Create click. Volatile actions like
    // emojis are dropped instead.
    const queueable = msg?.type === 'JoinRoom' || msg?.type === 'CreateRoom' || msg?.type === 'LeaveRoom';
    if (queueable) {
      const queue = outboundQueueRef.current;
      if (queue.length >= OUTBOUND_QUEUE_MAX_LEN) queue.shift();
      queue.push({ msg, queuedAt: Date.now() });
      wsWarn('[WS] Socket not open, queued:', msg.type);
    } else {
      wsWarn('[WS] Cannot send (dropped), socket not open. State:', wsRef.current?.readyState, 'type:', msg?.type);
    }
  }, []);

  const prepareForRoomTransition = useCallback(() => {
    if (roomCode) {
      send({ type: 'LeaveRoom' });
    }

    clearSavedSessionStorage();
    setSavedSession(null);
    setRoomCode(null);
    setPlayerNumber(null);
    setOpponentName(null);
    setAllPlayerNames([]);
    setPlayerCount(2);
    syncGameState(null);
    setGameType(null);
    setVariant(null);
    setScores([0, 0]);
    setMatchFormat('single');
    setGameOverReason(null);
    setGameStarted(false);
    setGameOver(false);
    setWinner(null);
    setError(null);
    setOpponentDisconnected(false);
    setOpponentReconnectDeadline(null);
    setPlayAgainRequested(false);
    setOpponentPlayAgainRequested(false);
    setRecentEmojis([]);
    setRoomActionPromptOpen(false);
  }, [roomCode, send]);

  const createRoom = useCallback((gameType: string, variant: string | null, playerName: string, format: 'single' | 'series_5' = 'single') => {
    prepareForRoomTransition();
    localStorage.setItem(STORAGE_PLAYER_NAME, playerName);
    localStorage.removeItem(STORAGE_ROOM_CODE);
    localStorage.setItem(STORAGE_GAME_TYPE, gameType);
    if (variant) localStorage.setItem(STORAGE_VARIANT, variant);
    else localStorage.removeItem(STORAGE_VARIANT);
    localStorage.setItem(STORAGE_GAME_PATH, getGamePath(gameType, variant) || '/');
    localStorage.removeItem(STORAGE_RECONNECT_DEADLINE);
    setPlayerNameState(playerName);
    setMatchFormat(format);
    setPendingRoomAction({ kind: 'creating', roomCode: null, startedAt: Date.now() });
    send({ type: 'CreateRoom', game_type: gameType, variant, player_name: playerName, match_format: format });
  }, [prepareForRoomTransition, send, setPendingRoomAction]);

  const joinRoom = useCallback((code: string, playerName: string, gameType?: string | null, variant?: string | null) => {
    prepareForRoomTransition();
    localStorage.setItem(STORAGE_PLAYER_NAME, playerName);
    localStorage.setItem(STORAGE_ROOM_CODE, code);
    if (gameType) {
      localStorage.setItem(STORAGE_GAME_TYPE, gameType);
      if (variant) localStorage.setItem(STORAGE_VARIANT, variant);
      else localStorage.removeItem(STORAGE_VARIANT);
      localStorage.setItem(STORAGE_GAME_PATH, getGamePath(gameType, variant || null) || '/');
    }
    localStorage.removeItem(STORAGE_RECONNECT_DEADLINE);
    setRoomCode(code);
    setPlayerNameState(playerName);
    setGameStarted(false);
    syncGameState(null);
    setGameOver(false);
    setWinner(null);
    setScores([0, 0]);
    setOpponentDisconnected(false);
    setOpponentReconnectDeadline(null);
    setPlayAgainRequested(false);
    setOpponentPlayAgainRequested(false);
    setGameType(gameType || null);
    setVariant(variant || null);
    setPendingRoomAction({ kind: 'joining', roomCode: code, startedAt: Date.now() });
    send({ type: 'JoinRoom', room_code: code, player_name: playerName });
  }, [prepareForRoomTransition, send, setPendingRoomAction]);

  const joinSavedSession = useCallback(() => {
    const session = readSavedSession();
    if (!session) return;

    localStorage.removeItem(STORAGE_RECONNECT_DEADLINE);
    setSavedSession(null);
    setPlayerNameState(session.playerName);
    setPendingRoomAction({ kind: 'rejoining', roomCode: session.roomCode, startedAt: Date.now() });
    send({ type: 'JoinRoom', room_code: session.roomCode, player_name: session.playerName });
  }, [send, setPendingRoomAction]);

  const cancelPendingRoomAction = useCallback(() => {
    pendingRoomActionRef.current = null;
    setPendingRoomActionState(null);
  }, []);

  const clearSavedSession = useCallback(() => {
    clearSavedSessionStorage();
    setSavedSession(null);
  }, []);

  const sendAction = useCallback((action: any) => {
    send({ type: 'GameAction', action });
  }, [send]);

  const sendEmoji = useCallback((emoji: string) => {
    if (!emoji) {
      return;
    }
    send({ type: 'SendEmoji', emoji });
  }, [send]);

  const switchVariant = useCallback((nextVariant: string) => {
    if (!nextVariant) {
      return;
    }
    send({ type: 'SwitchVariant', variant: nextVariant });
  }, [send]);

  const requestPlayAgain = useCallback(() => {
    setPlayAgainRequested(true);
    send({ type: 'RequestPlayAgain' });
  }, [send]);

  const resetGame = useCallback(() => {
    syncGameState(null);
    setGameStarted(false);
    setGameOver(false);
    setWinner(null);
    setGameOverReason(null);
    setRoomCode(null);
    setPlayerNumber(null);
    setPlayerNameState(null);
    setOpponentName(null);
    setAllPlayerNames([]);
    setPlayerCount(2);
    setOpponentDisconnected(false);
    setOpponentReconnectDeadline(null);
    setGameType(null);
    setVariant(null);
    setScores([0, 0]);
    setMatchFormat('single');
    setPlayAgainRequested(false);
    setOpponentPlayAgainRequested(false);
    setRecentEmojis([]);
    setRoomActionPromptOpen(false);
  }, [syncGameState]);

  const openRoomActionPrompt = useCallback(() => {
    setRoomActionPromptOpen(true);
  }, []);

  const closeRoomActionPrompt = useCallback(() => {
    setRoomActionPromptOpen(false);
  }, []);

  const changeMatchFormat = useCallback((format: 'single' | 'series_5') => {
    setMatchFormat(format);
    send({ type: 'SetMatchFormat', format });
  }, [send]);

  const leaveRoom = useCallback(() => {
    clearSavedSessionStorage();
    setSavedSession(null);
    send({ type: 'LeaveRoom' });
    resetGame();
  }, [send, resetGame]);

  // Social & Presence side effects and callbacks
  const refetchFriends = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/social/friends');
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Failed to fetch friends', err);
    }
  }, [session]);

  useEffect(() => {
    refetchFriends();
  }, [session, refetchFriends]);

  // Identify user on websocket connect
  useEffect(() => {
    if (connected && session?.user) {
      const user = session.user as { id: string; name?: string; image?: string };
      send({
        type: 'Identify',
        user_id: user.id,
        name: user.name || 'Anonymous',
        image: user.image || null,
      });
    }
  }, [connected, session, send]);

  // Subscribe to friends presence once friends list is loaded
  useEffect(() => {
    if (connected && session?.user && friends.length > 0) {
      const friendIds = friends.map((f) => f.friend.id);
      send({
        type: 'SubscribePresence',
        friend_ids: friendIds,
      });
    }
  }, [connected, session, friends.length, send]);

  const sendGameInvite = useCallback((toUserId: string, gameType: string, inviteVariant: string | null = null) => {
    send({
      type: 'SendGameInvite',
      to_user_id: toUserId,
      game_type: gameType,
      variant: inviteVariant,
    });
  }, [send]);

  const declineGameInvite = useCallback((inviteId: string, fromUserId: string) => {
    send({
      type: 'DeclineGameInvite',
      invite_id: inviteId,
      from_user_id: fromUserId,
    });
    setActiveInvite(null);
  }, [send]);

  const acceptGameInvite = useCallback((invite: { roomCode: string; gameType: string; variant: string | null }) => {
    const defaultName = session?.user?.name || localStorage.getItem(STORAGE_PLAYER_NAME) || 'Player';
    joinRoom(invite.roomCode, defaultName, invite.gameType, invite.variant);
    setActiveInvite(null);
  }, [session, joinRoom]);

  const addFriend = useCallback(async (friendCode: string) => {
    try {
      const res = await fetch('/api/social/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add friend');
      }
      await refetchFriends();
      return data;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  }, [refetchFriends]);

  const respondToFriendRequest = useCallback(async (friendshipId: string, action: 'accept' | 'decline') => {
    try {
      const res = await fetch('/api/social/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to respond to friend request');
      }
      await refetchFriends();
      return data;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  }, [refetchFriends]);

  const clearDeclinedInvite = useCallback(() => {
    setDeclinedInvite(null);
  }, []);

  const savedSessionSecondsLeft = savedSession?.reconnectDeadline
    ? Math.max(0, Math.ceil((savedSession.reconnectDeadline - clockNow) / 1000))
    : null;
  const opponentReconnectSecondsLeft = opponentReconnectDeadline
    ? Math.max(0, Math.ceil((opponentReconnectDeadline - clockNow) / 1000))
    : null;

  return (
    <WebSocketContext.Provider value={{
      connected,
      playerId,
      playerNumber,
      roomCode,
      playerName,
      opponentName,
      allPlayerNames,
      playerCount,
      gameState,
      gameType,
      variant,
      turnStartedAt,
      scores,
      gameStarted,
      gameOver,
      winner,
      error,
      opponentDisconnected,
      savedSession,
      savedSessionSecondsLeft,
      opponentReconnectSecondsLeft,
      playAgainRequested,
      opponentPlayAgainRequested,
      recentEmojis,
      roomActionPromptOpen,
      pendingRoomAction,
      matchFormat,
      gameOverReason,
      cancelPendingRoomAction,
      createRoom,
      joinRoom,
      joinSavedSession,
      clearSavedSession,
      leaveRoom,
      sendAction,
      sendEmoji,
      switchVariant,
      changeMatchFormat,
      requestPlayAgain,
      resetGame,
      openRoomActionPrompt,
      closeRoomActionPrompt,
      friends,
      activeInvite,
      declinedInvite,
      clearDeclinedInvite,
      sendGameInvite,
      declineGameInvite,
      acceptGameInvite,
      addFriend,
      respondToFriendRequest,
      refetchFriends,
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useGame must be used within WebSocketProvider');
  return ctx;
}
