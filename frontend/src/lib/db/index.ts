import { MemoryDb } from './memory';
import { MongoDb } from './mongo';
import type { DbAdapter } from './types';

/**
 * Select a storage adapter based on env.
 *
 *   DB_MODE=memory  (default)  → MemoryDb, fully in-process
 *   DB_MODE=mongo              → MongoDb, requires MONGODB_URI
 *
 * Cached on globalThis so it survives Next.js hot reload in dev.
 */
declare global {
  var __arena_db__: DbAdapter | undefined;
}

export function getDb(): DbAdapter {
  if (globalThis.__arena_db__) return globalThis.__arena_db__;

  const mode = (process.env.DB_MODE ?? 'memory').toLowerCase();
  let adapter: DbAdapter;
  if (mode === 'mongo') {
    const uri = process.env.MONGODB_URI ?? process.env.MONGO_DB_URI;
    if (!uri) {
      console.warn('[db] DB_MODE=mongo but MONGODB_URI is missing — falling back to memory.');
      adapter = new MemoryDb();
    } else {
      const dbName = process.env.MONGODB_DB ?? 'arena';
      adapter = new MongoDb(uri, dbName);
    }
  } else {
    adapter = new MemoryDb();
  }
  globalThis.__arena_db__ = adapter;
  return adapter;
}

export type { DbAdapter, UserRecord, GameSocialRecord, UserGameInteraction } from './types';
