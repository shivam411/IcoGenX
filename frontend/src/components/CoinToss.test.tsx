import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CoinToss from './CoinToss';

function buildProps(overrides: Partial<React.ComponentProps<typeof CoinToss>> = {}) {
  return {
    isCreator: true,
    onToss: vi.fn(),
    result: null,
    playerNumber: 0,
    playerName: 'Alex',
    opponentName: 'Blair',
    onComplete: vi.fn(),
    ...overrides,
  };
}

describe('CoinToss', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('lets the room creator start the toss', () => {
    const props = buildProps();
    render(<CoinToss {...props} />);

    fireEvent.click(screen.getByText('🪙 Toss Coin'));
    expect(props.onToss).toHaveBeenCalledTimes(1);
  });

  it('shows the waiting state for non-creators before the toss', () => {
    render(<CoinToss {...buildProps({ isCreator: false })} />);

    expect(screen.getByText('⏳ Waiting for room creator to toss the coin...')).toBeTruthy();
  });

  it('transitions through the result state and auto-completes', () => {
    const props = buildProps({ result: 0 });
    render(<CoinToss {...props} />);

    expect(screen.getByText('Flipping...')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(screen.getByText('Result!')).toBeTruthy();
    expect(screen.getByText((_, element) => element?.textContent === 'Alex won the toss!')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2_500);
    });

    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });

  it('lets players continue manually once the animation has started', () => {
    const props = buildProps({ result: 1 });
    render(<CoinToss {...props} />);

    fireEvent.click(screen.getByText('Continue to Game ⏭️'));

    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });
});