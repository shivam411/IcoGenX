import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const list = await getDb().listFriends(userId);
    return NextResponse.json({ friends: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'unknown_error' }, { status: 500 });
  }
}
