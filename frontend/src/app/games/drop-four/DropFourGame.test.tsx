import type React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DropFourGamePage from './DropFourGame';

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
      board: Array(42).fill(null),
      cols: 7,
      rows: 6,
      wreckingBallAvailable: [true, true],
      heavyAvailable: [true, true],
      flipAvailable: [true, true],
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

describe('DropFourGamePage', () => {
  beforeEach(() => {
    templateState.props = buildProps();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('drops a normal token into the selected column', () => {
    const sendAction = vi.fn();
    templateState.props = buildProps({ sendAction });

    render(<DropFourGamePage variant="classic" />);

    fireEvent.click(screen.getAllByText('Drop')[2]);

    expect(sendAction).toHaveBeenCalledWith({ game: 'DropFourMove', column: 2, piece: 'normal' });
  });

  it('uses the selected Wrecking Ball power for the next drop', () => {
    const sendAction = vi.fn();
    templateState.props = buildProps({ sendAction });

    render(<DropFourGamePage variant="wrecking-ball" />);

    fireEvent.click(screen.getByText('Wrecking Ball'));
    fireEvent.click(screen.getAllByText('Drop')[1]);

    expect(sendAction).toHaveBeenCalledWith({ game: 'DropFourMove', column: 1, piece: 'wrecking-ball' });
  });
});