import { getDb } from '@/lib/db';
import { requireUser, toErrorResponse, httpError } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * POST: add or update a member.
 *   { userId, role } — only captain/owner/admin can set role
 *   { joinSelf: true } — current user joins as 'player'
 *
 * DELETE: ?userId=… — remove a member (captain/owner/admin, or self)
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: teamId } = await ctx.params;
    const team = await getDb().getTeam(teamId);
    if (!team) throw httpError(404, 'Team not found');
    const body = (await req.json().catch(() => null)) as { userId?: string; role?: 'captain' | 'player'; joinSelf?: boolean } | null;
    if (!body) throw httpError(400, 'Invalid body');

    if (body.joinSelf) {
      if (user.isGuest) throw httpError(403, 'Guests cannot join teams. Sign in first.');
      const mem = await getDb().addTeamMember(teamId, user.id, 'player');
      return Response.json({ membership: mem });
    }

    if (!body.userId) throw httpError(400, 'userId required');
    const requesterMem = await getDb().getTeamMembership(teamId, user.id);
    const isOwner = team.ownerId === user.id;
    const isAdmin = user.role === 'admin';
    const isCaptain = requesterMem?.role === 'captain';
    if (!isOwner && !isAdmin && !isCaptain) throw httpError(403, 'Only captains can manage members');
    const role = body.role === 'captain' ? 'captain' : 'player';
    const mem = await getDb().addTeamMember(teamId, body.userId, role);
    return Response.json({ membership: mem });
  } catch (err) { return toErrorResponse(err); }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: teamId } = await ctx.params;
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('userId') ?? user.id;
    const team = await getDb().getTeam(teamId);
    if (!team) throw httpError(404, 'Team not found');
    if (targetUserId !== user.id) {
      const requesterMem = await getDb().getTeamMembership(teamId, user.id);
      const isOwner = team.ownerId === user.id;
      const isAdmin = user.role === 'admin';
      const isCaptain = requesterMem?.role === 'captain';
      if (!isOwner && !isAdmin && !isCaptain) throw httpError(403, 'Only captains can remove others');
    }
    if (targetUserId === team.ownerId) throw httpError(400, 'Cannot remove the owner');
    await getDb().removeTeamMember(teamId, targetUserId);
    return Response.json({ ok: true });
  } catch (err) { return toErrorResponse(err); }
}
