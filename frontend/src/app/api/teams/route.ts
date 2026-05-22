import { getDb, type TeamMemberRole } from '@/lib/db';
import { requireUser, toErrorResponse, httpError } from '@/lib/session';

export const runtime = 'nodejs';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

function hideJoinCodeForPlayers<T extends { role: TeamMemberRole; joinCode?: string }>(team: T): T | Omit<T, 'joinCode'> {
  if (team.role === 'captain' || team.role === 'manager') return team;
  const { joinCode: _joinCode, ...rest } = team;
  void _joinCode;
  return rest;
}

export async function GET() {
  try {
    const user = await requireUser();
    const db = getDb();
    const ownTeams = await db.listTeamsForUser(user.id);
    if (user.role === 'admin' || user.role === 'tournament_manager') {
      const ownRoles = new Map(ownTeams.map((team) => [team.id, team.role] as const));
      const teams = (await db.listTeams()).map((team) => ({
        ...team,
        role: ownRoles.get(team.id) ?? ('manager' satisfies TeamMemberRole),
        globalManager: !ownRoles.has(team.id),
      }));
      return Response.json({ teams, scope: 'all' });
    }
    return Response.json({ teams: ownTeams.map(hideJoinCodeForPlayers), scope: 'member' });
  } catch (err) { return toErrorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.isGuest) throw httpError(403, 'Guests cannot create teams. Sign in first.');
    const body = (await req.json().catch(() => null)) as { name?: string; slug?: string; description?: string } | null;
    const name = body?.name?.trim();
    const slug = body?.slug?.trim().toLowerCase();
    if (!name || name.length < 2 || name.length > 64) throw httpError(400, 'Name must be 2-64 chars');
    if (!slug || !SLUG_RE.test(slug)) throw httpError(400, 'Slug must be lowercase alphanumerics + dashes (2-32)');
    const description = body?.description?.trim().slice(0, 280);
    const existing = await getDb().getTeamBySlug(slug);
    if (existing) throw httpError(409, 'Slug is already taken');
    const team = await getDb().createTeam({ name, slug, description, ownerId: user.id });
    return Response.json({ team }, { status: 201 });
  } catch (err) { return toErrorResponse(err); }
}
