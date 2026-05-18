import { getDb, type TournamentParticipant, type TournamentRecord } from '@/lib/db';
import { requireUser, toErrorResponse, httpError, type SessionUser } from '@/lib/session';
import { generateKnockoutBracket } from '@/lib/tournament';

export const runtime = 'nodejs';

async function loadOrThrow(id: string): Promise<TournamentRecord> {
  const t = await getDb().getTournament(id);
  if (!t) throw httpError(404, 'Tournament not found');
  return t;
}

async function assertOrganizer(user: SessionUser, t: TournamentRecord) {
  if (user.role === 'admin' || user.role === 'tournament_manager') return;
  if (t.organizerId === user.id) return;
  if (t.teamId) {
    const mem = await getDb().getTeamMembership(t.teamId, user.id);
    if (mem?.role === 'captain') return;
  }
  throw httpError(403, 'Only the organizer / captain / manager can edit this tournament');
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const t = await loadOrThrow(id);
    return Response.json({ tournament: t });
  } catch (err) { return toErrorResponse(err); }
}

/**
 * PATCH supports:
 *   { name?, status?, gameId? }            update metadata
 *   { participants: [...], regenerate?:true } set seeds + (optionally) rebuild bracket
 *   { matches: [...] }                     set raw matches (manual edits / reshuffle)
 *   { matchId, patch }                     update one match + auto-advance winners
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const t = await loadOrThrow(id);
    await assertOrganizer(user, t);
    const body = (await req.json().catch(() => null)) as {
      name?: string;
      status?: 'draft' | 'live' | 'completed';
      gameId?: string;
      participants?: TournamentParticipant[];
      regenerate?: boolean;
      matches?: TournamentRecord['matches'];
      matchId?: string;
      patch?: Partial<TournamentRecord['matches'][number]>;
    } | null;
    if (!body) throw httpError(400, 'Invalid body');

    let updated: TournamentRecord | null = t;
    if (body.name !== undefined || body.status !== undefined || body.gameId !== undefined) {
      updated = await getDb().updateTournament(id, {
        name: body.name, status: body.status, gameId: body.gameId,
      });
    }
    if (body.participants) {
      const cleaned = body.participants
        .filter(p => p.name?.trim())
        .map((p, i) => ({
          id: p.id || `p_${i}_${Math.random().toString(36).slice(2, 8)}`,
          name: p.name.trim().slice(0, 64),
          userId: p.userId,
          teamId: p.teamId,
          seed: Number.isFinite(p.seed) ? p.seed : i + 1,
        }));
      updated = await getDb().setParticipants(id, cleaned);
      if (body.regenerate && updated) {
        const bracket = generateKnockoutBracket(cleaned);
        updated = await getDb().setMatches(id, bracket);
      }
    }
    if (body.matches) {
      updated = await getDb().setMatches(id, body.matches);
    }
    if (body.matchId && body.patch) {
      // Auto-advance: update the match, then re-run advance over the full set.
      updated = await getDb().updateMatch(id, body.matchId, body.patch);
      if (updated) {
        const { advanceWinners } = await import('@/lib/tournament');
        const advanced = advanceWinners(updated.matches);
        updated = await getDb().setMatches(id, advanced);
      }
    }
    return Response.json({ tournament: updated });
  } catch (err) { return toErrorResponse(err); }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const t = await loadOrThrow(id);
    await assertOrganizer(user, t);
    await getDb().deleteTournament(id);
    return Response.json({ ok: true });
  } catch (err) { return toErrorResponse(err); }
}
