import { act } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GameDemo from './GameDemo';

describe('GameDemo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders nothing when no demo steps are provided', () => {
    const { container } = render(<GameDemo steps={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('cycles through demo steps on the provided interval', () => {
    render(
      <GameDemo
        steps={[
          { board: ['X', null, null, null, 'J', null, null, null, null], joker: 4, message: 'Opening move' },
          { board: ['X', 'O', null, null, 'J', null, null, null, null], fading: 1, joker: 4, message: 'Counter move' },
        ]}
        intervalMs={500}
      />,
    );

    expect(screen.getByText('Opening move')).toBeTruthy();
    expect(screen.getByText('🃏')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText('Counter move')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText('Opening move')).toBeTruthy();
  });
});