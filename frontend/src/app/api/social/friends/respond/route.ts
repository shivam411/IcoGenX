import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { friendshipId, action } = body;
    if (!friendshipId || (action !== 'accept' && action !== 'decline')) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const db = getDb();
    const friends = await db.listFriends(userId);
    const hasFriendship = friends.some((f) => f.friendshipId === friendshipId);
    if (!hasFriendship) {
      return NextResponse.json({ error: 'friendship_not_found' }, { status: 404 });
    }

    if (action === 'accept') {
      await db.acceptFriendRequest(friendshipId);
    } else {
      await db.declineFriendRequest(friendshipId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'unknown_error' }, { status: 500 });
  }
}
