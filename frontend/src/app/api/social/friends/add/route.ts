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
    const { friendCode } = body;
    if (!friendCode || typeof friendCode !== 'string' || friendCode.trim().length !== 6) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    const rec = await getDb().sendFriendRequest(userId, friendCode.trim().toUpperCase());
    return NextResponse.json({ friendship: rec });
  } catch (err: any) {
    const status = err.message === 'Friend code not found' ? 404 : 400;
    return NextResponse.json({ error: err.message || 'unknown_error' }, { status });
  }
}
