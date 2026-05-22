import { getDb, type TeamMemberRole } from '@/lib/db';
import { requireUser, toErrorResponse, httpError, type SessionUser } from '@/lib/session';

export const runtime = 'nodejs';

const TEAM_ROLES: TeamMemberRole[] = ['captain', 'manager', 'player'];

function parseTeamRole(role: unknown): TeamMemberRole {
  return TEAM_ROLES.includes(role as TeamMemberRole) ? role as TeamMemberRole : 'player';
}

async function getAccess(teamId: string, user: SessionUser, ownerId: string) {
  const requesterMem = await getDb().getTeamMembership(teamId, user.id);
  const isGlobalManager = user.role === 'admin' || user.role === 'tournament_manager';
  const isOwner = ownerId === user.id;
  const isCaptain = requesterMem?.role === 'captain';
  const isTeamManager = requesterMem?.role === 'manager';
  return {
    requesterMem,
    isTeamManager,
    canManageMembers: isGlobalManager || isOwner || isCaptain || isTeamManager,
    canAssignLeadership: isGlobalManager || isOwner || isCaptain,
  };
}

async function hasAnotherCaptain(teamId: string, userId: string): Promise<boolean> {
  const members = await getDb().listTeamMembers(teamId);
  return members.some((member) => member.userId !== userId && member.role === 'captain');
}

/**
 * POST: add or update a member.
 *   { userId, role } - leadership can assign captain/manager/player.
 *   { joinSelf: true } - registered current user joins as player.
 *
 * DELETE: ?userId=... - remove a member (leadership, or self).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: teamId } = await ctx.params;
    const db = getDb();
    const team = await db.getTeam(teamId);
    if (!team) throw httpError(404, 'Team not found');
    const body = (await req.json().catch(() => null)) as { userId?: string; role?: TeamMemberRole; joinSelf?: boolean } | null;
    if (!body) throw httpError(400, 'Invalid body');

    if (body.joinSelf) {
      if (user.isGuest) throw httpError(403, 'Guests join teams with their team code from Play as guest.');
      const mem = await db.addTeamMember(teamId, user.id, 'player');
      return Response.json({ membership: mem });
    }

    if (!body.userId) throw httpError(400, 'userId required');
    const access = await getAccess(teamId, user, team.ownerId);
    if (!access.canManageMembers) throw httpError(403, 'Only team leadership can manage members');

    const role = parseTeamRole(body.role);
    const isLeadershipRole = role === 'captain' || role === 'manager';
    if (isLeadershipRole && !access.canAssignLeadership) {
      throw httpError(403, 'Only captains or tournament managers can assign leadership roles');
    }

    const existing = await db.getTeamMembership(teamId, body.userId);
    if (access.isTeamManager && existing && existing.role !== 'player') {
      throw httpError(403, 'Team managers can only manage players');
    }
    if (body.userId === team.ownerId && role !== 'captain') {
      throw httpError(400, 'Team owner must remain a captain');
    }
    if (existing?.role === 'captain' && role !== 'captain' && !(await hasAnotherCaptain(teamId, body.userId))) {
      throw httpError(400, 'Every team must keep at least one captain');
    }

    const mem = await db.addTeamMember(teamId, body.userId, role);
    return Response.json({ membership: mem });
  } catch (err) { return toErrorResponse(err); }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: teamId } = await ctx.params;
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('userId') ?? user.id;
    const db = getDb();
    const team = await db.getTeam(teamId);
    if (!team) throw httpError(404, 'Team not found');
    if (targetUserId === team.ownerId) throw httpError(400, 'Cannot remove the owner');

    const targetMem = await db.getTeamMembership(teamId, targetUserId);
    if (!targetMem) return Response.json({ ok: true });

    if (targetUserId !== user.id) {
      const access = await getAccess(teamId, user, team.ownerId);
      if (!access.canManageMembers) throw httpError(403, 'Only team leadership can remove others');
      if (targetMem.role !== 'player' && !access.canAssignLeadership) {
        throw httpError(403, 'Only captains or tournament managers can remove leadership roles');
      }
    }
    if (targetMem.role === 'captain' && !(await hasAnotherCaptain(teamId, targetUserId))) {
      throw httpError(400, 'Every team must keep at least one captain');
    }

    await db.removeTeamMember(teamId, targetUserId);
    return Response.json({ ok: true });
  } catch (err) { return toErrorResponse(err); }
}