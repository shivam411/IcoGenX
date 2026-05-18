import { MongoClient, type Db, type Collection } from 'mongodb';
import type {
  DbAdapter,
  GameSocialRecord,
  UserGameInteraction,
  UserRecord,
} from './types';

type UserDoc = UserRecord;
type SocialDoc = GameSocialRecord & { _id?: string };
type InteractionDoc = UserGameInteraction & { _id: string };

/**
 * MongoDB-backed adapter. Lazy: the driver is only constructed when the first
 * request actually arrives, so cold Next.js routes don't pay any cost.
 *
 * Collections:
 *   users           — UserRecord
 *   game_social     — GameSocialRecord, _id = gameId
 *   user_game       — UserGameInteraction, _id = `${userId}:${gameId}`
 */
export class MongoDb implements DbAdapter {
  readonly mode = 'mongo' as const;
  private clientPromise: Promise<MongoClient> | null = null;

  constructor(private readonly uri: string, private readonly dbName: string) {}

  private async db(): Promise<Db> {
    if (!this.clientPromise) {
      const client = new MongoClient(this.uri, { maxPoolSize: 10 });
      this.clientPromise = client.connect();
    }
    const client = await this.clientPromise;
    return client.db(this.dbName);
  }

  private async users(): Promise<Collection<UserDoc>> {
    return (await this.db()).collection<UserDoc>('users');
  }
  private async social(): Promise<Collection<SocialDoc>> {
    return (await this.db()).collection<SocialDoc>('game_social');
  }
  private async interactions(): Promise<Collection<InteractionDoc>> {
    return (await this.db()).collection<InteractionDoc>('user_game');
  }

  private key(userId: string, gameId: string) {
    return `${userId}:${gameId}`;
  }

  async upsertUser(input: Omit<UserRecord, 'createdAt'> & { createdAt?: number }): Promise<UserRecord> {
    const users = await this.users();
    const now = Date.now();
    const setOnInsert = { createdAt: input.createdAt ?? now };
    const set: Partial<UserRecord> = {
      id: input.id,
      name: input.name,
      email: input.email,
      image: input.image,
      isGuest: input.isGuest,
    };
    await users.updateOne(
      { id: input.id },
      { $set: set, $setOnInsert: setOnInsert },
      { upsert: true },
    );
    const doc = await users.findOne({ id: input.id });
    return doc!;
  }

  async getUser(id: string): Promise<UserRecord | null> {
    return (await this.users()).findOne({ id });
  }

  async getGameSocial(gameId: string): Promise<GameSocialRecord> {
    const doc = await (await this.social()).findOne({ gameId });
    if (!doc) return { gameId, likes: 0, plays: 0, favorites: 0 };
    return { gameId: doc.gameId, likes: doc.likes ?? 0, plays: doc.plays ?? 0, favorites: doc.favorites ?? 0 };
  }

  async getGameSocialMany(gameIds: string[]): Promise<Record<string, GameSocialRecord>> {
    const cursor = (await this.social()).find({ gameId: { $in: gameIds } });
    const out: Record<string, GameSocialRecord> = {};
    for (const id of gameIds) out[id] = { gameId: id, likes: 0, plays: 0, favorites: 0 };
    for await (const doc of cursor) {
      out[doc.gameId] = { gameId: doc.gameId, likes: doc.likes ?? 0, plays: doc.plays ?? 0, favorites: doc.favorites ?? 0 };
    }
    return out;
  }

  async getInteraction(userId: string, gameId: string): Promise<UserGameInteraction | null> {
    const doc = await (await this.interactions()).findOne({ userId, gameId });
    if (!doc) return null;
    return { userId: doc.userId, gameId: doc.gameId, liked: !!doc.liked, favorited: !!doc.favorited, plays: doc.plays ?? 0, updatedAt: doc.updatedAt ?? 0 };
  }

  async getInteractionsForUser(userId: string): Promise<UserGameInteraction[]> {
    const docs = await (await this.interactions()).find({ userId }).toArray();
    return docs.map(d => ({ userId: d.userId, gameId: d.gameId, liked: !!d.liked, favorited: !!d.favorited, plays: d.plays ?? 0, updatedAt: d.updatedAt ?? 0 }));
  }

  async setLike(userId: string, gameId: string, liked: boolean) {
    const existing = await this.getInteraction(userId, gameId);
    if (existing?.liked === liked) {
      return { social: await this.getGameSocial(gameId), interaction: existing };
    }
    const delta = liked ? 1 : -1;
    const now = Date.now();
    await (await this.interactions()).updateOne(
      { _id: this.key(userId, gameId) },
      { $set: { userId, gameId, liked, updatedAt: now }, $setOnInsert: { favorited: false, plays: 0 } },
      { upsert: true },
    );
    await (await this.social()).updateOne(
      { gameId },
      { $inc: { likes: delta }, $setOnInsert: { plays: 0, favorites: 0 } },
      { upsert: true },
    );
    return { social: await this.getGameSocial(gameId), interaction: (await this.getInteraction(userId, gameId))! };
  }

  async setFavorite(userId: string, gameId: string, favorited: boolean) {
    const existing = await this.getInteraction(userId, gameId);
    if (existing?.favorited === favorited) {
      return { social: await this.getGameSocial(gameId), interaction: existing };
    }
    const delta = favorited ? 1 : -1;
    const now = Date.now();
    await (await this.interactions()).updateOne(
      { _id: this.key(userId, gameId) },
      { $set: { userId, gameId, favorited, updatedAt: now }, $setOnInsert: { liked: false, plays: 0 } },
      { upsert: true },
    );
    await (await this.social()).updateOne(
      { gameId },
      { $inc: { favorites: delta }, $setOnInsert: { plays: 0, likes: 0 } },
      { upsert: true },
    );
    return { social: await this.getGameSocial(gameId), interaction: (await this.getInteraction(userId, gameId))! };
  }

  async incrementPlay(userId: string | null, gameId: string) {
    await (await this.social()).updateOne(
      { gameId },
      { $inc: { plays: 1 }, $setOnInsert: { likes: 0, favorites: 0 } },
      { upsert: true },
    );
    const social = await this.getGameSocial(gameId);
    if (!userId) return { social, interaction: null };
    await (await this.interactions()).updateOne(
      { _id: this.key(userId, gameId) },
      { $set: { userId, gameId, updatedAt: Date.now() }, $inc: { plays: 1 }, $setOnInsert: { liked: false, favorited: false } },
      { upsert: true },
    );
    return { social, interaction: (await this.getInteraction(userId, gameId))! };
  }
}
