import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, type TeamMemberRole } from '@/lib/db';

export const runtime = 'nodejs';

function hideJoinCodeForPlayers<T extends { role: TeamMemberRole; joinCode?: string }>(team: T): T | Omit<T, 'joinCode'> {
  if (team.role === 'captain' || team.role === 'manager') return team;
  const { joinCode: _joinCode, ...rest } = team;
  void _joinCode;
  return rest;
}

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string; image?: string; isGuest?: boolean } | undefined;
  if (!user?.id) return NextResponse.json({ user: null, interactions: [], teams: [] });

  const db = getDb();
  const [profile, interactions, ownTeams] = await Promise.all([
    db.getUser(user.id),
    db.getInteractionsForUser(user.id),
    db.listTeamsForUser(user.id),
  ]);
  const role = profile?.role ?? 'player';
  const teams = role === 'admin' || role === 'tournament_manager'
    ? (await db.listTeams()).map((team) => ({
        ...team,
        role: ownTeams.find((ownTeam) => ownTeam.id === team.id)?.role ?? 'manager',
        globalManager: !ownTeams.some((ownTeam) => ownTeam.id === team.id),
      }))
    : ownTeams.map(hideJoinCodeForPlayers);

  return NextResponse.json({
    user: profile ?? { id: user.id, name: user.name ?? 'Player', image: user.image, isGuest: !!user.isGuest, role: 'player' },
    interactions,
    teams,
  });
}
