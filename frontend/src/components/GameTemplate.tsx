/* frontend/src/components/GameTemplate.tsx */
'use client';

import React from 'react';
import Lobby from './Lobby';
import GameFrame from './GameFrame';
import GameOverOverlay from './GameOverOverlay';
import { useGame } from '@/context/GameContext';
import { getGameInfo } from '@/lib/gameMetadata';

export interface GameBoardProps {
  gameState: any;
  playerNumber: number;
  playerName: string;
  opponentName: string;
  allPlayerNames: string[];
  isMyTurn: boolean;
  sendAction: (action: any) => void;
  gameOver: boolean;
  winner: string | null;
}

interface GameTemplateProps {
  gameType: string;
  variant?: string;
  gameName: string;
  gameIcon: string;
  accentColor: string;
  winEmoji?: string;
  winTitle?: string;
  loseTitle?: string;
  drawTitle?: string;
  children: (props: GameBoardProps) => React.ReactNode;
  gameOverChildren?: (props: GameBoardProps) => React.ReactNode;
}

export default function GameTemplate({
  gameType,
  variant,
  gameName,
  gameIcon,
  accentColor,
  winEmoji,
  winTitle,
  loseTitle,
  drawTitle,
  children,
  gameOverChildren,
}: GameTemplateProps) {
  const game = useGame();
  const {
    roomCode,
    gameStarted,
    gameState,
    playerNumber,
    playerName,
    opponentName,
    allPlayerNames,
    sendAction,
    gameOver,
    winner,
  } = game;

  // Render lobby if not in a room or if game hasn't started yet
  if (!roomCode || !gameStarted || !gameState) {
    return (
      <Lobby
        gameType={gameType}
        variant={variant}
        gameName={gameName}
        gameIcon={gameIcon}
        accentColor={accentColor}
        hideOverlaysOnGameOver={true}
      >
        <div style={{ display: 'none' }} />
      </Lobby>
    );
  }

  const currentPlayer = typeof gameState.currentPlayer === 'number' ? gameState.currentPlayer : null;
  const isMyTurn = currentPlayer !== null && currentPlayer === playerNumber;

  // Resolve active turn text
  const getTurnText = () => {
    if (isMyTurn) return '🎯 Your turn!';
    
    // Find active player's name
    if (currentPlayer !== null) {
      const activeName = allPlayerNames[currentPlayer] || (currentPlayer === 1 ? (opponentName || 'Opponent') : `Player ${currentPlayer + 1}`);
      return `⏳ ${activeName}'s turn...`;
    }
    return '';
  };

  const gameInfo = getGameInfo(gameType, variant || null);

  const boardProps: GameBoardProps = {
    gameState,
    playerNumber: playerNumber ?? 0,
    playerName: playerName ?? '',
    opponentName: opponentName ?? '',
    allPlayerNames,
    isMyTurn,
    sendAction,
    gameOver,
    winner,
  };

  return (
    <Lobby
      gameType={gameType}
      variant={variant}
      gameName={gameName}
      gameIcon={gameIcon}
      accentColor={accentColor}
      hideOverlaysOnGameOver={true}
    >
      <GameFrame
        turnText={getTurnText()}
        rules={gameInfo?.rules || []}
        tips={gameInfo?.tips}
        rulesTitle={gameInfo?.rulesTitle || 'Rules'}
        currentPlayer={currentPlayer}
      >
        {children(boardProps)}
      </GameFrame>

      {gameOver && (
        <GameOverOverlay
          winEmoji={winEmoji}
          winTitle={winTitle}
          loseTitle={loseTitle}
          drawTitle={drawTitle}
        >
          {gameOverChildren && gameOverChildren(boardProps)}
        </GameOverOverlay>
      )}
    </Lobby>
  );
}
