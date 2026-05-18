import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Batch-fetch social aggregates for the home page.
 * Usage: GET /api/games/social?ids=tic-tac-toe,higher-lower
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = (url.searchParams.get('ids') ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => /^[a-z0-9-]{1,64}$/.test(s));
  if (ids.length === 0) return NextResponse.json({ social: {} });
  const social = await getDb().getGameSocialMany(ids);
  return NextResponse.json({ social });
}
