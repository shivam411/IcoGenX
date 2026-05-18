import { getDb } from '@/lib/db';
import { requireUser, toErrorResponse, httpError } from '@/lib/session';

export const runtime = 'nodejs';

/** GET ?mine=1 -> tournaments organized by me; otherwise list all (read-only). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get('mine') === '1') {
      const user = await requireUser();
      const list = await getDb().listTournaments({ organizerId: user.id });
      return Response.json({ tournaments: list });
    }
    const list = await getDb().listTournaments({ limit: 100 });
    return Response.json({ tournaments: list });
  } catch (err) { return toErrorResponse(err); }
}

/**
 * POST creates a tournament. Allowed roles: admin, tournament_manager, or
 * a team captain (when creating a tournament tied to their team).
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.isGuest) throw httpError(403, 'Guests cannot create tournaments. Sign in first.');
    const body = (await req.json().catch(() => null)) as {
      name?: string;
      gameId?: string;
      teamId?: string;
    } | null;
    const name = body?.name?.trim();
    const gameId = body?.gameId?.trim();
    const teamId = body?.teamId?.trim() || undefined;
    if (!name || name.length < 2) throw httpError(400, 'Name required');
    if (!gameId) throw httpError(400, 'gameId required');

    let allowed = user.role === 'admin' || user.role === 'tournament_manager';
    if (!allowed && teamId) {
      const mem = await getDb().getTeamMembership(teamId, user.id);
      if (mem?.role === 'captain') allowed = true;
    }
    if (!allowed) throw httpError(403, 'You need admin / tournament_manager / team captain role');

    const t = await getDb().createTournament({
      name, gameId, teamId,
      format: 'knockout',
      organizerId: user.id,
    });
    return Response.json({ tournament: t }, { status: 201 });
  } catch (err) { return toErrorResponse(err); }
}
