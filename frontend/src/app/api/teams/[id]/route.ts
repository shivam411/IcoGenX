import { getDb, type TeamRecord } from '@/lib/db';
import { requireUser, toErrorResponse, httpError } from '@/lib/session';

export const runtime = 'nodejs';

async function loadTeamWithRole(userId: string, teamId: string) {
  const team = await getDb().getTeam(teamId);
  if (!team) throw httpError(404, 'Team not found');
  const membership = await getDb().getTeamMembership(teamId, userId);
  return { team, membership };
}

function serializeTeam(team: TeamRecord, showJoinCode: boolean) {
  if (showJoinCode) return team;
  const { joinCode: _joinCode, ...publicTeam } = team;
  void _joinCode;
  return publicTeam;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { team, membership } = await loadTeamWithRole(user.id, id);
    const isGlobalManager = user.role === 'admin' || user.role === 'tournament_manager';
    const isOwner = team.ownerId === user.id;
    const canManage = isGlobalManager || isOwner || membership?.role === 'captain' || membership?.role === 'manager';
    const canAssignLeadership = isGlobalManager || isOwner || membership?.role === 'captain';
    const canAnnounce = membership?.role === 'captain' || membership?.role === 'player';
    // Non-members can see basic info but not the roster.
    if (!membership && !isGlobalManager) {
      return Response.json({
        team: serializeTeam(team, false),
        membership: null,
        members: null,
        activeMatches: null,
        canManage: false,
        canAssignLeadership: false,
        canAnnounce: false,
      });
    }
    const members = await getDb().listTeamMembers(id);
    const activeMatches = await getDb().listActiveMatches(id);
    return Response.json({
      team: serializeTeam(team, canManage),
      membership,
      members,
      activeMatches,
      canManage,
      canAssignLeadership,
      canAnnounce,
    });
  } catch (err) { return toErrorResponse(err); }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const team = await getDb().getTeam(id);
    if (!team) throw httpError(404, 'Team not found');
    const membership = await getDb().getTeamMembership(id, user.id);
    const canManage = user.role === 'admin'
      || user.role === 'tournament_manager'
      || team.ownerId === user.id
      || membership?.role === 'captain'
      || membership?.role === 'manager';
    if (!canManage) throw httpError(403, 'Only team leadership can update this team');
    const body = (await req.json().catch(() => null)) as { rotateJoinCode?: boolean } | null;
    if (!body?.rotateJoinCode) throw httpError(400, 'rotateJoinCode required');
    const updated = await getDb().rotateTeamJoinCode(id);
    if (!updated) throw httpError(404, 'Team not found');
    return Response.json({ team: updated });
  } catch (err) { return toErrorResponse(err); }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const team = await getDb().getTeam(id);
    if (!team) throw httpError(404, 'Team not found');
    if (team.ownerId !== user.id && user.role !== 'admin') throw httpError(403, 'Only the owner or admin can delete this team');
    // Remove memberships + matches first, then team. Memory db can't bulk; do best-effort cleanups.
    const members = await getDb().listTeamMembers(id);
    for (const m of members) await getDb().removeTeamMember(id, m.userId);
    const matches = await getDb().listActiveMatches(id);
    for (const m of matches) await getDb().endMatch(m.id);
    // Re-use a wider hammer: we don't expose deleteTeam yet, so flag the team
    // as removed by clearing memberships + marking matches ended. Listing
    // routes filter out empty/no-membership teams from user lists anyway.
    // Future enhancement: add `deleteTeam` to adapters.
    return Response.json({ ok: true });
  } catch (err) { return toErrorResponse(err); }
}
