import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import GameIcon, { isGameIconKey } from './GameIcon';
import { GAME_CATALOG } from '@/lib/gameMetadata';

describe('GameIcon', () => {
  it('has SVG icon keys for every catalog game and variant', () => {
    const iconKeys = GAME_CATALOG.flatMap((game) => [
      game.icon,
      ...(game.variants?.map((variant) => variant.icon) ?? []),
    ]);

    for (const icon of iconKeys) {
      expect(isGameIconKey(icon), icon).toBe(true);
    }
  });

  it('renders a scalable SVG icon', () => {
    const { container } = render(<GameIcon icon="drop-four-wrecking-ball" title="Wrecking Ball" />);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 96 96');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Wrecking Ball');
  });
});