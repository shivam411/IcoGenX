import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Lobby from './Lobby';

const mockPush = vi.fn();
const mockUseGame = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/context/GameContext', () => ({
  useGame: () => mockUseGame(),
}));

function buildGameState(overrides: Record<string, unknown> = {}) {
  return {
    connected: true,
    roomCode: null,
    gameStarted: false,
    playerNumber: 0,
    opponentDisconnected: false,
    error: null,
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    playerName: 'Alex',
    opponentName: 'Blair',
    recentEmojis: [],
    sendEmoji: vi.fn(),
    ...overrides,
  };
}

describe('Lobby', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders the connecting state while the websocket is offline', () => {
    mockUseGame.mockReturnValue(buildGameState({ connected: false }));

    render(
      <Lobby gameType="tic_tac_toe" gameName="Test Game" gameIcon="🎮" accentColor="#123456">
        <div>Child</div>
      </Lobby>,
    );

    expect(screen.getByText('Connecting to server...')).toBeTruthy();
  });

  it('validates names and then triggers create and join actions', () => {
    const createRoom = vi.fn();
    const joinRoom = vi.fn();
    mockUseGame.mockReturnValue(buildGameState({ createRoom, joinRoom }));

    render(
      <Lobby gameType="tic_tac_toe" variant="classic" gameName="Test Game" gameIcon="🎮" accentColor="#123456">
        <div>Child</div>
      </Lobby>,
    );

    fireEvent.click(screen.getByText('🎮 Create Room'));
    expect(screen.getByText('⚠️ Please enter your name first')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Jamie' } });
    fireEvent.click(screen.getByText('🎮 Create Room'));
    expect(createRoom).toHaveBeenCalledWith('tic_tac_toe', 'classic', 'Jamie');

    fireEvent.change(screen.getByPlaceholderText('Enter room code'), { target: { value: 'ab12cd' } });
    fireEvent.click(screen.getByText('Join'));
    expect(joinRoom).toHaveBeenCalledWith('AB12CD', 'Jamie');
  });

  it('shows the waiting room code and copies it to the clipboard', () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    mockUseGame.mockReturnValue(buildGameState({ roomCode: 'AB12CD' }));

    render(
      <Lobby gameType="tic_tac_toe" gameName="Test Game" gameIcon="🎮" accentColor="#123456">
        <div>Child</div>
      </Lobby>,
    );

    fireEvent.click(screen.getByText('📋 Copy'));
    expect(writeText).toHaveBeenCalledWith('AB12CD');
  });

  it('renders in-game reactions and sends emoji clicks', () => {
    const sendEmoji = vi.fn();
    mockUseGame.mockReturnValue(
      buildGameState({
        gameStarted: true,
        sendEmoji,
        recentEmojis: [{ id: 1, emoji: '🎉', fromSelf: false }],
      }),
    );

    render(
      <Lobby gameType="tic_tac_toe" gameName="Test Game" gameIcon="🎮" accentColor="#123456">
        <div>In Game</div>
      </Lobby>,
    );

    expect(screen.getByText('In Game')).toBeTruthy();
    expect(screen.getByText('Blair')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Send 🎉 reaction'));
    expect(sendEmoji).toHaveBeenCalledWith('🎉');
  });

  it('counts down the disconnect timer and swaps to the final state', () => {
    mockUseGame.mockReturnValue(buildGameState({ opponentDisconnected: true }));

    render(
      <Lobby gameType="tic_tac_toe" gameName="Test Game" gameIcon="🎮" accentColor="#123456">
        <div>Child</div>
      </Lobby>,
    );

    expect(screen.getByText('00:20')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(screen.getByText('Opponent failed to reconnect. The game has ended.')).toBeTruthy();
    expect(screen.getByText('Back to Lobby')).toBeTruthy();
  });
});