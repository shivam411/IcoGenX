'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const LOCAL_WS_URL = 'ws://localhost:6100/ws';
const PRODUCTION_WS_URL = 'wss://api.icogenx.com/ws';

function resolveWebSocketUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === 'undefined') {
    return PRODUCTION_WS_URL;
  }

  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return LOCAL_WS_URL;
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

const RECONNECT_WINDOW_MS = 20_000;
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
  gameState: GameState | null;
  gameType: string | null;
  variant: string | null;
  scores: [number, number];
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
  createRoom: (gameType: string, variant: string | null, playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string, gameType?: string | null, variant?: string | null) => void;
  joinSavedSession: () => void;
  clearSavedSession: () => void;
  leaveRoom: () => void;
  sendAction: (action: any) => void;
  sendEmoji: (emoji: string) => void;
  switchVariant: (variant: string) => void;
  requestPlayAgain: () => void;
  resetGame: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [playerName, setPlayerNameState] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameType, setGameType] = useState<string | null>(null);
  const [variant, setVariant] = useState<string | null>(null);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
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
  
  // Refs for stable callbacks
  const playerIdRef = useRef<string | null>(null);
  const handleMessageRef = useRef<(event: MessageEvent) => void>(() => {});

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      console.log('[WS] ← Received:', msg.type, msg);
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
          setGameStarted(false);
          setGameState(null);
          setGameOver(false);
          setWinner(null);
          setPlayAgainRequested(false);
          setOpponentPlayAgainRequested(false);
          setRecentEmojis([]);
          setPlayerNumber(0); // Creator is always player 0
          break;
        case 'PlayerJoined':
          if (msg.player_number !== undefined) {
            // If I am joining, this confirms my number
            if (msg.player_id === playerIdRef.current) {
              setPlayerNumber(msg.player_number);
              if (msg.game_type) setGameType(msg.game_type);
              setVariant(msg.variant || null);
              if (msg.game_type) {
                localStorage.setItem(STORAGE_GAME_TYPE, msg.game_type);
                if (msg.variant) localStorage.setItem(STORAGE_VARIANT, msg.variant);
                else localStorage.removeItem(STORAGE_VARIANT);
                localStorage.setItem(STORAGE_GAME_PATH, getGamePath(msg.game_type, msg.variant || null) || '/');
                localStorage.removeItem(STORAGE_RECONNECT_DEADLINE);
                setSavedSession(null);
              }
            } else {
              // Someone else joined, they are my opponent
              setOpponentName(msg.player_name);
              setOpponentDisconnected(false);
              setOpponentReconnectDeadline(null);
            }
          }
          break;
        case 'GameStart':
          setGameStarted(true);
          setGameState(msg.game_state);
          if (msg.scores) setScores(msg.scores);
          if (msg.game_type) setGameType(msg.game_type);
          setVariant(msg.variant || null);
          setGameOver(false);
          setWinner(null);
          setPlayAgainRequested(false);
          setOpponentPlayAgainRequested(false);
          setRecentEmojis([]);
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
          setGameState(msg.game_state);
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
          break;
        case 'Error':
          console.error('[WS] Error from server:', msg.message);
          if (msg.message === 'Room not found' || msg.message === 'Room is full') {
            clearSavedSessionStorage();
            setSavedSession(null);
            setRoomCode(null);
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
          setGameState(msg.game_state);
          if (msg.scores) setScores(msg.scores);
          setGameOver(false);
          setWinner(null);
          setPlayAgainRequested(false);
          setOpponentPlayAgainRequested(false);
          break;
      }
    } catch (e) {
      console.error('[WS] Failed to parse message:', e);
    }
  }, []); // No dependencies

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const wsUrl = resolveWebSocketUrl();
    console.log('[WS] Connecting to', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to', wsUrl);
      setConnected(true);
    };

    ws.onclose = (event) => {
      console.log(`[WS] Disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
      setConnected(false);
      // Only reconnect if we haven't intentionally cleaned up
      if (reconnectTimerRef.current === null) {
        console.log('[WS] Attempting to reconnect in 2s...');
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connectWs();
        }, 2000);
      }
    };

    ws.onerror = (err) => {
      console.error('[WS] Error Event:', err);
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
      wsRef.current?.close();
    };
  }, [connectWs]);

  useEffect(() => {
    if (!savedSession?.reconnectDeadline && !opponentReconnectDeadline) return;

    const timer = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [savedSession?.reconnectDeadline, opponentReconnectDeadline]);

  const send = useCallback((msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WS] → Sending:', msg.type, msg);
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn('[WS] Cannot send, socket not open. State:', wsRef.current?.readyState);
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
    setGameState(null);
    setGameType(null);
    setVariant(null);
    setScores([0, 0]);
    setGameStarted(false);
    setGameOver(false);
    setWinner(null);
    setError(null);
    setOpponentDisconnected(false);
    setOpponentReconnectDeadline(null);
    setPlayAgainRequested(false);
    setOpponentPlayAgainRequested(false);
    setRecentEmojis([]);
  }, [roomCode, send]);

  const createRoom = useCallback((gameType: string, variant: string | null, playerName: string) => {
    prepareForRoomTransition();
    localStorage.setItem(STORAGE_PLAYER_NAME, playerName);
    localStorage.removeItem(STORAGE_ROOM_CODE);
    localStorage.setItem(STORAGE_GAME_TYPE, gameType);
    if (variant) localStorage.setItem(STORAGE_VARIANT, variant);
    else localStorage.removeItem(STORAGE_VARIANT);
    localStorage.setItem(STORAGE_GAME_PATH, getGamePath(gameType, variant) || '/');
    localStorage.removeItem(STORAGE_RECONNECT_DEADLINE);
    setPlayerNameState(playerName);
    send({ type: 'CreateRoom', game_type: gameType, variant, player_name: playerName });
  }, [prepareForRoomTransition, send]);

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
    setGameState(null);
    setGameOver(false);
    setWinner(null);
    setScores([0, 0]);
    setOpponentDisconnected(false);
    setOpponentReconnectDeadline(null);
    setPlayAgainRequested(false);
    setOpponentPlayAgainRequested(false);
    setGameType(gameType || null);
    setVariant(variant || null);
    send({ type: 'JoinRoom', room_code: code, player_name: playerName });
  }, [prepareForRoomTransition, send]);

  const joinSavedSession = useCallback(() => {
    const session = readSavedSession();
    if (!session) return;

    localStorage.removeItem(STORAGE_RECONNECT_DEADLINE);
    setSavedSession(null);
    setPlayerNameState(session.playerName);
    send({ type: 'JoinRoom', room_code: session.roomCode, player_name: session.playerName });
  }, [send]);

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
    setGameState(null);
    setGameStarted(false);
    setGameOver(false);
    setWinner(null);
    setRoomCode(null);
    setPlayerNumber(null);
    setPlayerNameState(null);
    setOpponentName(null);
    setOpponentDisconnected(false);
    setOpponentReconnectDeadline(null);
    setGameType(null);
    setVariant(null);
    setScores([0, 0]);
    setPlayAgainRequested(false);
    setOpponentPlayAgainRequested(false);
    setRecentEmojis([]);
  }, []);

  const leaveRoom = useCallback(() => {
    clearSavedSessionStorage();
    setSavedSession(null);
    send({ type: 'LeaveRoom' });
    resetGame();
  }, [send, resetGame]);

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
      gameState,
      gameType,
      variant,
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
      createRoom,
      joinRoom,
      joinSavedSession,
      clearSavedSession,
      leaveRoom,
      sendAction,
      sendEmoji,
      switchVariant,
      requestPlayAgain,
      resetGame,
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
