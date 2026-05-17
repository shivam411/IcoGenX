import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Lobby from './Lobby';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockUsePathname = vi.fn();
const mockUseGame = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => mockUsePathname(),
}));

vi.mock('@/context/GameContext', () => ({
  useGame: () => mockUseGame(),
  getGamePath: (gameType: string | null, variant: string | null) => {
    if (gameType === 'tic_tac_toe') {
      return `/games/tic-tac-toe/${variant || 'classic'}`;
    }
    if (gameType === 'higher_lower') {
      return variant === 'code_breaker_number'
        ? '/games/code-guess/number'
        : variant && variant !== 'classic'
          ? `/games/higher-lower/${variant}`
          : '/games/higher-lower';
    }
    return '/';
  },
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
    gameType: 'tic_tac_toe',
    variant: 'classic',
    switchVariant: vi.fn(),
    ...overrides,
  };
}

describe('Lobby', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockReset();
    mockReplace.mockReset();
    mockUsePathname.mockReset();
    mockUsePathname.mockReturnValue('/games/tic-tac-toe/classic');
    window.localStorage.clear();
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
    expect(joinRoom).toHaveBeenCalledWith('AB12CD', 'Jamie', 'tic_tac_toe', 'classic');
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

  it('switches variants without leaving the room', () => {
    const switchVariant = vi.fn();
    mockUseGame.mockReturnValue(
      buildGameState({
        roomCode: 'AB12CD',
        switchVariant,
      }),
    );

    render(
      <Lobby gameType="tic_tac_toe" variant="classic" gameName="Test Game" gameIcon="🎮" accentColor="#123456">
        <div>Child</div>
      </Lobby>,
    );

    fireEvent.change(screen.getByLabelText('Room variant'), { target: { value: 'joker' } });
    expect(switchVariant).toHaveBeenCalledWith('joker');
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

  it('lets players hide and show the emoji dock', () => {
    mockUseGame.mockReturnValue(
      buildGameState({
        gameStarted: true,
      }),
    );

    render(
      <Lobby gameType="tic_tac_toe" gameName="Test Game" gameIcon="🎮" accentColor="#123456">
        <div>In Game</div>
      </Lobby>,
    );

    fireEvent.click(screen.getByLabelText('Hide reactions'));
    expect(screen.getByLabelText('Show reactions')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Show reactions'));
    expect(screen.getByLabelText('Hide reactions')).toBeTruthy();
  });

  it('follows the switched variant route while staying in the room', () => {
    mockUsePathname.mockReturnValue('/games/tic-tac-toe/classic');
    mockUseGame.mockReturnValue(
      buildGameState({
        roomCode: 'AB12CD',
        gameStarted: true,
        variant: 'joker',
      }),
    );

    render(
      <Lobby gameType="tic_tac_toe" variant="classic" gameName="Test Game" gameIcon="🎮" accentColor="#123456">
        <div>In Game</div>
      </Lobby>,
    );

    expect(mockReplace).toHaveBeenCalledWith('/games/tic-tac-toe/joker');
  });

  it('keeps the lobby form available when opponent disconnect state is handled globally', () => {
    mockUseGame.mockReturnValue(buildGameState({ opponentDisconnected: true }));

    render(
      <Lobby gameType="tic_tac_toe" gameName="Test Game" gameIcon="🎮" accentColor="#123456">
        <div>Child</div>
      </Lobby>,
    );

    expect(screen.getByText('Test Game')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your name')).toBeTruthy();
  });
});