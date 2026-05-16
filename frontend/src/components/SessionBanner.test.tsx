import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SessionBanner from './SessionBanner';

const mockPush = vi.fn();
const mockUseGame = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/context/GameContext', () => ({
  useGame: () => mockUseGame(),
}));

function buildGameState(overrides: Record<string, unknown> = {}) {
  return {
    connected: true,
    roomCode: null,
    gameType: null,
    variant: null,
    gameStarted: false,
    opponentDisconnected: false,
    savedSession: null,
    savedSessionSecondsLeft: null,
    opponentReconnectSecondsLeft: null,
    joinSavedSession: vi.fn(),
    clearSavedSession: vi.fn(),
    ...overrides,
  };
}

describe('SessionBanner', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when there is no active or saved session', () => {
    mockUseGame.mockReturnValue(buildGameState());

    const { container } = render(<SessionBanner />);

    expect(container.firstChild).toBeNull();
  });

  it('lets a player explicitly rejoin a saved room and navigates to the game route', () => {
    const joinSavedSession = vi.fn();
    mockUseGame.mockReturnValue(
      buildGameState({
        savedSessionSecondsLeft: 18,
        joinSavedSession,
        savedSession: {
          roomCode: 'AB12CD',
          playerName: 'Alex',
          gameType: 'tic_tac_toe',
          variant: 'disappearing',
          path: '/games/tic-tac-toe/disappearing',
          reconnectDeadline: Date.now() + 18_000,
        },
      }),
    );

    render(<SessionBanner />);

    expect(screen.getByText('Last game available')).toBeTruthy();
    expect(screen.getByText('Room AB12CD · return window 00:18')).toBeTruthy();

    fireEvent.click(screen.getByText('Join'));
    expect(joinSavedSession).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/games/tic-tac-toe/disappearing');
  });

  it('does not show the saved room strip while already connected to a room', () => {
    mockUseGame.mockReturnValue(
      buildGameState({
        roomCode: 'AB12CD',
        savedSessionSecondsLeft: 18,
        savedSession: {
          roomCode: 'AB12CD',
          playerName: 'Alex',
          gameType: 'tic_tac_toe',
          variant: 'disappearing',
          path: '/games/tic-tac-toe/disappearing',
          reconnectDeadline: Date.now() + 18_000,
        },
      }),
    );

    const { container } = render(<SessionBanner />);

    expect(container.firstChild).toBeNull();
  });

  it('shows opponent disconnect timing without taking over the page', () => {
    mockUseGame.mockReturnValue(
      buildGameState({
        gameStarted: true,
        gameType: 'tic_tac_toe',
        variant: 'classic',
        opponentDisconnected: true,
        opponentReconnectSecondsLeft: 12,
      }),
    );

    render(<SessionBanner />);

    expect(screen.getByText('Opponent left the room')).toBeTruthy();
    expect(screen.getByText('Waiting for them to return: 00:12')).toBeTruthy();
  });
});