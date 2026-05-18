import type {
  DbAdapter,
  GameSocialRecord,
  UserGameInteraction,
  UserRecord,
} from './types';

/**
 * In-process storage. Resets on server restart. Fine for dev + LAN play.
 * NOT safe across multiple Next.js workers — if you scale horizontally,
 * switch DB_MODE to mongo.
 */
export class MemoryDb implements DbAdapter {
  readonly mode = 'memory' as const;
  private users = new Map<string, UserRecord>();
  private social = new Map<string, GameSocialRecord>();
  private interactions = new Map<string, UserGameInteraction>(); // key = userId:gameId

  private keyFor(userId: string, gameId: string) {
    return `${userId}:${gameId}`;
  }

  private ensureSocial(gameId: string): GameSocialRecord {
    let rec = this.social.get(gameId);
    if (!rec) {
      rec = { gameId, likes: 0, plays: 0, favorites: 0 };
      this.social.set(gameId, rec);
    }
    return rec;
  }

  private ensureInteraction(userId: string, gameId: string): UserGameInteraction {
    const key = this.keyFor(userId, gameId);
    let rec = this.interactions.get(key);
    if (!rec) {
      rec = { userId, gameId, liked: false, favorited: false, plays: 0, updatedAt: Date.now() };
      this.interactions.set(key, rec);
    }
    return rec;
  }

  async upsertUser(input: Omit<UserRecord, 'createdAt'> & { createdAt?: number }): Promise<UserRecord> {
    const existing = this.users.get(input.id);
    const rec: UserRecord = {
      id: input.id,
      name: input.name,
      email: input.email,
      image: input.image,
      isGuest: input.isGuest,
      createdAt: existing?.createdAt ?? input.createdAt ?? Date.now(),
    };
    this.users.set(rec.id, rec);
    return rec;
  }

  async getUser(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async getGameSocial(gameId: string): Promise<GameSocialRecord> {
    return { ...this.ensureSocial(gameId) };
  }

  async getGameSocialMany(gameIds: string[]): Promise<Record<string, GameSocialRecord>> {
    const out: Record<string, GameSocialRecord> = {};
    for (const id of gameIds) out[id] = { ...this.ensureSocial(id) };
    return out;
  }

  async getInteraction(userId: string, gameId: string): Promise<UserGameInteraction | null> {
    const rec = this.interactions.get(this.keyFor(userId, gameId));
    return rec ? { ...rec } : null;
  }

  async getInteractionsForUser(userId: string): Promise<UserGameInteraction[]> {
    return Array.from(this.interactions.values()).filter(i => i.userId === userId).map(i => ({ ...i }));
  }

  async setLike(userId: string, gameId: string, liked: boolean) {
    const interaction = this.ensureInteraction(userId, gameId);
    if (interaction.liked === liked) {
      return { social: { ...this.ensureSocial(gameId) }, interaction: { ...interaction } };
    }
    const social = this.ensureSocial(gameId);
    social.likes = Math.max(0, social.likes + (liked ? 1 : -1));
    interaction.liked = liked;
    interaction.updatedAt = Date.now();
    return { social: { ...social }, interaction: { ...interaction } };
  }

  async setFavorite(userId: string, gameId: string, favorited: boolean) {
    const interaction = this.ensureInteraction(userId, gameId);
    if (interaction.favorited === favorited) {
      return { social: { ...this.ensureSocial(gameId) }, interaction: { ...interaction } };
    }
    const social = this.ensureSocial(gameId);
    social.favorites = Math.max(0, social.favorites + (favorited ? 1 : -1));
    interaction.favorited = favorited;
    interaction.updatedAt = Date.now();
    return { social: { ...social }, interaction: { ...interaction } };
  }

  async incrementPlay(userId: string | null, gameId: string) {
    const social = this.ensureSocial(gameId);
    social.plays += 1;
    if (!userId) return { social: { ...social }, interaction: null };
    const interaction = this.ensureInteraction(userId, gameId);
    interaction.plays += 1;
    interaction.updatedAt = Date.now();
    return { social: { ...social }, interaction: { ...interaction } };
  }
}
