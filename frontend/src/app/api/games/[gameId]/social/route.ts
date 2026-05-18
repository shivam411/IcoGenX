import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

const ALLOWED_ACTIONS = new Set(['like', 'unlike', 'favorite', 'unfavorite', 'play']);

function gameIdFromParams(gameId: string): string | null {
  // Defensive: only allow [a-z0-9-]{1,64}
  if (!/^[a-z0-9-]{1,64}$/.test(gameId)) return null;
  return gameId;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ gameId: string }> },
) {
  const { gameId: raw } = await ctx.params;
  const gameId = gameIdFromParams(raw);
  if (!gameId) return NextResponse.json({ error: 'bad_game_id' }, { status: 400 });

  const db = getDb();
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const social = await db.getGameSocial(gameId);
  const interaction = userId ? await db.getInteraction(userId, gameId) : null;

  return NextResponse.json({
    social,
    interaction: interaction
      ? { liked: interaction.liked, favorited: interaction.favorited, plays: interaction.plays }
      : { liked: false, favorited: false, plays: 0 },
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ gameId: string }> },
) {
  const { gameId: raw } = await ctx.params;
  const gameId = gameIdFromParams(raw);
  if (!gameId) return NextResponse.json({ error: 'bad_game_id' }, { status: 400 });

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }
  const action = body.action;
  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: 'bad_action' }, { status: 400 });
  }

  const db = getDb();
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  // 'play' is allowed for anonymous visitors (aggregate counter only).
  if (action !== 'play' && !userId) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  let result;
  switch (action) {
    case 'like':
      result = await db.setLike(userId!, gameId, true);
      break;
    case 'unlike':
      result = await db.setLike(userId!, gameId, false);
      break;
    case 'favorite':
      result = await db.setFavorite(userId!, gameId, true);
      break;
    case 'unfavorite':
      result = await db.setFavorite(userId!, gameId, false);
      break;
    case 'play':
      result = await db.incrementPlay(userId, gameId);
      break;
    default:
      return NextResponse.json({ error: 'bad_action' }, { status: 400 });
  }

  return NextResponse.json({
    social: result.social,
    interaction: result.interaction
      ? { liked: result.interaction.liked, favorited: result.interaction.favorited, plays: result.interaction.plays }
      : { liked: false, favorited: false, plays: 0 },
  });
}
