import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getGameCatalogItem } from '@/lib/gameMetadata';
import { createInviteGrant } from '@/lib/socialToken';

export const runtime = 'nodejs';

function isAllowedGameVariant(gameType: string, variant: string | null) {
  if (gameType === 'higher_lower' && variant === 'code_breaker_number') return true;

  const game = getGameCatalogItem(gameType);
  if (!game || game.isComingSoon) return false;
  if (!variant || variant === 'classic') return true;
  return Boolean(game.variants?.some((item) => item.id === variant));
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as { id?: string; isGuest?: boolean } | undefined;
  if (!user?.id || user.isGuest) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const toUserId = typeof body.toUserId === 'string' ? body.toUserId : '';
    const gameType = typeof body.gameType === 'string' ? body.gameType : '';
    const variant = typeof body.variant === 'string' ? body.variant : null;

    if (!toUserId || !gameType || !isAllowedGameVariant(gameType, variant)) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const friends = await getDb().listFriends(user.id);
    const acceptedFriend = friends.some(
      (item) => item.status === 'accepted' && item.friend.id === toUserId,
    );
    if (!acceptedFriend) {
      return NextResponse.json({ error: 'not_friends' }, { status: 403 });
    }

    return NextResponse.json({
      grant: createInviteGrant({
        fromUserId: user.id,
        toUserId,
        gameType,
        variant,
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: 'unknown_error' }, { status: 500 });
  }
}