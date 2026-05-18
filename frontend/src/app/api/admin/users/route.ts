import { getDb } from '@/lib/db';
import { requireRole, toErrorResponse, httpError } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireRole('admin');
    const users = await getDb().listUsers(500);
    return Response.json({ users });
  } catch (err) { return toErrorResponse(err); }
}

export async function PATCH(req: Request) {
  try {
    await requireRole('admin');
    const body = (await req.json().catch(() => null)) as { userId?: string; role?: 'admin' | 'tournament_manager' | 'player' } | null;
    if (!body?.userId || !body?.role) throw httpError(400, 'userId and role required');
    if (!['admin', 'tournament_manager', 'player'].includes(body.role)) throw httpError(400, 'invalid role');
    const u = await getDb().setUserRole(body.userId, body.role);
    if (!u) throw httpError(404, 'user not found');
    return Response.json({ user: u });
  } catch (err) { return toErrorResponse(err); }
}
