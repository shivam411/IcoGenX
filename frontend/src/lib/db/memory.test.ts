import { describe, expect, it } from 'vitest';
import { MemoryDb } from './memory';
import { getVariantMetricId } from '../socialMetrics';

describe('MemoryDb', () => {
  it('starts with zero counters for any game', async () => {
    const db = new MemoryDb();
    const s = await db.getGameSocial('tic-tac-toe');
    expect(s).toEqual({ gameId: 'tic-tac-toe', likes: 0, plays: 0, favorites: 0 });
  });

  it('toggles like idempotently and updates aggregate', async () => {
    const db = new MemoryDb();
    await db.upsertUser({ id: 'u1', name: 'A', isGuest: true });
    const r1 = await db.setLike('u1', 'g', true);
    expect(r1.social.likes).toBe(1);
    expect(r1.interaction.liked).toBe(true);

    // Second like is a no-op.
    const r2 = await db.setLike('u1', 'g', true);
    expect(r2.social.likes).toBe(1);

    // Unlike decrements.
    const r3 = await db.setLike('u1', 'g', false);
    expect(r3.social.likes).toBe(0);
    expect(r3.interaction.liked).toBe(false);
  });

  it('separate users contribute independent likes', async () => {
    const db = new MemoryDb();
    await db.setLike('u1', 'g', true);
    await db.setLike('u2', 'g', true);
    const s = await db.getGameSocial('g');
    expect(s.likes).toBe(2);
  });

  it('favorites track per-user and per-game aggregate', async () => {
    const db = new MemoryDb();
    await db.setFavorite('u1', 'g', true);
    const i = await db.getInteraction('u1', 'g');
    expect(i?.favorited).toBe(true);
    const s = await db.getGameSocial('g');
    expect(s.favorites).toBe(1);
  });

  it('incrementPlay updates aggregate even without a user', async () => {
    const db = new MemoryDb();
    const r = await db.incrementPlay(null, 'g');
    expect(r.social.plays).toBe(1);
    expect(r.interaction).toBeNull();
  });

  it('incrementPlay records per-user plays when user given', async () => {
    const db = new MemoryDb();
    await db.incrementPlay('u1', 'g');
    await db.incrementPlay('u1', 'g');
    const i = await db.getInteraction('u1', 'g');
    expect(i?.plays).toBe(2);
    const s = await db.getGameSocial('g');
    expect(s.plays).toBe(2);
  });

  it('keeps variant metrics out of top-level analytics', async () => {
    const db = new MemoryDb();
    await db.incrementPlay(null, 'g');
    await db.incrementPlay(null, getVariantMetricId('g', 'classic'));

    const analytics = await db.getAnalytics();

    expect(analytics.totalPlays).toBe(1);
    expect(analytics.topGames).toEqual([{ gameId: 'g', plays: 1, likes: 0, favorites: 0 }]);
  });

  it('getInteractionsForUser returns only this user records', async () => {
    const db = new MemoryDb();
    await db.setLike('u1', 'a', true);
    await db.setLike('u2', 'b', true);
    const list = await db.getInteractionsForUser('u1');
    expect(list).toHaveLength(1);
    expect(list[0].gameId).toBe('a');
  });

  it('upsertUser preserves createdAt across upserts', async () => {
    const db = new MemoryDb();
    const a = await db.upsertUser({ id: 'u1', name: 'A', isGuest: true });
    const b = await db.upsertUser({ id: 'u1', name: 'A2', isGuest: false });
    expect(b.createdAt).toBe(a.createdAt);
    expect(b.name).toBe('A2');
    expect(b.isGuest).toBe(false);
  });

  it('creates and rotates team join codes', async () => {
    const db = new MemoryDb();
    const team = await db.createTeam({ name: 'Blue Team', slug: 'blue-team', ownerId: 'u1' });

    expect(team.joinCode).toMatch(/^[A-Z0-9]{6}$/);
    await expect(db.getTeamByJoinCode(team.joinCode.toLowerCase())).resolves.toMatchObject({ id: team.id });

    const rotated = await db.rotateTeamJoinCode(team.id);
    expect(rotated?.joinCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(rotated?.joinCode).not.toBe(team.joinCode);
    await expect(db.getTeamByJoinCode(team.joinCode)).resolves.toBeNull();
    await expect(db.getTeamByJoinCode(rotated?.joinCode ?? '')).resolves.toMatchObject({ id: team.id });
  });

  it('assigns friend codes only to non-guest users', async () => {
    const db = new MemoryDb();
    const guest = await db.upsertUser({ id: 'u1', name: 'Guest User', isGuest: true });
    expect(guest.friendCode).toBeUndefined();

    const member = await db.upsertUser({ id: 'u2', name: 'Regular User', isGuest: false });
    expect(member.friendCode).toMatch(/^[A-Z0-9]{6}$/);

    const memberUpdate = await db.upsertUser({ id: 'u2', name: 'Regular User Updated', isGuest: false });
    expect(memberUpdate.friendCode).toBe(member.friendCode);
  });

  it('manages friend request flows correctly', async () => {
    const db = new MemoryDb();
    const u1 = await db.upsertUser({ id: 'u1', name: 'User One', isGuest: false });
    const u2 = await db.upsertUser({ id: 'u2', name: 'User Two', isGuest: false });

    await expect(db.sendFriendRequest('u1', u1.friendCode!)).rejects.toThrow('Cannot add yourself as a friend');
    await expect(db.sendFriendRequest('u1', 'INVALID')).rejects.toThrow('Friend code not found');

    const req = await db.sendFriendRequest('u1', u2.friendCode!);
    expect(req.status).toBe('pending');
    expect(req.userId).toBe('u1');
    expect(req.friendId).toBe('u2');

    const u1Friends = await db.listFriends('u1');
    expect(u1Friends).toHaveLength(1);
    expect(u1Friends[0].friend.id).toBe('u2');
    expect(u1Friends[0].status).toBe('pending');
    expect(u1Friends[0].isInitiator).toBe(true);

    const u2Friends = await db.listFriends('u2');
    expect(u2Friends).toHaveLength(1);
    expect(u2Friends[0].friend.id).toBe('u1');
    expect(u2Friends[0].status).toBe('pending');
    expect(u2Friends[0].isInitiator).toBe(false);

    await db.acceptFriendRequest(req.id);
    const u1FriendsAccepted = await db.listFriends('u1');
    expect(u1FriendsAccepted[0].status).toBe('accepted');

    await db.declineFriendRequest(req.id);
    const u1FriendsEmpty = await db.listFriends('u1');
    expect(u1FriendsEmpty).toHaveLength(0);
  });
});
