import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GameSocialBar from './GameSocialBar';
import { __resetSocialCacheForTests } from '@/lib/useGameSocial';

const fetchMock = vi.fn();

beforeEach(() => {
  __resetSocialCacheForTests();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('GameSocialBar', () => {
  it('renders counts from the API and exposes accessible like/favorite buttons', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      social: { gameId: 'g', likes: 12, plays: 100, favorites: 3 },
      interaction: { liked: true, favorited: false, plays: 1 },
    }));

    render(<GameSocialBar gameId="g" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/games/g/social', expect.any(Object)));
    await waitFor(() => expect(screen.getByLabelText(/Unlike \(12 likes\)/)).toBeTruthy());
    expect(screen.getByLabelText(/Add to favorites \(3 favorites\)/)).toBeTruthy();
    expect(screen.getByLabelText(/100 plays/)).toBeTruthy();
  });

  it('posts an unlike action when an already-liked button is clicked', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        social: { gameId: 'g', likes: 5, plays: 0, favorites: 0 },
        interaction: { liked: true, favorited: false, plays: 0 },
      }))
      .mockResolvedValueOnce(jsonResponse({
        social: { gameId: 'g', likes: 4, plays: 0, favorites: 0 },
        interaction: { liked: false, favorited: false, plays: 0 },
      }));

    render(<GameSocialBar gameId="g" />);

    const btn = await screen.findByLabelText(/Unlike \(5 likes\)/);
    fireEvent.click(btn);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/games/g/social', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'unlike' }),
    })));
    await waitFor(() => expect(screen.getByLabelText(/Like \(4 likes\)/)).toBeTruthy());
  });

  it('formats large counts with k suffix', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      social: { gameId: 'g', likes: 0, plays: 12_300, favorites: 0 },
      interaction: { liked: false, favorited: false, plays: 0 },
    }));

    render(<GameSocialBar gameId="g" />);
    await waitFor(() => expect(screen.getByLabelText(/12300 plays/)).toBeTruthy());
    expect(screen.getByText('12k')).toBeTruthy();
  });
});
