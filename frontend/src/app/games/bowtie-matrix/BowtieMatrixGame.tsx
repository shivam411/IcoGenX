// frontend/src/app/games/bowtie-matrix/BowtieMatrixGame.tsx
'use client';

import React, { useState } from 'react';
import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

// Node coordinates on 400x400 SVG grid
const NODE_COORDS: [number, number][] = [
  [50, 50],    // 0: top-left outer
  [50, 200],   // 1: mid-left outer
  [50, 350],   // 2: bottom-left outer
  [125, 125],  // 3: top-left inner
  [125, 200],  // 4: mid-left inner
  [125, 275],  // 5: bottom-left inner
  [200, 200],  // 6: shared center
  [275, 125],  // 7: top-right inner
  [275, 200],  // 8: mid-right inner
  [275, 275],  // 9: bottom-right inner
  [350, 50],   // 10: top-right outer
  [350, 200],  // 11: mid-right outer
  [350, 350],  // 12: bottom-right outer
];

const CONNECTIONS: [number, number][] = [
  // Left outer/inner edges
  [0, 1], [1, 2], [3, 4], [4, 5],
  // Left lines to center
  [0, 3], [3, 6], [1, 4], [4, 6], [2, 5], [5, 6],
  // Left diagonals
  [0, 4], [2, 4], [1, 3], [1, 5],
  
  // Right outer/inner edges
  [10, 11], [11, 12], [7, 8], [8, 9],
  // Right lines to center
  [10, 7], [7, 6], [11, 8], [8, 6], [12, 9], [9, 6],
  // Right diagonals
  [10, 8], [12, 8], [11, 7], [11, 9],
];

const JUMPS: [number, number, number][] = [
  // Left outer edge
  [0, 1, 2], [2, 1, 0],
  // Left inner edge
  [3, 4, 5], [5, 4, 3],
  // Left rays to center
  [0, 3, 6], [6, 3, 0],
  [1, 4, 6], [6, 4, 1],
  [2, 5, 6], [6, 5, 2],

  // Right outer edge
  [10, 11, 12], [12, 11, 10],
  // Right inner edge
  [7, 8, 9], [9, 8, 7],
  // Right rays to center
  [10, 7, 6], [6, 7, 10],
  [11, 8, 6], [6, 8, 11],
  [12, 9, 6], [6, 9, 12],

  // Center crossing straight lines
  [3, 6, 9], [9, 6, 3],
  [5, 6, 7], [7, 6, 5],
  [4, 6, 8], [8, 6, 4],
];

function BowtieMatrixBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  if (!gameState) return null;

  const board: (number | null)[] = gameState.board || Array(13).fill(null);
  const currentPlayer: number = gameState.currentPlayer ?? 0;
  const lastEvent = gameState.last_event || 'Move or jump to play!';

  const playerIdx = playerNumber;
  const oppIdx = 1 - playerIdx;

  const isP1 = playerIdx === 0;
  const myColor = isP1 ? '#22d3ee' : '#fb7185';
  const oppColor = isP1 ? '#fb7185' : '#22d3ee';

  // Symmetrical score counters (piece counts)
  const myPieceCount = board.filter((cell: number | null) => cell === playerIdx).length;
  const oppPieceCount = board.filter((cell: number | null) => cell === oppIdx).length;

  const getAdjacents = (idx: number): number[] => {
    return CONNECTIONS.filter(([u, v]: [number, number]) => u === idx || v === idx)
      .map(([u, v]: [number, number]) => (u === idx ? v : u));
  };

  const getJumpTargets = (idx: number): { target: number; mid: number }[] => {
    return JUMPS.filter(([f, , ]: [number, number, number]) => f === idx)
      .map(([, m, t]: [number, number, number]) => ({ target: t, mid: m }));
  };

  const getValidDestinations = (from: number): number[] => {
    const dests: number[] = [];
    
    // Adjacent empty nodes
    const adjs = getAdjacents(from);
    adjs.forEach((to: number) => {
      if (board[to] === null) {
        dests.push(to);
      }
    });

    // Jump targets over opponent
    const jumps = getJumpTargets(from);
    jumps.forEach(({ target, mid }: { target: number; mid: number }) => {
      if (board[target] === null && board[mid] === oppIdx) {
        dests.push(target);
      }
    });

    return dests;
  };

  const handleNodeClick = (idx: number) => {
    if (gameOver || !isMyTurn) return;

    const owner = board[idx];
    if (owner === playerIdx) {
      // Select own piece
      setSelectedNode(idx === selectedNode ? null : idx);
    } else if (selectedNode !== null) {
      // Try to move to this node
      const validDests = getValidDestinations(selectedNode);
      if (validDests.includes(idx)) {
        sendAction({
          action: 'MovePiece',
          from: selectedNode,
          to: idx,
        });
      }
      setSelectedNode(null);
    }
  };

  const validDestinations = selectedNode !== null ? getValidDestinations(selectedNode) : [];

  return (
    <div className={styles.boardShell}>
      {/* Event banner */}
      <div className={styles.statusBar}>
        <span className={styles.statusText}>{lastEvent}</span>
      </div>

      {/* Main split */}
      <div className={styles.gameArea}>
        {/* Left Side: Score & Turns */}
        <div className={styles.sideDashboard}>
          <div className={styles.scoreCard} style={{ borderColor: myColor }}>
            <div className={styles.scoreLabel}>Your Pieces:</div>
            <div className={styles.scoreVal}>{myPieceCount} / 4</div>
          </div>
          <div className={styles.scoreCard} style={{ borderColor: oppColor }}>
            <div className={styles.scoreLabel}>{opponentName || 'Opponent'}'s Pieces:</div>
            <div className={styles.scoreVal}>{oppPieceCount} / 4</div>
          </div>

          <div className={styles.turnBox}>
            {isMyTurn ? (
              <div className={styles.activeTurnAlert} style={{ color: myColor }}>
                🎯 YOUR TURN
              </div>
            ) : (
              <div className={styles.inactiveTurnAlert}>
                ⏳ {allPlayerNames[oppIdx] || opponentName || 'Opponent'}'s Turn...
              </div>
            )}
          </div>
        </div>

        {/* Center: The SVG Bowtie Board */}
        <div className={styles.boardContainer}>
          <svg
            viewBox="0 0 400 400"
            className={styles.svgBoard}
          >
            {/* Draw connections */}
            {CONNECTIONS.map(([u, v]: [number, number], idx: number) => {
              const [x1, y1] = NODE_COORDS[u];
              const [x2, y2] = NODE_COORDS[v];
              return (
                <line
                  key={`line-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={styles.boardLine}
                />
              );
            })}

            {/* Draw highlights for valid moves */}
            {validDestinations.map((to: number) => {
              const [cx, cy] = NODE_COORDS[to];
              return (
                <circle
                  key={`highlight-${to}`}
                  cx={cx}
                  cy={cy}
                  r={18}
                  className={styles.destinationHighlight}
                />
              );
            })}

            {/* Draw board nodes / pieces */}
            {NODE_COORDS.map(([cx, cy]: [number, number], idx: number) => {
              const owner = board[idx];
              const isSelected = selectedNode === idx;
              const hasPiece = owner !== null;

              let pieceClass = '';
              let pieceStyle: React.CSSProperties = {};

              if (hasPiece) {
                const color = owner === 0 ? '#22d3ee' : '#fb7185';
                pieceClass = owner === playerIdx ? styles.myPiece : styles.oppPiece;
                pieceStyle = {
                  '--piece-color': color,
                  '--piece-glow': `${color}aa`,
                } as React.CSSProperties;
              }

              return (
                <g
                  key={`node-${idx}`}
                  onClick={() => handleNodeClick(idx)}
                  className={styles.nodeGroup}
                >
                  {/* Empty slot circle background */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    className={`
                      ${styles.nodeSlot} 
                      ${isSelected ? styles.slotSelected : ''}
                    `}
                  />

                  {/* Render piece disk */}
                  {hasPiece && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={14}
                      className={`${styles.pieceDisc} ${pieceClass}`}
                      style={pieceStyle}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function BowtieMatrixGamePage() {
  return (
    <GameTemplate
      gameType="bowtie_matrix"
      gameName="The Bowtie Matrix"
      gameIcon="bowtie-matrix"
      accentColor="#06b6d4"
      winEmoji="🏹"
      winTitle="Chokepoint Secured!"
      loseTitle="Stalemate Limit Reached"
      drawTitle="Draw by Inaction"
    >
      {(props) => <BowtieMatrixBoard {...props} />}
    </GameTemplate>
  );
}
