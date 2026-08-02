// frontend/src/app/games/uno-matrix/UnoMatrixGame.tsx
'use client';

import GameTemplate, { GameBoardProps } from '@/components/GameTemplate';
import styles from './game.module.css';

interface UnoCardProps {
  color: string;
  kind: string;
  className?: string;
}

function UnoCardComponent({ color, kind, className = '' }: UnoCardProps) {
  const isBack = color === 'back';
  const isHidden = color === 'hidden';

  let cardClass = styles.unoCard;
  if (isBack) cardClass += ` ${styles.cardBack}`;
  else if (isHidden) cardClass += ` ${styles.cardHidden}`;
  else {
    if (color === 'red') cardClass += ` ${styles.cardRed}`;
    else if (color === 'yellow') cardClass += ` ${styles.cardYellow} ${styles.yellowInner}`;
    else if (color === 'green') cardClass += ` ${styles.cardGreen}`;
    else if (color === 'blue') cardClass += ` ${styles.cardBlue}`;
    else if (color === 'wild') cardClass += ` ${styles.cardWild}`;
  }

  const getKindLabel = (k: string) => {
    if (k === 'skip') return '🚫';
    if (k === 'reverse') return '🔁';
    if (k === 'draw2') return '+2';
    if (k === 'wild4') return '+4';
    if (k === 'wild') return 'W';
    return k;
  };

  if (isBack) {
    return (
      <div className={`${cardClass} ${className}`}>
        <div className={styles.cardBackInner}>
          <span className={styles.cardBackText}>UNO</span>
        </div>
      </div>
    );
  }

  if (isHidden) {
    return (
      <div className={`${cardClass} ${className}`}>
        <div className={styles.cardCenter}>
          <span className={styles.cardCenterText}>?</span>
        </div>
      </div>
    );
  }

  const label = getKindLabel(kind);

  return (
    <div className={`${cardClass} ${className}`}>
      <div className={styles.cardCorner}>
        <span>{label}</span>
      </div>
      <div className={styles.cardCenter}>
        <span className={styles.cardCenterText}>{label}</span>
      </div>
      <div className={styles.cardCornerBottom}>
        <span>{label}</span>
      </div>
    </div>
  );
}

function UnoMatrixBoard({
  gameState,
  playerNumber,
  playerName,
  opponentName,
  allPlayerNames,
  isMyTurn,
  sendAction,
  gameOver,
}: GameBoardProps) {
  if (!gameState) return null;

  const grids: UnoCardProps[][] = gameState.grid_cards || [[], []];
  const placedCards: (UnoCardProps | null)[][] = gameState.placed_cards || [[], []];
  const revealed: boolean[][] = gameState.revealed || [[], []];
  const drawPiles = gameState.draw_piles || [];
  const lastDrawn: UnoCardProps | null = gameState.last_drawn || null;
  const lastEvent: string | null = gameState.last_event || null;
  const currentPlayer: number = gameState.currentPlayer ?? 0;
  const scores: number[] = gameState.scores || [0, 0];

  const playerIdx = playerNumber as number;
  const oppIdx = 1 - playerIdx;

  const myGrid = grids[playerIdx] || [];
  const myPlaced = placedCards[playerIdx] || [];
  const myRevealed = revealed[playerIdx] || [];

  const oppRevealed = revealed[oppIdx] || [];

  const myDrawPile = drawPiles[playerIdx] || { count: 0 };
  const pileCount = typeof myDrawPile.count === 'number' ? myDrawPile.count : 0;

  const handleDrawClick = () => {
    if (!isMyTurn || gameOver || pileCount === 0) return;
    sendAction({ action: 'DrawCard' });
  };

  const rows = ['Green', 'Blue', 'Yellow', 'Red'];
  const cols = ['1', '2', '3', '4'];

  const player1Name = allPlayerNames[0] || 'Player 1';
  const player2Name = allPlayerNames[1] || 'Player 2';

  return (
    <div className={styles.shell}>
      {/* Event Banner */}
      <div className={styles.statusBar}>
        <span>{lastEvent || 'Click your draw pile to draw a card and race to reveal coordinates.'}</span>
      </div>

      {/* Main Game Split */}
      <div className={styles.gameArea}>
        {/* Left Panel: Personal Matrix Grid */}
        <div className={styles.leftPanel}>
          {/* Active scores */}
          <div className={styles.scoreBoard}>
            <div className={`${styles.scoreCard} ${currentPlayer === 0 ? styles.activeP1 : ''}`}>
              <div className={styles.scoreLabel}>{player1Name} Completed:</div>
              <div className={styles.scoreVal}>{scores[0]} / 16</div>
            </div>
            <div className={`${styles.scoreCard} ${currentPlayer === 1 ? styles.activeP2 : ''}`}>
              <div className={styles.scoreLabel}>{player2Name} Completed:</div>
              <div className={styles.scoreVal}>{scores[1]} / 16</div>
            </div>
          </div>

          {/* 4x4 Header Columns */}
          <div className={styles.gridWithRowHeaders}>
            <div />
            <div className={styles.gridHeaderRow}>
              {cols.map((col) => (
                <div key={`col-h-${col}`} className={styles.colHeader}>
                  Col {col}
                </div>
              ))}
            </div>
          </div>

          {/* 4x4 Grid Board with Row Headers */}
          <div className={styles.gridWithRowHeaders}>
            <div className={styles.rowHeaders}>
              {rows.map((row, rIdx) => {
                let rClass = styles.rowHeader;
                if (rIdx === 0) rClass += ` ${styles.rowHeaderGreen}`;
                else if (rIdx === 1) rClass += ` ${styles.rowHeaderBlue}`;
                else if (rIdx === 2) rClass += ` ${styles.rowHeaderYellow}`;
                else rClass += ` ${styles.rowHeaderRed}`;

                return (
                  <div key={`row-h-${row}`} className={rClass}>
                    {row.charAt(0)}
                  </div>
                );
              })}
            </div>

            <div className={styles.matrixGrid}>
              {Array.from({ length: 16 }).map((_, idx) => {
                const isFlipped = myRevealed[idx];
                const placeholder = myGrid[idx];
                const placed = myPlaced[idx];

                return (
                  <div key={`cell-${idx}`} className={styles.gridCell}>
                    {!isFlipped ? (
                      <UnoCardComponent color="back" kind="back" />
                    ) : (
                      <div className={styles.cardStack}>
                        {placeholder && (
                          <UnoCardComponent
                            color={placeholder.color}
                            kind={placeholder.kind}
                            className={styles.placeholderCard}
                          />
                        )}
                        {placed && (
                          <UnoCardComponent
                            color={placed.color}
                            kind={placed.kind}
                            className={styles.overlayCard}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Draw pile and opponent mini tracker */}
        <div className={styles.rightPanel}>
          {/* Deck Console */}
          <div className={styles.drawConsole}>
            <div
              className={`${styles.deckContainer} ${
                !isMyTurn || gameOver || pileCount === 0 ? styles.deckDisabled : ''
              }`}
              onClick={handleDrawClick}
            >
              {pileCount > 0 && <div className={styles.deckBack} />}
            </div>
            <span
              className={`${styles.drawPrompt} ${
                isMyTurn && !gameOver && pileCount > 0 ? styles.drawPromptActive : ''
              }`}
            >
              {isMyTurn
                ? `Draw Pile: ${pileCount} cards (Click to Draw!)`
                : `Opponent's turn (${pileCount} cards left)`}
            </span>
          </div>

          {/* Last Drawn Card display */}
          {lastDrawn && (
            <div className={styles.lastDrawnPanel}>
              <span className={styles.lastDrawnTitle}>Last Drawn Card</span>
              <div className={styles.lastDrawnWrapper}>
                <UnoCardComponent color={lastDrawn.color} kind={lastDrawn.kind} />
              </div>
            </div>
          )}

          {/* Opponent Mini Tracker Grid */}
          <div className={styles.miniGridContainer}>
            <h3>{opponentName || 'Opponent'}'s Grid</h3>
            <div className={styles.miniGrid}>
              {Array.from({ length: 16 }).map((_, idx) => {
                const isFlipped = oppRevealed[idx];
                return (
                  <div
                    key={`opp-mini-${idx}`}
                    className={`${styles.miniCell} ${isFlipped ? styles.miniCellCompleted : ''}`}
                    title={isFlipped ? 'Revealed' : 'Hidden'}
                  >
                    {isFlipped ? '✓' : ''}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UnoMatrixGamePage() {
  return (
    <GameTemplate
      gameType="uno_matrix"
      gameName="UNO Matrix Race"
      gameIcon="uno-matrix"
      accentColor="#ef4444"
      winEmoji="🏆"
      winTitle="Winner Winner!"
      loseTitle="Matches Finished"
      drawTitle="Piles Exhausted"
    >
      {(props) => <UnoMatrixBoard {...props} />}
    </GameTemplate>
  );
}
