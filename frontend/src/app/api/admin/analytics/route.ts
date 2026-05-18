import { getDb } from '@/lib/db';
import { requireRole, toErrorResponse } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireRole(['admin', 'tournament_manager']);
    const snapshot = await getDb().getAnalytics();
    return Response.json({ snapshot });
  } catch (err) { return toErrorResponse(err); }
}
