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
    if (!friendshipId || !['accept', 'decline', 'cancel', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const db = getDb();
    const friends = await db.listFriends(userId);
    const friendship = friends.find((f) => f.friendshipId === friendshipId);
    if (!friendship) {
      return NextResponse.json({ error: 'friendship_not_found' }, { status: 404 });
    }

    if (action === 'accept') {
      if (friendship.status !== 'pending' || friendship.isInitiator) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      await db.acceptFriendRequest(friendshipId);
    } else if (action === 'decline') {
      if (friendship.status !== 'pending' || friendship.isInitiator) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      await db.declineFriendRequest(friendshipId);
    } else if (action === 'cancel') {
      if (friendship.status !== 'pending' || !friendship.isInitiator) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      await db.declineFriendRequest(friendshipId);
    } else if (action === 'remove') {
      if (friendship.status !== 'accepted') {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      await db.declineFriendRequest(friendshipId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'unknown_error' }, { status: 500 });
  }
}
