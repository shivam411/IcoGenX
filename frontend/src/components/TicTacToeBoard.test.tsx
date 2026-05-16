import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import styles from '../app/games/tic-tac-toe/game.module.css';
import TicTacToeBoard from './TicTacToeBoard';

const mockPush = vi.fn();
const mockUseGame = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/context/GameContext', () => ({
  useGame: () => mockUseGame(),
}));

vi.mock('@/components/CoinToss', () => ({
  default: ({ onToss, onComplete }: { onToss: () => void; onComplete: () => void }) => (
    <div data-testid="coin-toss">
      <button onClick={onToss}>Mock Toss</button>
      <button onClick={onComplete}>Mock Continue</button>
    </div>
  ),
}));

function buildGameState(overrides: Record<string, unknown> = {}) {
  return {
    gameState: {
      board: Array(9).fill(null),
      currentPlayer: 0,
      fadingCells: [],
      xPlayer: 0,
      coinTossed: true,
      jokerCell: undefined,
      variant: 'classic',
    },
    playerNumber: 0,
    playerName: 'Alex',
    opponentName: 'Blair',
    sendAction: vi.fn(),
    gameOver: false,
    winner: null,
    scores: [2, 1],
    requestPlayAgain: vi.fn(),
    playAgainRequested: false,
    opponentPlayAgainRequested: false,
    leaveRoom: vi.fn(),
    ...overrides,
  };
}

describe('TicTacToeBoard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders nothing when the game state is unavailable', () => {
    mockUseGame.mockReturnValue(buildGameState({ gameState: null }));

    const { container } = render(<TicTacToeBoard variantTitle="Rules" rules={<div>Rules</div>} />);

    expect(container.firstChild).toBeNull();
  });

  it('shows the coin toss and dispatches the toss action', () => {
    const sendAction = vi.fn();
    mockUseGame.mockReturnValue(
      buildGameState({
        sendAction,
        gameState: {
          board: Array(9).fill(null),
          currentPlayer: 0,
          fadingCells: [],
          xPlayer: 0,
          coinTossed: false,
          jokerCell: undefined,
          variant: 'classic',
        },
      }),
    );

    render(<TicTacToeBoard variantTitle="Rules" rules={<div>Rules</div>} />);

    fireEvent.click(screen.getByText('Mock Toss'));
    expect(sendAction).toHaveBeenCalledWith({ game: 'TicTacToeTossCoin' });
  });

  it('allows the current player to place a mark after the toss screen completes', () => {
    const sendAction = vi.fn();
    mockUseGame.mockReturnValue(buildGameState({ sendAction }));

    const { container } = render(<TicTacToeBoard variantTitle="Rules" rules={<div>Rules</div>} />);

    fireEvent.click(screen.getByText('Mock Continue'));

    const cells = container.querySelectorAll(`.${styles.cell}`);
    fireEvent.click(cells[0]);

    expect(sendAction).toHaveBeenCalledWith({ game: 'TicTacToe', cell: 0 });
  });

  it('warns when the player clicks out of turn', () => {
    const sendAction = vi.fn();
    mockUseGame.mockReturnValue(
      buildGameState({
        sendAction,
        gameState: {
          board: Array(9).fill(null),
          currentPlayer: 1,
          fadingCells: [],
          xPlayer: 0,
          coinTossed: true,
          jokerCell: undefined,
          variant: 'classic',
        },
      }),
    );

    const { container } = render(<TicTacToeBoard variantTitle="Rules" rules={<div>Rules</div>} />);

    fireEvent.click(screen.getByText('Mock Continue'));

    const cells = container.querySelectorAll(`.${styles.cell}`);
    fireEvent.click(cells[0]);

    expect(screen.getByText('Not your turn.')).toBeTruthy();
    expect(sendAction).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
  });

  it('drops a gravity move into the clicked column', () => {
    const sendAction = vi.fn();
    mockUseGame.mockReturnValue(
      buildGameState({
        sendAction,
        gameState: {
          board: Array(9).fill(null),
          currentPlayer: 0,
          fadingCells: [],
          xPlayer: 0,
          coinTossed: true,
          jokerCell: undefined,
          variant: 'gravity',
        },
      }),
    );

    const { container } = render(<TicTacToeBoard variantTitle="Rules" rules={<div>Rules</div>} />);
    fireEvent.click(screen.getByText('Mock Continue'));

    const cells = container.querySelectorAll(`.${styles.cell}`);
    fireEvent.click(cells[5]);

    expect(sendAction).toHaveBeenCalledWith({ game: 'TicTacToe', cell: 2 });
  });

  it('allows blind mode to call an occupied square', () => {
    const sendAction = vi.fn();
    mockUseGame.mockReturnValue(
      buildGameState({
        sendAction,
        gameState: {
          board: [0, null, null, null, null, null, null, null, null],
          currentPlayer: 0,
          fadingCells: [],
          xPlayer: 0,
          coinTossed: true,
          jokerCell: undefined,
          variant: 'blind',
        },
      }),
    );

    const { container } = render(<TicTacToeBoard variantTitle="Rules" rules={<div>Rules</div>} />);

    const cells = container.querySelectorAll(`.${styles.cell}`);
    fireEvent.click(cells[0]);

    expect(sendAction).toHaveBeenCalledWith({ game: 'TicTacToe', cell: 0 });
  });

  it('places a selected gobblet piece', () => {
    const sendAction = vi.fn();
    mockUseGame.mockReturnValue(
      buildGameState({
        sendAction,
        gameState: {
          board: Array(9).fill(null),
          currentPlayer: 0,
          fadingCells: [],
          xPlayer: 0,
          coinTossed: true,
          jokerCell: undefined,
          variant: 'gobblet',
          gobbletStacks: Array.from({ length: 9 }, () => []),
          remainingPieces: [[2, 2, 2], [2, 2, 2]],
        },
      }),
    );

    const { container } = render(<TicTacToeBoard variantTitle="Rules" rules={<div>Rules</div>} />);
    fireEvent.click(screen.getByText('Mock Continue'));
    fireEvent.click(screen.getByTitle('M piece'));

    const cells = container.querySelectorAll(`.${styles.cell}`);
    fireEvent.click(cells[0]);

    expect(sendAction).toHaveBeenCalledWith({ game: 'TicTacToeGobble', from: null, to: 0, size: 2 });
  });

  it('submits a bidding round bid without the toss screen', () => {
    const sendAction = vi.fn();
    mockUseGame.mockReturnValue(
      buildGameState({
        sendAction,
        gameState: {
          board: Array(9).fill(null),
          currentPlayer: 0,
          fadingCells: [],
          xPlayer: 0,
          coinTossed: true,
          jokerCell: undefined,
          variant: 'bidding',
          biddingChips: [100, 100],
          pendingBids: [false, false],
          biddingPhase: 'bidding',
          biddingWinner: null,
        },
      }),
    );

    render(<TicTacToeBoard variantTitle="Rules" rules={<div>Rules</div>} />);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '12' } });
    fireEvent.click(screen.getByText('Bid'));

    expect(screen.queryByTestId('coin-toss')).toBeNull();
    expect(sendAction).toHaveBeenCalledWith({ game: 'TicTacToeBid', bid: 12 });
  });

  it('shows the game over overlay and handles replay plus exit', () => {
    const requestPlayAgain = vi.fn();
    const leaveRoom = vi.fn();
    mockUseGame.mockReturnValue(
      buildGameState({
        requestPlayAgain,
        leaveRoom,
        gameOver: true,
        winner: 'Player 1',
      }),
    );

    render(<TicTacToeBoard variantTitle="Rules" rules={<div>Rules</div>} />);

    expect(screen.getByText('You Win!')).toBeTruthy();

    fireEvent.click(screen.getByText('🔄 Play Again'));
    expect(requestPlayAgain).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Change Game'));
    expect(leaveRoom).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('renders a winning line when the game ends', () => {
    mockUseGame.mockReturnValue(
      buildGameState({
        gameOver: true,
        winner: 'Player 1',
        gameState: {
          board: [0, null, null, null, 0, null, null, null, 0],
          currentPlayer: 0,
          fadingCells: [],
          xPlayer: 0,
          coinTossed: true,
          jokerCell: 4,
          variant: 'joker',
          winningLine: [0, 4, 8],
        },
      }),
    );

    const { container } = render(<TicTacToeBoard variantTitle="Rules" rules={<div>Rules</div>} />);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(container.querySelector(`.${styles.winLine}`)).toBeTruthy();
    expect(container.querySelectorAll(`.${styles.cellWinning}`)).toHaveLength(3);
  });
});