'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:6100/ws';

interface GameState {
  [key: string]: any;
}

interface EmojiReaction {
  id: number;
  emoji: string;
  fromSelf: boolean;
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
  playAgainRequested: boolean;
  opponentPlayAgainRequested: boolean;
  recentEmojis: EmojiReaction[];
  createRoom: (gameType: string, variant: string | null, playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  leaveRoom: () => void;
  sendAction: (action: any) => void;
  sendEmoji: (emoji: string) => void;
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
          // Try to auto-reconnect if we have a saved session
          const savedRoom = localStorage.getItem('arena_room_code');
          const savedName = localStorage.getItem('arena_player_name');
          // Only auto-reconnect if we are not currently in a room (roomCode is likely null on fresh load)
          if (savedRoom && savedName) {
            console.log('[WS] Auto-reconnecting to room:', savedRoom);
            setPlayerNameState(savedName);
            // Send join directly since wsRef.current might not be fully established in our React state yet
            const joinMsg = JSON.stringify({ type: 'JoinRoom', room_code: savedRoom, player_name: savedName });
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(joinMsg);
            }
          }
          break;
        case 'RoomCreated':
          localStorage.setItem('arena_room_code', msg.room_code);
          setRoomCode(msg.room_code);
          setGameType(msg.game_type);
          if (msg.variant) setVariant(msg.variant);
          setPlayerNumber(0); // Creator is always player 0
          break;
        case 'PlayerJoined':
          if (msg.player_number !== undefined) {
            // If I am joining, this confirms my number
            if (msg.player_id === playerIdRef.current) {
              setPlayerNumber(msg.player_number);
              if (msg.game_type) setGameType(msg.game_type);
              if (msg.variant) setVariant(msg.variant);
            } else {
              // Someone else joined, they are my opponent
              setOpponentName(msg.player_name);
              setOpponentDisconnected(false);
            }
          }
          break;
        case 'GameStart':
          setGameStarted(true);
          setGameState(msg.game_state);
          if (msg.scores) setScores(msg.scores);
          if (msg.game_type) setGameType(msg.game_type);
          if (msg.variant) setVariant(msg.variant);
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
            const currentSavedRoom = localStorage.getItem('arena_room_code');
            if (currentSavedRoom) {
              alert(`Session ended: ${msg.message}`);
              localStorage.removeItem('arena_room_code');
            }
            // Clear local state since we can't join
            setRoomCode(null);
          }
          setError(msg.message);
          setTimeout(() => setError(null), 5000);
          break;
        case 'OpponentDisconnected':
          setOpponentDisconnected(true);
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

    console.log('[WS] Connecting to', WS_URL);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to', WS_URL);
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

    return () => {
      // Cleanup on unmount
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null as any;
      }
      wsRef.current?.close();
    };
  }, [connectWs]);

  const send = useCallback((msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WS] → Sending:', msg.type, msg);
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn('[WS] Cannot send, socket not open. State:', wsRef.current?.readyState);
    }
  }, []);

  const createRoom = useCallback((gameType: string, variant: string | null, playerName: string) => {
    localStorage.setItem('arena_player_name', playerName);
    setPlayerNameState(playerName);
    send({ type: 'CreateRoom', game_type: gameType, variant, player_name: playerName });
  }, [send]);

  const joinRoom = useCallback((code: string, playerName: string) => {
    localStorage.setItem('arena_player_name', playerName);
    localStorage.setItem('arena_room_code', code);
    setPlayerNameState(playerName);
    send({ type: 'JoinRoom', room_code: code, player_name: playerName });
  }, [send]);

  const sendAction = useCallback((action: any) => {
    send({ type: 'GameAction', action });
  }, [send]);

  const sendEmoji = useCallback((emoji: string) => {
    if (!emoji) {
      return;
    }
    send({ type: 'SendEmoji', emoji });
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
    setGameType(null);
    setVariant(null);
    setScores([0, 0]);
    setPlayAgainRequested(false);
    setOpponentPlayAgainRequested(false);
    setRecentEmojis([]);
  }, []);

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('arena_room_code');
    send({ type: 'LeaveRoom' });
    resetGame();
  }, [send, resetGame]);

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
      playAgainRequested,
      opponentPlayAgainRequested,
      recentEmojis,
      createRoom,
      joinRoom,
      leaveRoom,
      sendAction,
      sendEmoji,
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
