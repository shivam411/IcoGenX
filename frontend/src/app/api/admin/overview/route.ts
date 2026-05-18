import { getDb } from '@/lib/db';
import { requireRole, toErrorResponse } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireRole(['admin', 'tournament_manager']);
    const [teams, tournaments, activeMatches] = await Promise.all([
      getDb().listTeams(200),
      getDb().listTournaments({ limit: 200 }),
      getDb().listAllActiveMatches(200),
    ]);
    return Response.json({ teams, tournaments, activeMatches });
  } catch (err) { return toErrorResponse(err); }
}
