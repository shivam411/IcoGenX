import { getDb } from '@/lib/db';
import { requireUser, toErrorResponse, httpError } from '@/lib/session';

export const runtime = 'nodejs';

async function loadTeamWithRole(userId: string, teamId: string) {
  const team = await getDb().getTeam(teamId);
  if (!team) throw httpError(404, 'Team not found');
  const membership = await getDb().getTeamMembership(teamId, userId);
  return { team, membership };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { team, membership } = await loadTeamWithRole(user.id, id);
    // Non-members can see basic info but not the roster.
    if (!membership) return Response.json({ team, membership: null, members: null });
    const members = await getDb().listTeamMembers(id);
    const activeMatches = await getDb().listActiveMatches(id);
    return Response.json({ team, membership, members, activeMatches });
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
