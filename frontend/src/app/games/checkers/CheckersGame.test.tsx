import type React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CheckersGamePage from './CheckersGame';

const templateState = vi.hoisted(() => ({
  props: {} as Record<string, unknown>,
}));

vi.mock('@/components/GameTemplate', () => ({
  default: ({ children }: { children: (props: Record<string, unknown>) => React.ReactNode }) => (
    <div data-testid="game-template">{children(templateState.props)}</div>
  ),
}));

function buildProps(overrides: Record<string, unknown> = {}) {
  return {
    gameState: {
      board: Array(64).fill(null),
      needsSetup: false,
      mySetupComplete: true,
    },
    playerNumber: 0,
    playerName: 'Alex',
    opponentName: 'Blair',
    allPlayerNames: ['Alex', 'Blair'],
    isMyTurn: true,
    sendAction: vi.fn(),
    gameOver: false,
    winner: null,
    ...overrides,
  };
}

describe('CheckersGamePage', () => {
  beforeEach(() => {
    templateState.props = buildProps();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('sends a checkers move after selecting a piece and destination', () => {
    const board = Array(64).fill(null);
    board[40] = { owner: 0, isKing: false, isVip: false };
    const sendAction = vi.fn();
    templateState.props = buildProps({
      gameState: { board, needsSetup: false, mySetupComplete: true },
      sendAction,
    });

    render(<CheckersGamePage variant="classic" />);

    fireEvent.click(screen.getByLabelText('Square 41'));
    fireEvent.click(screen.getByLabelText('Square 34'));

    expect(sendAction).toHaveBeenCalledWith({ game: 'CheckersMove', from: 40, to: 33 });
  });

  it('locks selected minefield setup squares', () => {
    const sendAction = vi.fn();
    templateState.props = buildProps({
      gameState: { board: Array(64).fill(null), needsSetup: true, mySetupComplete: false, myMines: [] },
      sendAction,
    });

    render(<CheckersGamePage variant="minefield" />);

    fireEvent.click(screen.getByLabelText('Square 18'));
    fireEvent.click(screen.getByText('Lock Setup'));

    expect(sendAction).toHaveBeenCalledWith({ game: 'CheckersSecret', mines: [17] });
  });
});