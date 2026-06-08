import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    listFriends: vi.fn(),
    acceptFriendRequest: vi.fn(),
    declineFriendRequest: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}));

vi.mock('@/lib/db', () => ({
  getDb: () => mocks.db,
}));

function request(body: unknown) {
  return new Request('http://localhost/api/social/friends/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function json(response: Response) {
  return response.json() as Promise<{ error?: string; success?: boolean }>;
}

function friend(overrides: Record<string, unknown> = {}) {
  return {
    friendshipId: 'friendship_1',
    friend: { id: 'user_2', name: 'Blair', isGuest: false, createdAt: 1 },
    status: 'pending',
    isInitiator: false,
    ...overrides,
  };
}

describe('/api/social/friends/respond', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requires an authenticated user', async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(request({ friendshipId: 'friendship_1', action: 'accept' }));

    expect(response.status).toBe(401);
    await expect(json(response)).resolves.toEqual({ error: 'unauthorized' });
  });

  it('lets the recipient accept a pending request', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.db.listFriends.mockResolvedValue([friend()]);

    const response = await POST(request({ friendshipId: 'friendship_1', action: 'accept' }));

    expect(response.status).toBe(200);
    expect(mocks.db.acceptFriendRequest).toHaveBeenCalledWith('friendship_1');
    await expect(json(response)).resolves.toEqual({ success: true });
  });

  it('denies accept from the request initiator', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.db.listFriends.mockResolvedValue([friend({ isInitiator: true })]);

    const response = await POST(request({ friendshipId: 'friendship_1', action: 'accept' }));

    expect(response.status).toBe(403);
    expect(mocks.db.acceptFriendRequest).not.toHaveBeenCalled();
    await expect(json(response)).resolves.toEqual({ error: 'forbidden' });
  });

  it('lets the initiator cancel an outgoing pending request', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.db.listFriends.mockResolvedValue([friend({ isInitiator: true })]);

    const response = await POST(request({ friendshipId: 'friendship_1', action: 'cancel' }));

    expect(response.status).toBe(200);
    expect(mocks.db.declineFriendRequest).toHaveBeenCalledWith('friendship_1');
  });

  it('lets either accepted friend remove the friendship', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.db.listFriends.mockResolvedValue([friend({ status: 'accepted', isInitiator: true })]);

    const response = await POST(request({ friendshipId: 'friendship_1', action: 'remove' }));

    expect(response.status).toBe(200);
    expect(mocks.db.declineFriendRequest).toHaveBeenCalledWith('friendship_1');
  });

  it('returns stable error codes for unexpected failures', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.auth.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.db.listFriends.mockRejectedValue(new Error('database password leaked here'));

    const response = await POST(request({ friendshipId: 'friendship_1', action: 'remove' }));

    expect(response.status).toBe(500);
    expect(consoleError).toHaveBeenCalledWith('[social/friends/respond] failed');
    await expect(json(response)).resolves.toEqual({ error: 'unknown_error' });
    consoleError.mockRestore();
  });
});