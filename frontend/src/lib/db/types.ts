/**
 * Storage adapter interface.
 *
 * Two implementations:
 *  - memory: in-process Maps, lost on restart. Default for dev.
 *  - mongo:  persisted to MongoDB. Used when DB_MODE=mongo.
 *
 * Keep this surface minimal — every method here is a real method we ship.
 */

export interface UserRecord {
  /** Stable user id. For OAuth users this is the provider sub; for guests it is a generated nanoid-style id. */
  id: string;
  name: string;
  email?: string;
  image?: string;
  isGuest: boolean;
  createdAt: number;
}

export interface GameSocialRecord {
  gameId: string;
  likes: number;
  plays: number;
  /** Number of users who have favorited this game. */
  favorites: number;
}

export interface UserGameInteraction {
  userId: string;
  gameId: string;
  liked: boolean;
  favorited: boolean;
  /** Per-user play count for this game. Useful for "your recently played". */
  plays: number;
  updatedAt: number;
}

export interface DbAdapter {
  readonly mode: 'memory' | 'mongo';

  // ---- Users
  upsertUser(user: Omit<UserRecord, 'createdAt'> & { createdAt?: number }): Promise<UserRecord>;
  getUser(id: string): Promise<UserRecord | null>;

  // ---- Game social aggregates
  getGameSocial(gameId: string): Promise<GameSocialRecord>;
  getGameSocialMany(gameIds: string[]): Promise<Record<string, GameSocialRecord>>;

  // ---- Per-user interactions
  getInteraction(userId: string, gameId: string): Promise<UserGameInteraction | null>;
  getInteractionsForUser(userId: string): Promise<UserGameInteraction[]>;

  setLike(userId: string, gameId: string, liked: boolean): Promise<{ social: GameSocialRecord; interaction: UserGameInteraction }>;
  setFavorite(userId: string, gameId: string, favorited: boolean): Promise<{ social: GameSocialRecord; interaction: UserGameInteraction }>;
  incrementPlay(userId: string | null, gameId: string): Promise<{ social: GameSocialRecord; interaction: UserGameInteraction | null }>;
}
