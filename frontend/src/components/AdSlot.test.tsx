import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import AdSlot from './AdSlot';

afterEach(() => {
  cleanup();
});

describe('AdSlot', () => {
  it('renders a placeholder when AdSense client id is not configured', () => {
    render(<AdSlot slotId="x" shape="leaderboard" label="My slot" />);
    expect(screen.getByLabelText('Advertisement')).toBeTruthy();
    expect(screen.getByText('My slot')).toBeTruthy();
  });

  it('exposes role-correct semantics for screen readers', () => {
    const { container } = render(<AdSlot slotId="x" />);
    const aside = container.querySelector('aside');
    expect(aside?.getAttribute('aria-label')).toBe('Advertisement');
  });
});
