import { getDb } from '@/lib/db';
import { requireUser, toErrorResponse, httpError } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * Match announcements per team. Team members "publish" a room they're playing
 * in so teammates can spectate (jump in via the link).
 *
 * GET  /api/teams/[id]/matches            -> { matches: ActiveMatchRecord[] }
 * POST /api/teams/[id]/matches            -> announce (member-only)
 *       body: { gameId, roomCode, variant? }
 * DELETE /api/teams/[id]/matches?id=xxx   -> end a match (host or captain)
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: teamId } = await ctx.params;
    const mem = await getDb().getTeamMembership(teamId, user.id);
    if (!mem && user.role !== 'admin') throw httpError(403, 'Members only');
    const matches = await getDb().listActiveMatches(teamId);
    return Response.json({ matches });
  } catch (err) { return toErrorResponse(err); }
}

const ROOM_RE = /^[A-Z0-9]{4,8}$/;
const GAME_RE = /^[a-z0-9-]{1,64}$/;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: teamId } = await ctx.params;
    const mem = await getDb().getTeamMembership(teamId, user.id);
    if (!mem) throw httpError(403, 'Members only');
    const body = (await req.json().catch(() => null)) as { gameId?: string; roomCode?: string; variant?: string } | null;
    const gameId = body?.gameId?.trim();
    const roomCode = body?.roomCode?.trim().toUpperCase();
    const variant = body?.variant?.trim() || undefined;
    if (!gameId || !GAME_RE.test(gameId)) throw httpError(400, 'Invalid gameId');
    if (!roomCode || !ROOM_RE.test(roomCode)) throw httpError(400, 'Invalid roomCode');
    const match = await getDb().announceMatch({
      teamId, gameId, roomCode, variant,
      hostUserId: user.id, hostName: user.name,
    });
    return Response.json({ match }, { status: 201 });
  } catch (err) { return toErrorResponse(err); }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: teamId } = await ctx.params;
    const url = new URL(req.url);
    const matchId = url.searchParams.get('id');
    if (!matchId) throw httpError(400, 'id required');
    const matches = await getDb().listActiveMatches(teamId);
    const match = matches.find(m => m.id === matchId);
    if (!match) return Response.json({ ok: true });
    const mem = await getDb().getTeamMembership(teamId, user.id);
    const isCaptain = mem?.role === 'captain';
    if (match.hostUserId !== user.id && !isCaptain && user.role !== 'admin') {
      throw httpError(403, 'Only the host or a captain can end this match');
    }
    await getDb().endMatch(matchId);
    return Response.json({ ok: true });
  } catch (err) { return toErrorResponse(err); }
}
