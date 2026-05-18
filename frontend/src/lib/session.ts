import { auth } from '@/lib/auth';
import { getDb, type UserRecord, type UserRole } from '@/lib/db';

export interface SessionUser {
  id: string;
  name: string;
  isGuest: boolean;
  role: UserRole;
  email?: string;
  image?: string;
}

/**
 * Resolve the current session into a {@link SessionUser} or null. Hydrates
 * `role` from the DB so RBAC checks are always against the canonical store
 * (the JWT just carries identity).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const su = session?.user as { id?: string; name?: string; image?: string; email?: string; isGuest?: boolean } | undefined;
  if (!su?.id) return null;
  const record = await getDb().getUser(su.id);
  return {
    id: su.id,
    name: su.name ?? record?.name ?? 'Player',
    isGuest: !!su.isGuest,
    role: record?.role ?? 'player',
    email: su.email ?? record?.email,
    image: su.image ?? record?.image,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) {
    throw httpError(401, 'Authentication required');
  }
  return u;
}

export async function requireRole(roles: UserRole | UserRole[]): Promise<SessionUser> {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const u = await requireUser();
  if (!allowed.includes(u.role)) {
    throw httpError(403, `Requires role: ${allowed.join(' or ')}`);
  }
  return u;
}

/**
 * Lightweight thrown error converted to a JSON Response by routes via
 * {@link toErrorResponse}. Lets handlers stay flat / linear.
 */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function httpError(status: number, message: string): HttpError {
  return new HttpError(status, message);
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error('[api] unhandled', err);
  return Response.json({ error: 'Internal error' }, { status: 500 });
}

/** Promotes the FIRST admin if no admin exists yet — convenience bootstrap. */
export async function ensureBootstrapAdmin(user: UserRecord): Promise<void> {
  if (user.role === 'admin' || user.isGuest) return;
  const allUsers = await getDb().listUsers(500);
  const hasAdmin = allUsers.some(u => u.role === 'admin');
  if (!hasAdmin) {
    await getDb().setUserRole(user.id, 'admin');
  }
}
